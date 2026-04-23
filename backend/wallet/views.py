from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from company.models import Guard
from salary.models import SalaryRecord
from billing.models import BankAccount, BankTransaction
from .models import Wallet, WalletTransaction
from .serializers import WalletSerializer, WalletTransactionSerializer

User = get_user_model()


def user_agency(user):
    return user.agency


def _credit(wallet, amount, txn_type, note,
            related_user=None, related_guard=None,
            source="cash", bank_account=None, created_by=None):
    wallet.balance += amount
    wallet.save()
    WalletTransaction.objects.create(
        wallet=wallet, amount=amount, txn_type=txn_type,
        balance_after=wallet.balance, note=note,
        related_user=related_user, related_guard=related_guard,
        source=source, bank_account=bank_account,
        created_by=created_by,
    )


def _debit(wallet, amount, txn_type, note,
           related_user=None, related_guard=None,
           source="cash", bank_account=None, created_by=None):
    wallet.balance -= amount
    wallet.save()
    WalletTransaction.objects.create(
        wallet=wallet, amount=amount, txn_type=txn_type,
        balance_after=wallet.balance, note=note,
        related_user=related_user, related_guard=related_guard,
        source=source, bank_account=bank_account,
        created_by=created_by,
    )


# ── My Wallet ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_wallet(request):
    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    return Response(WalletSerializer(wallet).data)


# ── All Wallets in Agency (owner/admin view) ──────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agency_wallets(request):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    ag = user_agency(request.user)
    wallets = Wallet.objects.filter(user__agency=ag)
    return Response(WalletSerializer(wallets, many=True).data)


# ── Deposit ───────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit(request):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)

    try:
        amount = Decimal(str(request.data.get('amount', 0)))
    except (TypeError, ValueError):
        amount = Decimal(0)
    note            = request.data.get('note', 'Deposit')
    source          = request.data.get('source', 'cash')   # "bank" or "cash"
    bank_account_id = request.data.get('bank_account_id')

    if amount <= 0:
        return Response({'detail': 'Amount must be positive.'}, status=400)

    bank_account = None
    if source == 'bank':
        if not bank_account_id:
            return Response({'detail': 'Bank account required for bank deposit.'}, status=400)
        ag = user_agency(request.user)
        try:
            bank_account = BankAccount.objects.get(pk=bank_account_id, agency=ag)
        except BankAccount.DoesNotExist:
            return Response({'detail': 'Bank account not found.'}, status=404)
        if bank_account.balance < amount:
            return Response({'detail': 'Insufficient bank balance.'}, status=400)
        # Debit bank account
        bank_account.balance -= amount
        bank_account.save()
        BankTransaction.objects.create(
            bank_account=bank_account,
            type='debit',
            amount=amount,
            running_balance=bank_account.balance,
            description=f'Transfer to Virtual Wallet: {note} (By {request.user.name})',
            category='wallet',
            date=timezone.now().date(),
            created_by=request.user,
        )

    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    _credit(wallet, amount, 'deposit', note,
            source=source, bank_account=bank_account, created_by=request.user)

    return Response({
        'balance': str(wallet.balance),
        'source': source,
        'bank_account_name': bank_account.account_name if bank_account else 'Cash',
    })


# ── Withdraw ──────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def withdraw(request):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)

    try:
        amount = Decimal(str(request.data.get('amount', 0)))
    except (TypeError, ValueError):
        amount = Decimal(0)
    note            = request.data.get('note', 'Withdrawal')
    source          = request.data.get('source', 'cash')   # "bank" or "cash"
    bank_account_id = request.data.get('bank_account_id')

    if amount <= 0:
        return Response({'detail': 'Amount must be positive.'}, status=400)

    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    if wallet.balance < amount:
        return Response({'detail': 'Insufficient wallet balance.'}, status=400)

    bank_account = None
    if source == 'bank':
        if not bank_account_id:
            return Response({'detail': 'Bank account required for bank withdrawal.'}, status=400)
        ag = user_agency(request.user)
        try:
            bank_account = BankAccount.objects.get(pk=bank_account_id, agency=ag)
        except BankAccount.DoesNotExist:
            return Response({'detail': 'Bank account not found.'}, status=404)
        # Credit bank account
        bank_account.balance += amount
        bank_account.save()
        BankTransaction.objects.create(
            bank_account=bank_account,
            type='credit',
            amount=amount,
            running_balance=bank_account.balance,
            description=f'Transfer from Virtual Wallet: {note} (By {request.user.name})',
            category='wallet',
            date=timezone.now().date(),
            created_by=request.user,
        )

    _debit(wallet, amount, 'withdraw', note,
           source=source, bank_account=bank_account, created_by=request.user)

    return Response({
        'balance': str(wallet.balance),
        'source': source,
        'bank_account_name': bank_account.account_name if bank_account else 'Cash',
    })


# ── Give Money to Guard (advance against salary) ──────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def give_to_guard(request):
    if request.user.role not in ['owner', 'admin', 'supervisor']:
        return Response({'detail': 'Not allowed.'}, status=403)
    ag       = user_agency(request.user)
    guard_id = request.data.get('guard_id')
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
    except (TypeError, ValueError):
        amount = Decimal(0)
    note     = request.data.get('note', 'Advance to guard')

    if amount <= 0:
        return Response({'detail': 'Amount must be positive.'}, status=400)
    try:
        guard = Guard.objects.get(pk=guard_id, agency=ag)
    except Guard.DoesNotExist:
        return Response({'detail': 'Guard not found.'}, status=404)

    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    if wallet.balance < amount:
        return Response({'detail': 'Insufficient wallet balance.'}, status=400)

    _debit(wallet, amount, 'give_guard',
           f'{note} → {guard.name}',
           related_guard=guard, source='cash', created_by=request.user)

    # Record as advance in this month's salary record
    today  = timezone.now().date()
    record = SalaryRecord.compute_for_guard(guard, today.month, today.year)
    record.advance_given   += amount
    record.amount_remaining = max(0, float(record.amount_earned) - float(record.advance_given) - float(record.amount_paid))
    record.save()

    return Response({
        'balance':      str(wallet.balance),
        'guard_name':   guard.name,
        'advance_given': str(record.advance_given),
    })


# ── Give Money to Supervisor (admin → supervisor) ─────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def give_to_supervisor(request):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Only owners and admins can transfer funds to supervisors.'}, status=403)
    ag     = user_agency(request.user)
    sup_id = request.data.get('supervisor_id')
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
    except (TypeError, ValueError):
        amount = Decimal(0)
    note   = request.data.get('note', 'Transfer to supervisor')

    if amount <= 0:
        return Response({'detail': 'Amount must be positive.'}, status=400)
    try:
        supervisor = User.objects.get(pk=sup_id, role='supervisor', agency=ag)
    except User.DoesNotExist:
        return Response({'detail': 'Supervisor not found.'}, status=404)

    my_wallet, _ = Wallet.objects.get_or_create(user=request.user)
    if my_wallet.balance < amount:
        return Response({'detail': 'Insufficient balance.'}, status=400)

    sup_wallet, _ = Wallet.objects.get_or_create(user=supervisor)

    _debit(my_wallet, amount, 'give_supervisor',
           f'{note} → {supervisor.name}',
           related_user=supervisor, source='cash', created_by=request.user)
    _credit(sup_wallet, amount, 'transfer_in',
            f'From {request.user.name}: {note}',
            related_user=request.user, source='cash', created_by=request.user)

    return Response({
        'my_balance':         str(my_wallet.balance),
        'supervisor_name':    supervisor.name,
        'supervisor_balance': str(sup_wallet.balance),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def give_to_admin(request):
    if request.user.role != 'owner':
        return Response({'detail': 'Only owners can transfer funds to admins.'}, status=403)
    ag       = user_agency(request.user)
    admin_id = request.data.get('admin_id')
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
    except (TypeError, ValueError):
        amount = Decimal(0)
    note     = request.data.get('note', 'Transfer to admin')

    if amount <= 0:
        return Response({'detail': 'Amount must be positive.'}, status=400)
    try:
        admin = User.objects.get(pk=admin_id, role='admin', agency=ag)
    except User.DoesNotExist:
        return Response({'detail': 'Admin not found.'}, status=404)

    my_wallet, _ = Wallet.objects.get_or_create(user=request.user)
    if my_wallet.balance < amount:
        return Response({'detail': 'Insufficient balance.'}, status=400)

    admin_wallet, _ = Wallet.objects.get_or_create(user=admin)

    _debit(my_wallet, amount, 'give_admin',
           f'{note} → {admin.name}',
           related_user=admin, source='cash', created_by=request.user)
    _credit(admin_wallet, amount, 'transfer_in',
            f'From {request.user.name}: {note}',
            related_user=request.user, source='cash', created_by=request.user)

    return Response({
        'my_balance':      str(my_wallet.balance),
        'admin_name':      admin.name,
        'admin_balance':   str(admin_wallet.balance),
    })


# ── Transaction History ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_history(request):
    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    txns = wallet.transactions.select_related(
        'related_user', 'related_guard', 'bank_account', 'created_by'
    ).all()[:100]
    return Response(WalletTransactionSerializer(txns, many=True).data)
