import re
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from company.models import Guard, Site
from .models import AdminAttendance, SupervisorAttendance, GuardAttendance
from .serializers import AdminAttendanceSerializer, SupervisorAttendanceSerializer, GuardAttendanceSerializer


def user_agency(user):
    return user.agency


# ── Admin Attendance ──────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_attendance(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        qs = AdminAttendance.objects.filter(user__agency=ag).order_by('-date')
        return Response(AdminAttendanceSerializer(qs, many=True).data)
    # Manual mark
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    serializer = AdminAttendanceSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ── Supervisor Attendance ─────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def supervisor_attendance(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        qs = SupervisorAttendance.objects.filter(user__agency=ag).order_by('-date')
        return Response(SupervisorAttendanceSerializer(qs, many=True).data)

    # Supervisor submitting their own attendance
    serializer = SupervisorAttendanceSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def supervisor_attendance_review(request, pk):
    """Owner/Admin approve or reject supervisor attendance."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    try:
        att = SupervisorAttendance.objects.get(pk=pk)
    except SupervisorAttendance.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    action = request.data.get('action')
    if action not in ['approve', 'reject']:
        return Response({'detail': 'action must be approve or reject.'}, status=400)
    att.status      = 'approved' if action == 'approve' else 'rejected'
    att.reviewed_by = request.user
    att.save()
    return Response(SupervisorAttendanceSerializer(att).data)


# ── Guard Attendance ──────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def guard_attendance(request):
    ag = user_agency(request.user)
    if request.method == 'GET':
        guard_id = request.query_params.get('guard')
        month    = request.query_params.get('month')
        year     = request.query_params.get('year')
        qs = GuardAttendance.objects.filter(guard__agency=ag)
        if guard_id: qs = qs.filter(guard_id=guard_id)
        if month:    qs = qs.filter(date__month=month)
        if year:     qs = qs.filter(date__year=year)
        return Response(GuardAttendanceSerializer(qs.order_by('-date'), many=True).data)

    serializer = GuardAttendanceSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(marked_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ── Bulk Guard Attendance — WhatsApp paste OR manual selection ────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guard_attendance_bulk(request):
    """
    Two modes (selected via 'mode' field):
      mode='whatsapp' : parse a WhatsApp group message pasted as text
      mode='manual'   : accept a list of {guard_id, status} objects

    WhatsApp format:
      present
      Site1:guard1,guard2
      Site2:guard3

      absent
      Site1:guard4
    """
    ag   = user_agency(request.user)
    mode = request.data.get('mode', 'manual')
    date = request.data.get('date', str(timezone.now().date()))

    created, errors = [], []

    if mode == 'whatsapp':
        text = request.data.get('text', '')
        current_status = 'present'
        for line in text.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            if line.lower() in ('present', 'absent'):
                current_status = line.lower()
                continue
            # Try parsing "SiteName:guard1,guard2"
            if ':' in line:
                site_name, names_str = line.split(':', 1)
                site_name = site_name.strip()
                names = [n.strip() for n in names_str.split(',') if n.strip()]
                for name in names:
                    guard_qs = Guard.objects.filter(agency=ag, name__iexact=name)
                    if guard_qs.exists():
                        guard = guard_qs.first()
                        obj, _ = GuardAttendance.objects.update_or_create(
                            guard=guard, date=date,
                            defaults={'status': current_status, 'source': 'whatsapp',
                                      'marked_by': request.user}
                        )
                        created.append(obj.pk)
                    else:
                        errors.append(f"Guard not found: {name}")

    elif mode == 'manual':
        entries = request.data.get('entries', [])
        for entry in entries:
            try:
                guard = Guard.objects.get(pk=entry['guard_id'], agency=ag)
                obj, _ = GuardAttendance.objects.update_or_create(
                    guard=guard, date=date,
                    defaults={'status': entry.get('status', 'present'),
                              'source': 'manual', 'marked_by': request.user}
                )
                created.append(obj.pk)
            except Guard.DoesNotExist:
                errors.append(f"Guard #{entry.get('guard_id')} not found.")
            except Exception as e:
                errors.append(str(e))

    return Response({'created': len(created), 'errors': errors})
