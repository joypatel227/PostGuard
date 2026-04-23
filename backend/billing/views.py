from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BankAccount, Bill, Payment, BankTransaction
from .serializers import BankAccountSerializer, BillSerializer, PaymentSerializer


def user_agency(user):
    return user.agency


# ── Bank Accounts ─────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def bank_account_list_create(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        return Response(BankAccountSerializer(
            BankAccount.objects.filter(agency=ag), many=True).data)

    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    serializer = BankAccountSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(agency=ag)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def bank_account_detail(request, pk):
    ag = user_agency(request.user)
    try:
        account = BankAccount.objects.get(pk=pk, agency=ag)
    except BankAccount.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(BankAccountSerializer(account).data)
    if request.method == 'DELETE':
        account.delete()
        return Response(status=204)
    serializer = BankAccountSerializer(account, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ── Bills ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def bill_list_create(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        site_id = request.query_params.get('site')
        qs = Bill.objects.filter(agency=ag)
        if request.user.role == 'client':
            qs = qs.filter(site__client_user=request.user)
        elif site_id:
            qs = qs.filter(site_id=site_id)
        return Response(BillSerializer(qs, many=True).data)

    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    serializer = BillSerializer(data=request.data)
    if serializer.is_valid():
        bill = serializer.save(agency=ag, created_by=request.user)
        return Response(BillSerializer(bill).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def bill_detail(request, pk):
    ag = user_agency(request.user)
    try:
        if request.user.role == 'client':
            bill = Bill.objects.get(pk=pk, agency=ag, site__client_user=request.user)
        else:
            bill = Bill.objects.get(pk=pk, agency=ag)
    except Bill.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(BillSerializer(bill).data)
    if request.method == 'DELETE':
        bill.delete()
        return Response(status=204) # 204 No Content correctly handles no-body response
    serializer = BillSerializer(bill, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(BillSerializer(bill).data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_bill(request, pk):
    """Mark bill as sent (timestamp it). Actual delivery handled by frontend."""
    ag = user_agency(request.user)
    try:
        bill = Bill.objects.get(pk=pk, agency=ag)
    except Bill.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    bill.sent_at = timezone.now()
    bill.save()
    return Response({'sent_at': bill.sent_at})


# ── Payments ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def payment_list_create(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        bill_id = request.query_params.get('bill')
        if request.user.role == 'client':
            # Clients only see payments for their bills
            qs = Payment.objects.filter(bill__site__client_user=request.user)
        else:
            qs = Payment.objects.filter(bill__agency=ag)
        if bill_id:
            qs = qs.filter(bill_id=bill_id)
        return Response(PaymentSerializer(qs, many=True, context={'request': request}).data)

    # POST — client submits a payment, owner/admin records one
    if request.user.role == 'client':
        # Client can only submit payments for their own site's bills
        bill_id = request.data.get('bill')
        if bill_id:
            try:
                bill = Bill.objects.get(pk=bill_id, site__client_user=request.user)
            except Bill.DoesNotExist:
                return Response({'detail': 'Bill not found or not accessible.'}, status=404)
        serializer = PaymentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            payment = serializer.save()
            return Response(PaymentSerializer(payment, context={'request': request}).data, status=201)
        return Response(serializer.errors, status=400)

    # Owner / admin records a payment
    serializer = PaymentSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        payment = serializer.save()
        return Response(PaymentSerializer(payment, context={'request': request}).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request, pk):
    """Owner/Admin verify or reject a payment."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    try:
        payment = Payment.objects.get(pk=pk)
    except Payment.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    action = request.data.get('action')
    if action not in ['verify', 'reject']:
        return Response({'detail': 'action must be verify or reject.'}, status=400)

    old_status = payment.status
    new_status = 'verified' if action == 'verify' else 'rejected'

    # If status isn't changing, just return early
    if old_status == new_status:
        return Response(PaymentSerializer(payment, context={'request': request}).data)

    with transaction.atomic():
        payment.status      = new_status
        payment.verified_by = request.user
        payment.save()

        bill = payment.bill
        amount_paid = Decimal(str(payment.amount_paid))

        # ── Update Bank & Create Transactions ─────────────────────────
        bank = payment.via_bank_account or bill.bank_account
        if not bank:
            bank = BankAccount.objects.filter(agency=bill.agency, is_default=True).first()

        if action == 'verify':
            # 1. Update Bill Remaining
            bill.remaining = max(Decimal('0'), bill.remaining - amount_paid)
            bill.save()

            # 2. Credit Bank Account
            if bank:
                new_balance = bank.balance + amount_paid
                bank.balance = new_balance
                bank.save()

                if not payment.via_bank_account:
                    payment.via_bank_account = bank
                    payment.save(update_fields=['via_bank_account'])

                # Create Credit Log
                BankTransaction.objects.create(
                    bank_account=bank,
                    type='credit',
                    amount=amount_paid,
                    running_balance=new_balance,
                    description=f"Payment Verified: {bill.site.name}",
                    category='billing',
                    date=payment.paid_at or timezone.now().date(),
                    created_by=request.user,
                )

        elif action == 'reject':
            # If we are rejecting a payment that was PREVIOUSLY verified, we must REVERSE it.
            if old_status == 'verified':
                # 1. Restore Bill Remaining
                bill.remaining = bill.remaining + amount_paid
                bill.save()

                # 2. Debit Bank Account (Reversal)
                if bank:
                    new_balance = bank.balance - amount_paid
                    bank.balance = new_balance
                    bank.save()

                    # Create Debit Log
                    BankTransaction.objects.create(
                        bank_account=bank,
                        type='debit',
                        amount=amount_paid,
                        running_balance=new_balance,
                        description=f"Payment Rejected (Reversal): {bill.site.name}",
                        category='billing',
                        date=timezone.now().date(),
                        created_by=request.user,
                    )

    return Response(PaymentSerializer(payment, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_delete_payment(request, pk):
    """Client requests deletion of a payment they submitted."""
    if request.user.role != 'client':
        return Response({'detail': 'Only clients can request deletion.'}, status=403)
    try:
        payment = Payment.objects.get(pk=pk, bill__site__client_user=request.user)
    except Payment.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    reason = request.data.get('reason', 'No reason provided.')
    payment.notes = f"⚠️ [DELETE REQUESTED]: {reason} \n{payment.notes}"
    payment.save()
    return Response({'detail': 'Deletion request sent.', 'notes': payment.notes})

# ── Analysis summary ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def billing_summary(request):
    """Top-level totals for the analysis section."""
    ag = user_agency(request.user)
    from django.db.models import Sum
    bills    = Bill.objects.filter(agency=ag)
    payments = Payment.objects.filter(bill__agency=ag, status='verified')

    total_billed  = bills.aggregate(t=Sum('amount'))['t'] or 0
    total_received = payments.aggregate(t=Sum('amount_paid'))['t'] or 0
    total_remaining = bills.aggregate(t=Sum('remaining'))['t'] or 0

    return Response({
        'total_billed':    float(total_billed),
        'total_received':  float(total_received),
        'total_remaining': float(total_remaining),
    })


# ── Bank Account Stats ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bank_account_stats(request):
    """Per-account summary: credited, debited, volume, limit usage — for LAST 30 DAYS rolling."""
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import timedelta

    ag = user_agency(request.user)
    today = timezone.now().date()
    # Default to rolling 30 days
    start_date = today - timedelta(days=30)

    accounts = BankAccount.objects.filter(agency=ag)
    result = []

    for acc in accounts:
        # Source of Truth: The BankTransaction ledger (Rolling 30 days)
        txns_window = BankTransaction.objects.filter(
            bank_account=acc,
            date__gte=start_date,
            date__lte=today
        )

        credited = txns_window.filter(type='credit').aggregate(t=Sum('amount'))['t'] or 0
        debited  = txns_window.filter(type='debit').aggregate(t=Sum('amount'))['t'] or 0
        
        # Standardize counting to be inclusive of all categories (like 'payment' and 'billing')
        payment_count = txns_window.filter(category__in=['billing', 'payment']).count()
        salary_count  = txns_window.filter(category='salary').count()
        total_count   = txns_window.count()

        total_volume = float(credited) + float(debited)
        limit = float(acc.transaction_limit)
        limit_used_pct = round((total_volume / limit) * 100, 1) if limit > 0 else 0

        result.append({
            'id':               acc.id,
            'account_name':     acc.account_name,
            'bank_name':        acc.bank_name,
            'account_no':       acc.account_no,
            'upi_id':           acc.upi_id,
            'is_default':       acc.is_default,
            'balance':          float(acc.balance),
            'transaction_limit': float(acc.transaction_limit),
            'total_credited':   float(credited),
            'total_debited':    float(debited),
            'total_volume':     total_volume,
            'limit_used_pct':   limit_used_pct,
            'limit_remaining':  max(0, limit - total_volume),
            'payment_count':    payment_count,
            'salary_count':     salary_count,
            'transaction_count': total_count,
        })

    return Response(result)


# ── Bank Account Transactions ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bank_account_transactions(request, pk):
    """Bank-statement-style ledger from BankTransaction table with date filtering."""
    from datetime import timedelta
    from .models import BankTransaction

    ag = user_agency(request.user)
    try:
        acc = BankAccount.objects.get(pk=pk, agency=ag)
    except BankAccount.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    today = timezone.now().date()

    # Date range params — default to last 7 days
    end_date_str   = request.query_params.get('end_date')
    start_date_str = request.query_params.get('start_date')

    try:
        end_date   = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today
        start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else (today - timedelta(days=30))
    except ValueError:
        return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

    # 1. Fetch Transactions
    txns_qs = BankTransaction.objects.filter(
        bank_account=acc,
        date__gte=start_date,
        date__lte=end_date,
    ).order_by('-date', '-created_at', '-id')

    # 2. Calculate PERIOD OPENING BALANCE
    # Opening balance is the running_balance of the transaction immediately BEFORE the start_date
    prior_txn = BankTransaction.objects.filter(
        bank_account=acc,
        date__lt=start_date
    ).order_by('-date', '-created_at', '-id').first()
    
    # If no prior transaction, opening balance is 0 (or you could infer it if there's a starting balance field)
    period_opening_balance = float(prior_txn.running_balance) if prior_txn else 0.0

    data = []
    for t in txns_qs:
        data.append({
            'id':              f'txn-{t.pk}',
            'type':            t.type,
            'amount':          float(t.amount),
            'running_balance': float(t.running_balance),
            'description':     t.description,
            'category':        t.category,
            'date':            str(t.date),
            'timestamp':       t.created_at.isoformat(),
            'created_by':      t.created_by.name if t.created_by else None,
        })

    return Response({
        'account_name': acc.account_name,
        'bank_name':    acc.bank_name,
        'balance':      float(acc.balance),
        'period_opening_balance': period_opening_balance,
        'start_date':   str(start_date),
        'end_date':     str(end_date),
        'transactions': data,
    })


# ── Smart Account Suggestion ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bank_account_suggest(request):
    """
    Suggest the best bank account to use for a payment or salary.
    Query params:
      - site=<id>     → suggest account most used for this site's payments
      - purpose=salary → suggest account most used for salary in this agency
    Returns { suggested_account_id, reason }
    """
    from django.db.models import Count
    from salary.models import SalaryRecord

    ag = user_agency(request.user)
    site_id = request.query_params.get('site')
    purpose = request.query_params.get('purpose')

    if site_id:
        # Find account used most for this site's payments
        top = (
            Payment.objects
            .filter(bill__site_id=site_id, bill__agency=ag, status='verified')
            .exclude(via_bank_account=None)
            .values('via_bank_account')
            .annotate(c=Count('id'))
            .order_by('-c')
            .first()
        )
        if top:
            return Response({
                'suggested_account_id': top['via_bank_account'],
                'reason': 'Most used for this site'
            })

    elif purpose == 'salary':
        # Find account used most for salary in this agency
        top = (
            SalaryRecord.objects
            .filter(guard__agency=ag)
            .exclude(from_bank=None)
            .values('from_bank')
            .annotate(c=Count('id'))
            .order_by('-c')
            .first()
        )
        if top:
            return Response({
                'suggested_account_id': top['from_bank'],
                'reason': 'Most used for salary'
            })

    # Fall back to default account
    default = BankAccount.objects.filter(agency=ag, is_default=True).first()
    if default:
        return Response({
            'suggested_account_id': default.id,
            'reason': 'Default account'
        })

    return Response({'suggested_account_id': None, 'reason': 'No suggestion'})

