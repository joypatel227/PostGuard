from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Agency, Site, Guard, SiteShift, Attendance, DailyWage
from .serializers import AgencySerializer, SiteSerializer, GuardSerializer, SiteShiftSerializer


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
        return Response(status=204)
        
    return Response(AgencySerializer(agency).data)


# ── Sites ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def site_list_create(request):
    ag = agency_of(request.user)
    if request.method == 'GET':
        if request.user.role == 'client':
            qs = Site.objects.filter(client_user=request.user)
        else:
            qs = Site.objects.filter(agency=ag) if ag else Site.objects.none()
        return Response(SiteSerializer(qs, many=True).data)

    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
        
    s_name  = request.data.get('shift_name', '').strip()
    s_start = request.data.get('shift_start_time', '').strip()
    s_end   = request.data.get('shift_end_time', '').strip()
    if not s_name or not s_start or not s_end:
        return Response({'detail': 'First shift (name, start, end) is mandatory.'}, status=400)

    data = request.data.copy()
    data['agency'] = ag.pk
    serializer = SiteSerializer(data=data)
    if serializer.is_valid():
        site = serializer.save(agency=ag)
        SiteShift.objects.create(
            site=site, name=s_name, start_time=s_start, end_time=s_end
        )
        return Response(SiteSerializer(site).data, status=201)
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
        return Response({'detail': 'Deleted successfully'}, status=200)

    serializer = SiteSerializer(site, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def site_unlink_client(request, pk):
    ag = agency_of(request.user)
    try:
        site = Site.objects.get(pk=pk, agency=ag)
    except Site.DoesNotExist:
        return Response({'detail': 'Site not found.'}, status=404)

    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)

    client_user = site.client_user
    if client_user:
        # 1. Unlink
        site.client_user = None
        site.save()
        # 2. Delete the user
        client_user.delete()
        return Response({'detail': 'Client login deleted and unlinked.'})
    
    return Response({'detail': 'No client linked to this site.'}, status=400)


# ── Shifts ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shift_list_create(request, site_pk):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    try:
        site = Site.objects.get(pk=site_pk, agency=request.user.agency)
    except Site.DoesNotExist:
        return Response({'detail': 'Site not found.'}, status=404)
        
    serializer = SiteShiftSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(site=site)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def shift_detail(request, pk):
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    try:
        shift = SiteShift.objects.get(pk=pk, site__agency=request.user.agency)
    except SiteShift.DoesNotExist:
        return Response({'detail': 'Shift not found.'}, status=404)

    if request.method == 'DELETE':
        # Optional: prevent deleting the last shift if you want to strictly enforce it
        if shift.site.shifts.count() <= 1:
            return Response({'detail': 'A site must have at least one shift.'}, status=400)
        shift.delete()
        return Response({'detail': 'Deleted successfully'}, status=200)

    serializer = SiteShiftSerializer(shift, data=request.data, partial=True)
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

    if request.user.role not in ['owner', 'admin']:
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
        return Response({'detail': 'Deleted successfully'}, status=200)

    serializer = GuardSerializer(guard, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guard_assign(request, pk):
    """
    Directly assigns a guard to a site/shift and handles temporary salary logic.
    """
    ag = agency_of(request.user)
    try:
        guard = Guard.objects.get(pk=pk, agency=ag)
    except Guard.DoesNotExist:
        return Response({'detail': 'Guard not found.'}, status=404)

    site_id = request.data.get('site')
    shift_id = request.data.get('shift')
    g_type = request.data.get('guard_type', 'regular')

    if not site_id or not shift_id:
        return Response({'detail': 'Site and Shift are required.'}, status=400)

    try:
        site = Site.objects.get(pk=site_id, agency=ag)
        shift = SiteShift.objects.get(pk=shift_id, site=site)
    except (Site.DoesNotExist, SiteShift.DoesNotExist):
        return Response({'detail': 'Invalid Site or Shift.'}, status=400)

    # 1. Check Site Capacity
    assigned_count = Guard.objects.filter(site=site, shift=shift, is_on_duty=True).count()
    if assigned_count >= site.num_securities:
        return Response({'detail': f'Site {site.name} is already at full capacity ({site.num_securities}/{site.num_securities}).'}, status=400)

    # 2. Check if Guard's current shift clashes with the new shift
    if guard.shift and (guard.site != site or guard.shift != shift):
        s1, e1 = shift.start_time, shift.end_time
        s2, e2 = guard.shift.start_time, guard.shift.end_time
        
        def get_intervals(s, e):
            sm = s.hour * 60 + s.minute
            em = e.hour * 60 + e.minute
            return [(sm, em)] if sm <= em else [(sm, 1440), (0, em)]
            
        def overlaps(i1, i2):
            return max(i1[0], i2[0]) < min(i1[1], i2[1])
            
        ivs1 = get_intervals(s1, e1)
        ivs2 = get_intervals(s2, e2)
        if any(overlaps(i, j) for i in ivs1 for j in ivs2):
            return Response({'detail': f'Guard is already assigned to a clashing shift ({guard.shift.name}).'}, status=400)

    # Update Guard
    guard.site = site
    guard.shift = shift
    guard.guard_type = g_type
    guard.is_on_duty = True # Auto on-duty when assigned
    guard.save()

    # If shift is currently live, auto-mark as present
    now = timezone.localtime().time()
    is_live = False
    if shift.start_time <= shift.end_time:
        is_live = shift.start_time <= now <= shift.end_time
    else: # Overnight
        is_live = now >= shift.start_time or now <= shift.end_time
    
    if is_live:
        Attendance.objects.get_or_create(
            agency=ag, guard=guard, site=site, shift=shift, date=timezone.localdate(),
            defaults={'status': 'present', 'check_in': timezone.now(), 'notes': 'Auto-marked present on site assignment'}
        )

    # If Temporary, create a Salary Record for today
    if g_type == 'temporary':
        DailyWage.objects.get_or_create(
            agency=ag, guard=guard, site=site, date=timezone.localdate(),
            defaults={'amount': guard.daily_rate, 'notes': f"Auto-generated for temporary shift at {site.name}"}
        )

    return Response(GuardSerializer(guard).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guard_toggle_duty(request, pk):
    ag = agency_of(request.user)
    try:
        guard = Guard.objects.get(pk=pk, agency=ag)
    except Guard.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
        
    from django.utils import timezone
    from datetime import datetime, time as dtime, timedelta
    today = timezone.localdate()
    now = timezone.localtime()
    now_utc = timezone.now()
    cur_time = now.time()
    
    # Remember current assignment before any changes
    current_site = guard.site
    current_shift = guard.shift
    
    # ── TURNING ON DUTY ────────────────────────────────────────────────────────
    if not guard.is_on_duty:
        if not current_site or not current_shift:
            return Response({'detail': 'Guard must be assigned to an active site and shift first.'}, status=400)
        
        on_duty_count = Guard.objects.filter(site=current_site, shift=current_shift, is_on_duty=True).count()
        if on_duty_count >= current_site.num_securities:
            return Response({
                'error': 'capacity_reached',
                'detail': f'Site is already at full capacity ({current_site.num_securities}/{current_site.num_securities}).',
                'limit': current_site.num_securities,
                'current': on_duty_count
            }, status=400)
        
        guard.is_on_duty = True
        guard.save()
        
        try:
            att, created = Attendance.objects.get_or_create(
                guard=guard, date=today, agency=ag,
                defaults={'site': current_site, 'shift': current_shift, 'status': 'present'}
            )
            if not att.check_in:
                att.check_in = now_utc
                # Check if guard arrived late (>15 min after shift start)
                shift_start = current_shift.start_time
                start_dt = datetime.combine(today, shift_start)
                import pytz
                local_tz = timezone.get_current_timezone()
                start_local = local_tz.localize(start_dt)
                if now.replace(tzinfo=None) > (start_dt + timedelta(minutes=15)):
                    att.status = 'late'
                att.save()
            
            # Temporary guard daily wage
            if guard.guard_type == 'temporary' and current_site:
                DailyWage.objects.get_or_create(
                    agency=ag, guard=guard, site=current_site, date=today,
                    defaults={'amount': guard.daily_rate, 'notes': f"Auto-generated for temporary duty at {current_site.name}"}
                )
            
            return Response({'is_on_duty': True, 'status': att.status})
        except Exception as e:
            print(f"Attendance log error (on): {str(e)}")
            return Response({'is_on_duty': True, 'status': 'present'}, status=200)
    
    # ── TURNING OFF DUTY ───────────────────────────────────────────────────────
    else:
        guard.is_on_duty = False
        # ✅ KEY FIX: Do NOT clear site/shift — guard remains visible in their shift
        # so the owner can see their status in the assignments board
        guard.save()
        
        try:
            # Determine if the shift is done (past), live, or overtime
            shift_end = current_shift.end_time if current_shift else None
            shift_start = current_shift.start_time if current_shift else None
            
            is_overtime = False
            if shift_end and shift_start:
                # Handle overnight shift
                if shift_end < shift_start:
                    is_live = cur_time >= shift_start or cur_time <= shift_end
                    is_past = not is_live and cur_time > shift_end
                else:
                    is_live = shift_start <= cur_time <= shift_end
                    is_past = cur_time > shift_end
                
                # Overtime = toggled off AFTER shift end time (not during live window)
                is_overtime = is_past and not is_live
            
            att, created = Attendance.objects.get_or_create(
                guard=guard, date=today, agency=ag,
                defaults={
                    'site': current_site,
                    'shift': current_shift,
                    'status': 'present',
                    'check_in': now_utc
                }
            )
            
            if not att.check_out:
                att.check_out = now_utc
            
            # ✅ KEY FIX: Always mark as PRESENT when toggling off (they were on duty)
            # Only overtime is a special case — mark separately
            if att.status not in ('present', 'late'):
                att.status = 'present'
            
            att.save()
            
            return Response({
                'is_on_duty': False,
                'status': att.status,
                'overtime': is_overtime
            })
        except Exception as e:
            print(f"Attendance log error (off): {str(e)}")
            return Response({'is_on_duty': False, 'status': 'present'}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_attendance_view(request):
    """
    Parses raw text (like WhatsApp reports) to update guard attendance.
    Format example: "Ravi Kumar - P", "Sunil - Absent"
    """
    ag = agency_of(request.user)
    text = request.data.get('text', '')
    if not text:
        return Response({'detail': 'No text provided.'}, status=400)
    
    import re
    from django.utils import timezone
    today = timezone.localdate()
    
    lines = text.split('\n')
    results = []
    
    # Fetch all guards for this agency once
    all_guards = Guard.objects.filter(agency=ag)
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Simple parsing logic: look for guard names in the line
        matched_guard = None
        for g in all_guards:
            if g.name.lower() in line.lower():
                matched_guard = g
                break
        
        if matched_guard:
            status_val = 'present'
            if 'absent' in line.lower() or ' off' in line.lower() or ' - a' in line.lower():
                status_val = 'absent'
            elif 'late' in line.lower():
                status_val = 'late'
            
            att, _ = Attendance.objects.update_or_create(
                guard=matched_guard, date=today, agency=ag,
                defaults={'status': status_val, 'site': matched_guard.site, 'shift': matched_guard.shift, 'notes': f"Parsed from report: {line}"}
            )
            results.append({'guard': matched_guard.name, 'status': status_val})

    return Response({'count': len(results), 'updates': results})


# ── Attendance ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def attendance_list(request):
    """GET attendance records (today by default, or ?date=YYYY-MM-DD) or POST a new one."""
    from .serializers import AttendanceSerializer
    ag = agency_of(request.user)
    today = timezone.localdate()

    if request.method == 'GET':
        month_param = request.query_params.get('month')
        if month_param:
            try:
                y, m = month_param.split('-')
                qs = Attendance.objects.filter(agency=ag, date__year=int(y), date__month=int(m)).select_related('guard', 'site', 'shift')
            except ValueError:
                qs = Attendance.objects.none()
        else:
            date_param = request.query_params.get('date', str(today))
            try:
                import datetime
                filter_date = datetime.date.fromisoformat(date_param)
            except (ValueError, TypeError):
                filter_date = today

            qs = Attendance.objects.filter(agency=ag, date=filter_date).select_related('guard', 'site', 'shift')
        
        # Optional filters
        guard_id = request.query_params.get('guard')
        site_id = request.query_params.get('site')
        if guard_id:
            qs = qs.filter(guard_id=guard_id)
        if site_id:
            qs = qs.filter(site_id=site_id)

        return Response(AttendanceSerializer(qs, many=True).data)

    # POST — create a new attendance record
    data = request.data.copy()
    data['agency'] = ag.pk
    if 'date' not in data:
        data['date'] = str(today)

    # Auto-detect overtime: if this guard already has attendance today for a DIFFERENT shift
    guard_id = data.get('guard')
    shift_id = data.get('shift')
    record_date = data.get('date', str(today))
    if guard_id and shift_id:
        existing_today = Attendance.objects.filter(
            agency=ag, guard_id=guard_id, date=record_date
        ).exclude(shift_id=shift_id)
        if existing_today.exists() and not data.get('is_overtime'):
            data['is_overtime'] = True

    serializer = AttendanceSerializer(data=data)
    if serializer.is_valid():
        serializer.save(agency=ag)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def attendance_detail(request, pk):
    """PATCH an existing attendance record — primarily used to flip status (absent ↔ present)."""
    from .serializers import AttendanceSerializer
    ag = agency_of(request.user)
    try:
        att = Attendance.objects.get(pk=pk, agency=ag)
    except Attendance.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(AttendanceSerializer(att).data)

    serializer = AttendanceSerializer(att, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()

        # If marking ABSENT, also set guard to off-duty
        new_status = request.data.get('status')
        if new_status == 'absent' and att.guard:
            Guard.objects.filter(pk=att.guard.pk).update(is_on_duty=False)

        # If undoing absent (marking present), set guard back on-duty (if shift is still live)
        if new_status in ('present', 'late') and att.guard and att.guard.shift:
            guard = att.guard
            now_time = timezone.localtime().time()
            start = guard.shift.start_time
            end = guard.shift.end_time
            is_live = (start <= now_time <= end) if start <= end else (now_time >= start or now_time <= end)
            if is_live:
                Guard.objects.filter(pk=guard.pk).update(is_on_duty=True)

        return Response(AttendanceSerializer(att).data)
    return Response(serializer.errors, status=400)
