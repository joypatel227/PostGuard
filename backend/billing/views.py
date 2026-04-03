from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BankAccount, Bill, Payment
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
        return Response({'detail': 'Deleted.'}, status=204)
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
        if site_id:
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
        bill = Bill.objects.get(pk=pk, agency=ag)
    except Bill.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(BillSerializer(bill).data)
    if request.method == 'DELETE':
        bill.delete()
        return Response({'detail': 'Deleted.'}, status=204)
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
        qs = Payment.objects.filter(bill__agency=ag)
        if bill_id:
            qs = qs.filter(bill_id=bill_id)
        return Response(PaymentSerializer(qs, many=True).data)

    # Site uploads a payment screenshot
    serializer = PaymentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
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

    payment.status      = 'verified' if action == 'verify' else 'rejected'
    payment.verified_by = request.user
    payment.save()

    # Update bill remaining amount
    if action == 'verify':
        bill = payment.bill
        bill.remaining = max(0, bill.remaining - payment.amount_paid)
        bill.save()

    return Response(PaymentSerializer(payment).data)


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
