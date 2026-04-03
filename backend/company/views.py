from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Agency, Site, Guard
from .serializers import AgencySerializer, SiteSerializer, GuardSerializer


def agency_of(user):
    """Return the agency the user belongs to (or created)."""
    return user.agency


from rest_framework.permissions import IsAuthenticated, AllowAny

# ── Agency ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def public_agency_list(request):
    qs = Agency.objects.all().order_by('name')
    return Response([{'id': a.id, 'name': a.name} for a in qs])

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def agency_list(request):
    if request.method == 'GET':
        if request.user.role == 'lord':
            qs = Agency.objects.all()
        else:
            ag = agency_of(request.user)
            qs = Agency.objects.filter(pk=ag.pk) if ag else Agency.objects.none()
        return Response(AgencySerializer(qs, many=True).data)
    elif request.method == 'POST':
        if request.user.role != 'lord':
            return Response({'detail': 'Not allowed.'}, status=403)
        serializer = AgencySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def agency_detail(request, pk):
    try:
        agency = Agency.objects.get(pk=pk)
    except Agency.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
        
    if request.method == 'DELETE':
        if request.user.role != 'lord':
            return Response({'detail': 'Not allowed.'}, status=403)
        
        # Deleting the agency already cascades to Sites and Guards (models.CASCADE)
        # We manually delete the Users with role='owner' for this agency
        from django.contrib.auth import get_user_model
        User = get_user_model()
        User.objects.filter(agency=agency, role='owner').delete()
        
        agency.delete()
        return Response({'detail': 'Deleted.'}, status=204)
        
    return Response(AgencySerializer(agency).data)


# ── Sites ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def site_list_create(request):
    ag = agency_of(request.user)
    if request.method == 'GET':
        qs = Site.objects.filter(agency=ag) if ag else Site.objects.none()
        return Response(SiteSerializer(qs, many=True).data)

    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    data = request.data.copy()
    data['agency'] = ag.pk
    serializer = SiteSerializer(data=data)
    if serializer.is_valid():
        serializer.save(agency=ag)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def site_detail(request, pk):
    ag = agency_of(request.user)
    try:
        site = Site.objects.get(pk=pk, agency=ag)
    except Site.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(SiteSerializer(site).data)

    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)

    if request.method == 'DELETE':
        site.delete()
        return Response({'detail': 'Deleted.'}, status=204)

    serializer = SiteSerializer(site, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ── Guards ────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def guard_list_create(request):
    ag = agency_of(request.user)
    if request.method == 'GET':
        site_id = request.query_params.get('site')
        qs = Guard.objects.filter(agency=ag) if ag else Guard.objects.none()
        if site_id:
            qs = qs.filter(site_id=site_id)
        return Response(GuardSerializer(qs, many=True).data)

    if request.user.role not in ['owner', 'admin', 'supervisor']:
        return Response({'detail': 'Not allowed.'}, status=403)

    serializer = GuardSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(agency=ag, created_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def guard_detail(request, pk):
    ag = agency_of(request.user)
    try:
        guard = Guard.objects.get(pk=pk, agency=ag)
    except Guard.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(GuardSerializer(guard).data)

    if request.method == 'DELETE':
        if request.user.role not in ['owner', 'admin']:
            return Response({'detail': 'Not allowed.'}, status=403)
        guard.delete()
        return Response({'detail': 'Deleted.'}, status=204)

    serializer = GuardSerializer(guard, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guard_toggle_duty(request, pk):
    ag = agency_of(request.user)
    try:
        guard = Guard.objects.get(pk=pk, agency=ag)
    except Guard.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    guard.is_on_duty = not guard.is_on_duty
    guard.save()
    return Response({'is_on_duty': guard.is_on_duty})
