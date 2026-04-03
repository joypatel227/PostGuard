from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from wallet.models import Wallet, WalletTransaction
from .models import SiteVisit, Followup, FuelStop, SupervisorLocation
from .serializers import (SiteVisitSerializer, FollowupSerializer,
                          FuelStopSerializer, SupervisorLocationSerializer)


def user_agency(user):
    return user.agency


# ── Site Visits ───────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def site_visit_list_create(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        date = request.query_params.get('date', str(timezone.now().date()))
        sup_id = request.query_params.get('supervisor')
        qs = SiteVisit.objects.filter(site__agency=ag, assigned_date=date)
        if sup_id:
            qs = qs.filter(supervisor_id=sup_id)
        elif request.user.role == 'supervisor':
            qs = qs.filter(supervisor=request.user)
        return Response(SiteVisitSerializer(qs, many=True).data)

    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Only owner/admin can assign site visits.'}, status=403)
    serializer = SiteVisitSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def site_visit_detail(request, pk):
    ag = user_agency(request.user)
    try:
        visit = SiteVisit.objects.get(pk=pk, site__agency=ag)
    except SiteVisit.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(SiteVisitSerializer(visit).data)
    if request.method == 'DELETE':
        if request.user.role not in ['owner', 'admin']:
            return Response({'detail': 'Not allowed.'}, status=403)
        visit.delete()
        return Response({'detail': 'Deleted.'}, status=204)

    serializer = SiteVisitSerializer(visit, data=request.data, partial=True)
    if serializer.is_valid():
        # Auto-set timestamps based on status transition
        new_status = request.data.get('status')
        if new_status == 'travelling' and not visit.depart_time:
            visit.depart_time = timezone.now()
        elif new_status == 'reached' and not visit.arrive_time:
            visit.arrive_time = timezone.now()
        elif new_status == 'visited' and not visit.complete_time:
            visit.complete_time = timezone.now()
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ── Followups ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def followup_list_create(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        visit_id = request.query_params.get('visit')
        qs = Followup.objects.filter(site_visit__site__agency=ag)
        if visit_id:
            qs = qs.filter(site_visit_id=visit_id)
        return Response(FollowupSerializer(qs, many=True).data)

    serializer = FollowupSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ── Duty Toggle ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_duty(request):
    """Supervisor toggles on/off duty; updates SupervisorLocation."""
    if request.user.role != 'supervisor':
        return Response({'detail': 'Only supervisors can toggle duty.'}, status=403)
    lat = request.data.get('lat')
    lng = request.data.get('lng')
    loc, _ = SupervisorLocation.objects.get_or_create(supervisor=request.user)
    loc.is_on_duty = not loc.is_on_duty
    if lat: loc.lat = lat
    if lng: loc.lng = lng
    loc.save()
    return Response({'is_on_duty': loc.is_on_duty, 'lat': str(loc.lat), 'lng': str(loc.lng)})


# ── Live Location Update ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_location(request):
    if request.user.role != 'supervisor':
        return Response({'detail': 'Not allowed.'}, status=403)
    lat = request.data.get('lat')
    lng = request.data.get('lng')
    if not lat or not lng:
        return Response({'detail': 'lat and lng required.'}, status=400)
    loc, _ = SupervisorLocation.objects.get_or_create(supervisor=request.user)
    loc.lat = lat
    loc.lng = lng
    loc.save()
    return Response({'status': 'updated'})


# ── All Supervisor Live Locations (for map) ───────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_locations(request):
    ag = user_agency(request.user)
    qs = SupervisorLocation.objects.filter(
        supervisor__agency=ag, is_on_duty=True
    ).select_related('supervisor')
    return Response(SupervisorLocationSerializer(qs, many=True).data)


# ── Fuel Stop ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fuel_stop_list_create(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        qs = FuelStop.objects.filter(supervisor__agency=ag).order_by('-timestamp')
        return Response(FuelStopSerializer(qs, many=True).data)

    if request.user.role != 'supervisor':
        return Response({'detail': 'Only supervisors can log fuel stops.'}, status=403)

    serializer = FuelStopSerializer(data=request.data)
    if serializer.is_valid():
        fuel = serializer.save(supervisor=request.user)
        # Deduct from supervisor wallet
        try:
            wallet = Wallet.objects.get(user=request.user)
            if wallet.balance >= fuel.amount:
                wallet.balance -= fuel.amount
                wallet.save()
                WalletTransaction.objects.create(
                    wallet=wallet, amount=fuel.amount, txn_type='fuel',
                    balance_after=wallet.balance,
                    note=f'Fuel at {fuel.location_name or "location"}',
                    created_by=request.user
                )
        except Wallet.DoesNotExist:
            pass
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)
