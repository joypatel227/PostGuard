import calendar
from decimal import Decimal
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum

from company.models import Guard
from .models import SalaryRecord
from .serializers import SalaryRecordSerializer


def user_agency(user):
    return user.agency


# ── List / Compute salary records for a month ─────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def salary_list(request):
    """Return computed salary records for all guards in the agency for given month/year."""
    ag    = user_agency(request.user)
    today = timezone.now().date()
    month = int(request.query_params.get('month', today.month))
    year  = int(request.query_params.get('year',  today.year))

    guards = Guard.objects.select_related('site', 'shift').filter(agency=ag, is_active=True)

    # Auto-compute/refresh records for all guards
    records = [SalaryRecord.compute_for_guard(g, month, year) for g in guards]

    return Response(SalaryRecordSerializer(records, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def salary_detail(request, pk):
    ag = user_agency(request.user)
    try:
        record = SalaryRecord.objects.get(pk=pk, guard__agency=ag)
    except SalaryRecord.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    return Response(SalaryRecordSerializer(record).data)


# ── Pay Salary ────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_salary(request, pk):
    """Mark salary (full or custom amount) as paid and clear running balance."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)

    ag = user_agency(request.user)
    try:
        record = SalaryRecord.objects.get(pk=pk, guard__agency=ag)
    except SalaryRecord.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    # Amount defaults to the running_remaining (salary due since last paid)
    # We compute it here the same way the serializer does
    from company.models import Attendance
    today = timezone.now().date()
    daily_rate = float(record.daily_rate)
    atts_qs = Attendance.objects.filter(
        guard=record.guard,
        date__month=record.month,
        date__year=record.year,
        date__lte=today,
        is_overtime=False,
        status__in=['present', 'late'],
    )
    
    earned_today = round(daily_rate * atts_qs.count(), 2)
    running_remaining = round(earned_today - float(record.advance_given) - float(record.amount_paid), 2)

    # Use provided amount or default to the full running remaining (if positive)
    default_amount = running_remaining if running_remaining > 0 else 0
    amount = float(request.data.get('amount', default_amount))
    
    if amount <= 0:
        return Response({'detail': 'Payment amount must be greater than zero.'}, status=400)

    payment_mode = request.data.get('payment_mode', 'offline')
    from_bank_id = request.data.get('from_bank')
    to_details   = request.data.get('to_account_details', '')
    notes        = request.data.get('notes', '')

    # 1. Verification: Ensure sufficient bank balance IF paying via bank
    bank = None
    if from_bank_id and amount > 0:
        try:
            from billing.models import BankAccount
            bank = BankAccount.objects.get(pk=from_bank_id, agency=ag)
            if bank.balance < Decimal(str(amount)):
                return Response({
                    'detail': f'Insufficient balance in {bank.account_name}. Available: ₹{bank.balance}'
                }, status=400)
        except BankAccount.DoesNotExist:
            return Response({'detail': 'Selected bank account not found.'}, status=400)

    # 2. Process Payment (Atomic)
    from django.db import transaction
    try:
        with transaction.atomic():
            # Accumulate paid amount & set last-paid date
            record.amount_paid      += Decimal(str(amount))
            record.paid_at           = today
            record.payment_mode      = payment_mode
            record.paid_by           = request.user
            record.to_account_details = to_details
            record.notes             = notes
            if bank:
                record.from_bank = bank

            # Recalculate stored amount_remaining
            record.amount_remaining = round(record.amount_earned - record.advance_given - record.amount_paid, 2)
            record.save()

            # Record the payment history log (both Cash and Online)
            from .models import SalaryPaymentLog
            SalaryPaymentLog.objects.create(
                salary_record=record,
                amount=Decimal(str(amount)),
                payment_mode=payment_mode,
                from_bank=bank,
                to_account_details=to_details,
                date=today,
                created_by=request.user
            )

            # Debit from bank
            if bank:
                from billing.models import BankTransaction
                new_balance = bank.balance - Decimal(str(amount))
                BankTransaction.objects.create(
                    bank_account=bank,
                    type='debit',
                    amount=Decimal(str(amount)),
                    running_balance=new_balance,
                    description=f"Salary paid to {record.guard.name} ({record.month}/{record.year})",
                    category='salary',
                    date=today,
                    salary_record=record,
                    created_by=request.user,
                )
                bank.balance = new_balance
                bank.save(update_fields=['balance'])
                
    except Exception as e:
        return Response({'detail': f'Error processing payment: {str(e)}'}, status=500)

    return Response(SalaryRecordSerializer(record).data)


# ── Summary totals for analysis ───────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def salary_summary(request):
    ag    = user_agency(request.user)
    today = timezone.now().date()
    month = int(request.query_params.get('month', today.month))
    year  = int(request.query_params.get('year',  today.year))

    qs = SalaryRecord.objects.filter(guard__agency=ag, month=month, year=year)
    return Response({
        'total_earned':    float(qs.aggregate(t=Sum('amount_earned'))['t']    or 0),
        'total_paid':      float(qs.aggregate(t=Sum('amount_paid'))['t']      or 0),
        'total_advance':   float(qs.aggregate(t=Sum('advance_given'))['t']    or 0),
        'total_remaining': float(qs.aggregate(t=Sum('amount_remaining'))['t'] or 0),
        'month': month,
        'year':  year,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_salary_history(request):
    """Allows a Guard user to see their own salary history."""
    if request.user.role != 'guard':
        return Response({'detail': 'Only guards can access this view.'}, status=403)
    
    # Check if user has a linked guard profile
    from company.models import Guard
    try:
        # Assuming we store guard_id on the user during registration (as seen in GuardDashboard.jsx)
        # and guard is linked by phone
        guard = Guard.objects.get(phone=request.user.phone)
        records = SalaryRecord.objects.filter(guard=guard).order_by('-year', '-month')
        return Response(SalaryRecordSerializer(records, many=True).data)
    except Guard.DoesNotExist:
        return Response({'detail': 'Guard profile not found for this user.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def undo_salary_payout(request, pk):
    """Undo ONLY the single most recent salary payment (debit) linked to this record."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)

    ag = user_agency(request.user)
    try:
        record = SalaryRecord.objects.get(pk=pk, guard__agency=ag)
    except SalaryRecord.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    from .models import SalaryPaymentLog
    # Find ONLY the absolute latest payment log linked to this salary record
    last_log = SalaryPaymentLog.objects.filter(
        salary_record=record
    ).order_by('-created_at').first()

    if not last_log:
        return Response({'detail': 'No salary payment found to undo for this record.'}, status=400)

    from datetime import timedelta
    if last_log.created_at < timezone.now() - timedelta(days=7):
        return Response({
            'detail': 'Undo time limit exceeded. You can only undo a payment within 1 week of making it.'
        }, status=400)

    from django.db import transaction
    try:
        with transaction.atomic():
            amount = last_log.amount
            bank = last_log.from_bank

            # 1. Reverse the bank balance and delete BankTransaction (if online)
            if last_log.payment_mode == 'online' and bank:
                bank.balance += amount
                bank.save(update_fields=['balance'])
                
                # Delete the mirrored BankTransaction
                from billing.models import BankTransaction
                bt = BankTransaction.objects.filter(
                    salary_record=record,
                    type='debit',
                    bank_account=bank,
                    amount=amount
                ).order_by('-created_at').first()
                if bt:
                    bt.delete()

            # 2. Subtract the reversed amount from the salary record
            record.amount_paid -= amount
            record.amount_remaining = round(
                float(record.amount_earned) - float(record.advance_given) - float(record.amount_paid), 2
            )

            # 3. Restore or clear payment metadata intelligently
            if record.amount_paid <= 0:
                # No money paid at all anymore -> clear everything
                record.amount_paid = Decimal('0.00')
                record.paid_at = None
                record.from_bank = None
                record.payment_mode = None
                record.paid_by = None
            else:
                # Revert to the previous Payment Log
                prev_log = SalaryPaymentLog.objects.filter(
                    salary_record=record
                ).exclude(pk=last_log.pk).order_by('-created_at').first()
                
                if prev_log:
                    record.paid_at = prev_log.date
                    record.from_bank = prev_log.from_bank
                    record.payment_mode = prev_log.payment_mode
                    record.paid_by = prev_log.created_by
                else:
                    # Fallback (should theoretically not trigger if logs are intact)
                    record.from_bank = None
                    record.payment_mode = 'offline'

            # 4. Delete the log entirely
            last_log.delete()
            record.save()

    except Exception as e:
        return Response({'detail': f'Error undoing payment: {str(e)}'}, status=500)

    return Response(SalaryRecordSerializer(record).data)
