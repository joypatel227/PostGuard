import calendar
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

    guards = Guard.objects.filter(agency=ag, is_active=True)

    # Auto-compute records for all guards
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
    """Mark salary (full or custom amount) as paid."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    ag = user_agency(request.user)
    try:
        record = SalaryRecord.objects.get(pk=pk, guard__agency=ag)
    except SalaryRecord.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    amount       = float(request.data.get('amount', float(record.amount_remaining)))
    payment_mode = request.data.get('payment_mode', 'offline')
    from_bank_id = request.data.get('from_bank')
    to_details   = request.data.get('to_account_details', '')
    notes        = request.data.get('notes', '')

    if amount <= 0:
        return Response({'detail': 'Amount must be positive.'}, status=400)
    if amount > float(record.amount_remaining):
        return Response({'detail': 'Amount exceeds remaining salary.'}, status=400)

    record.amount_paid    += amount
    record.amount_remaining = max(0, float(record.amount_earned) - float(record.advance_given) - float(record.amount_paid))
    record.paid_at         = timezone.now().date()
    record.payment_mode    = payment_mode
    record.paid_by         = request.user
    record.to_account_details = to_details
    record.notes           = notes
    if from_bank_id:
        record.from_bank_id = from_bank_id
    record.save()

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
        'total_earned':  float(qs.aggregate(t=Sum('amount_earned'))['t']  or 0),
        'total_paid':    float(qs.aggregate(t=Sum('amount_paid'))['t']    or 0),
        'total_advance': float(qs.aggregate(t=Sum('advance_given'))['t']  or 0),
        'total_remaining': float(qs.aggregate(t=Sum('amount_remaining'))['t'] or 0),
        'month': month,
        'year':  year,
    })
