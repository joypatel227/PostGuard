from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from company.models import Guard
from salary.models import SalaryRecord
from .models import Wallet, WalletTransaction
from .serializers import WalletSerializer, WalletTransactionSerializer

User = get_user_model()


def user_agency(user):
    return user.agency


def _credit(wallet, amount, txn_type, note, related_user=None, related_guard=None, created_by=None):
    wallet.balance += amount
    wallet.save()
    WalletTransaction.objects.create(
        wallet=wallet, amount=amount, txn_type=txn_type,
        balance_after=wallet.balance, note=note,
        related_user=related_user, related_guard=related_guard, created_by=created_by
    )


def _debit(wallet, amount, txn_type, note, related_user=None, related_guard=None, created_by=None):
    wallet.balance -= amount
    wallet.save()
    WalletTransaction.objects.create(
        wallet=wallet, amount=amount, txn_type=txn_type,
        balance_after=wallet.balance, note=note,
        related_user=related_user, related_guard=related_guard, created_by=created_by
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


# ── Deposit (owner/admin adds cash to their own wallet) ───────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit(request):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    amount = float(request.data.get('amount', 0))
    note   = request.data.get('note', 'Cash deposit')
    if amount <= 0:
        return Response({'detail': 'Amount must be positive.'}, status=400)
    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    _credit(wallet, amount, 'deposit', note, created_by=request.user)
    return Response({'balance': str(wallet.balance)})


# ── Give Money to Guard (advance against salary) ──────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def give_to_guard(request):
    if request.user.role not in ['owner', 'admin', 'supervisor']:
        return Response({'detail': 'Not allowed.'}, status=403)
    ag = user_agency(request.user)
    guard_id = request.data.get('guard_id')
    amount   = float(request.data.get('amount', 0))
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

    _debit(wallet, amount, 'give_guard', note,
           related_guard=guard, created_by=request.user)

    # Record as advance in salary
    from django.utils import timezone
    today = timezone.now().date()
    record = SalaryRecord.compute_for_guard(guard, today.month, today.year)
    record.advance_given += amount
    record.amount_remaining = max(0, record.amount_earned - record.advance_given - record.amount_paid)
    record.save()

    return Response({'balance': str(wallet.balance), 'advance_given': str(record.advance_given)})


# ── Give Money to Supervisor (admin → supervisor) ─────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def give_to_supervisor(request):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    ag     = user_agency(request.user)
    sup_id = request.data.get('supervisor_id')
    amount = float(request.data.get('amount', 0))
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

    _debit(my_wallet, amount, 'give_supervisor', note,
           related_user=supervisor, created_by=request.user)
    _credit(sup_wallet, amount, 'transfer_in', f'From {request.user.name}: {note}',
            related_user=request.user, created_by=request.user)

    return Response({'my_balance': str(my_wallet.balance),
                     'supervisor_balance': str(sup_wallet.balance)})


# ── Transactions history ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_history(request):
    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    txns = wallet.transactions.all()[:50]
    return Response(WalletTransactionSerializer(txns, many=True).data)
