from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from company.models import Agency
from wallet.models import Wallet
from .models import InviteCode, JoinRequest
from .serializers import (
    LoginSerializer, UserSerializer, InviteCodeSerializer,
    UseCodeSerializer, JoinRequestSerializer, JoinRequestDetailSerializer,
)
from .utils import generate_otp, verify_otp

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


# ── Login ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    user = authenticate(request,
                        username=serializer.validated_data['email'],
                        password=serializer.validated_data['password'])
    if user is None:
        return Response({'detail': 'Invalid credentials.'}, status=401)
    if not user.is_active:
        return Response({'detail': 'Account disabled.'}, status=403)
    tokens = get_tokens_for_user(user)
    return Response({'tokens': tokens, 'user': UserSerializer(user).data})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def heartbeat_view(request):
    request.user.last_seen = timezone.now()
    request.user.save(update_fields=['last_seen'])
    return Response({'status': 'ok'})


# ── Me ───────────────────────────────────────────────────────────────────────

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    if request.method == 'PUT':
        user.name = request.data.get('name', user.name)
        user.email = request.data.get('email', user.email)
        user.phone = request.data.get('phone', user.phone)
        # Check uniqueness but simplistically
        if User.objects.exclude(pk=user.pk).filter(email=user.email).exists():
            return Response({'detail': 'Email already in use.'}, status=400)
        if User.objects.exclude(pk=user.pk).filter(phone=user.phone).exists():
            return Response({'detail': 'Phone already in use.'}, status=400)
        user.save()
        
    data = UserSerializer(user).data
    if user.role == 'guard':
        from company.models import Guard
        guard = Guard.objects.filter(phone=user.phone, is_active=True).first()
        if guard:
            data['guard_id'] = guard.id
    return Response(data)


# ── Lord Stats ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lord_stats_view(request):
    if request.user.role != 'lord':
        return Response({'detail': 'Not allowed.'}, status=403)
    
    from company.models import Guard, Site
    # Real-time Last Seen Heartbeat
    request.user.last_seen = timezone.now()
    request.user.save(update_fields=['last_seen'])
    
    # Core Counts
    user_count = User.objects.exclude(role='lord').count()
    active_users = User.objects.exclude(role='lord').filter(status='approved').count()
    guard_count = Guard.objects.count()
    site_count = Site.objects.count()
    
    total = user_count + guard_count + site_count
    agency_count = Agency.objects.count()
    
    # Calculate Live Users (seen in the last 2 minutes)
    two_mins_ago = timezone.now() - timezone.timedelta(minutes=2)
    live_now = User.objects.filter(last_seen__gte=two_mins_ago).count()

    # Generate 7-day trends (Cumulative)
    agencies_trend = []
    users_trend    = []
    live_trend     = []
    
    # Calculate Live Users details
    two_mins_ago = timezone.now() - timezone.timedelta(minutes=2)
    online_users = User.objects.filter(last_seen__gte=two_mins_ago)
    live_user_list = [
        {'id': u.id, 'name': u.name, 'role': u.role} 
        for u in online_users[:5] # Limit to 5 for the UI group
    ]

    for i in range(6, -1, -1):
        day = timezone.now() - timezone.timedelta(days=i)
        
        # Agencies Growth
        ag_at_day = Agency.objects.filter(created_at__lte=day).count()
        agencies_trend.append({'value': ag_at_day})
        
        # Network Growth (Users + Guards + Sites)
        us_at_day = User.objects.exclude(role='lord').filter(date_joined__lte=day).count()
        gd_at_day = Guard.objects.filter(created_at__lte=day).count()
        st_at_day = Site.objects.filter(created_at__lte=day).count()
        users_trend.append({'value': us_at_day + gd_at_day + st_at_day})

    return Response({
        'total_network': total,
        'agency_count': agency_count,
        'live_users': live_now,
        'live_user_list': live_user_list,
        'charts': {
            'agencies': agencies_trend,
            'users': users_trend
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_users_view(request):
    return Response(UserSerializer(request.user).data)


# ── Generate Invite Code ─────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_code_view(request):
    user = request.user
    role_map = {'lord': ['owner'], 'owner': ['admin', 'supervisor'], 'admin': ['supervisor']}
    if user.role not in role_map:
        return Response({'detail': 'Not allowed.'}, status=403)

    # Optional explicit role request, fallback to primary default
    requested_role = request.data.get('role')
    if requested_role:
        if requested_role not in role_map[user.role]:
            return Response({'detail': f'Not allowed to generate code for {requested_role}.'}, status=403)
        role_for = requested_role
    else:
        role_for = role_map[user.role][0]

    invite = InviteCode.objects.create(created_by=user, role_for=role_for)
    return Response(InviteCodeSerializer(invite).data, status=201)


# ── List Own Codes ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_codes_view(request):
    if request.user.role not in ['lord', 'owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    codes = InviteCode.objects.filter(created_by=request.user).order_by('-created_at')
    return Response(InviteCodeSerializer(codes, many=True).data)


# ── Delete Invite Code ────────────────────────────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_code_view(request, pk):
    try:
        invite = InviteCode.objects.get(pk=pk, created_by=request.user)
    except InviteCode.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    if not invite.is_valid():
        return Response({'detail': 'Only active codes can be deleted.'}, status=400)
    invite.delete()
    return Response({'detail': 'Deleted.'}, status=204)

# ── Validate Invite Code ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def validate_code_view(request):
    code_str = request.data.get('code', '').strip().upper()
    if not code_str:
        return Response({'detail': 'Code is required.'}, status=400)
    
    try:
        invite = InviteCode.objects.get(code=code_str)
    except InviteCode.DoesNotExist:
        return Response({'detail': 'Invalid invite code.'}, status=400)
        
    if not invite.is_valid():
        return Response({'detail': 'Code expired or already used.'}, status=400)
        
    return Response({
        'role_for': invite.role_for,
        'agency_name': invite.agency_name
    }, status=200)

# ── Create Owner Manually ─────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_owner_view(request):
    if request.user.role != 'lord':
        return Response({'detail': 'Not allowed.'}, status=403)
        
    data = request.data
    agency_id = data.get('agency_id')
    email = data.get('email')
    phone = data.get('phone', 'N/A')
    
    if User.objects.filter(email=email).exists():
        return Response({'detail': 'Email already registered.'}, status=400)
    if phone != 'N/A' and User.objects.filter(phone=phone).exists():
        return Response({'detail': 'Phone already registered.'}, status=400)
        
    try:
        agency = Agency.objects.get(id=agency_id)
    except Agency.DoesNotExist:
        return Response({'detail': 'Agency not found.'}, status=404)
        
    new_owner = User.objects.create_user(
        email=email,
        name=data.get('name'),
        phone=phone,
        password=data.get('password'),
        role='owner',
        status='approved',
        created_by=request.user,
        agency=agency
    )
    Wallet.objects.get_or_create(user=new_owner)
    
    return Response(UserSerializer(new_owner).data, status=201)



# ── Register with Invite Code ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def use_code_view(request):
    serializer = UseCodeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data     = serializer.validated_data
    code_str = data['code']

    try:
        invite = InviteCode.objects.get(code=code_str)
    except InviteCode.DoesNotExist:
        return Response({'detail': 'Invalid invite code.'}, status=400)

    if not invite.is_valid():
        return Response({'detail': 'Code expired or already used.'}, status=400)

    if User.objects.filter(email=data['email']).exists():
        return Response({'detail': 'Email already registered.'}, status=400)
    if User.objects.filter(phone=data['phone']).exists():
        return Response({'detail': 'Phone already registered.'}, status=400)

    # OTP verification
    otp_code = request.data.get('otp', '').strip()
    if not otp_code:
        return Response({'detail': 'OTP is required.'}, status=400)
    if not verify_otp(data['phone'], otp_code):
        return Response({'detail': 'Invalid or expired OTP.'}, status=400)

    # Resolve agency
    agency = None
    if invite.role_for == 'owner':
        agency_id = request.data.get('agency_id')
        if not agency_id:
            return Response({'detail': 'You must select an Agency to register as an Owner.'}, status=400)
        try:
            agency = Agency.objects.get(id=agency_id)
        except Agency.DoesNotExist:
            return Response({'detail': 'Selected Agency does not exist.'}, status=400)
    elif invite.created_by.agency:
        # Inherit agency from the creator (owner/admin)
        agency = invite.created_by.agency

    new_user = User.objects.create_user(
        email=data['email'], name=data['name'], phone=data['phone'],
        password=data['password'], role=invite.role_for,
        status='approved', created_by=invite.created_by, agency=agency,
    )

    # Create wallet for owner/admin/supervisor
    if new_user.role in ['owner', 'admin', 'supervisor']:
        Wallet.objects.get_or_create(user=new_user)

    invite.used    = True
    invite.used_by = new_user
    invite.save()

    tokens = get_tokens_for_user(new_user)
    return Response({'tokens': tokens, 'user': UserSerializer(new_user).data}, status=201)


# ── Join Request ──────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def join_request_view(request):
    serializer = JoinRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    data = serializer.validated_data
    if User.objects.filter(email=data['email']).exists():
        return Response({'detail': 'Email already registered.'}, status=400)
    if User.objects.filter(phone=data['phone']).exists():
        return Response({'detail': 'Phone already registered.'}, status=400)
    serializer.save()
    return Response(serializer.data, status=201)


# ── List Join Requests ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_join_requests_view(request):
    user = request.user
    role_filter = {'lord': ['owner'], 'owner': ['admin', 'supervisor'], 'admin': ['supervisor']}
    if user.role not in role_filter:
        return Response({'detail': 'Not allowed.'}, status=403)
        
    allowed_roles = role_filter[user.role]
    qs = JoinRequest.objects.filter(requested_role__in=allowed_roles)
    
    if user.role in ['owner', 'admin']:
        if user.agency:
            qs = qs.filter(agency=user.agency)
        else:
            qs = JoinRequest.objects.none()
    
    qs = qs.order_by('-created_at')
    return Response(JoinRequestDetailSerializer(qs, many=True).data)


# ── Approve Join Request ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_join_request_view(request, pk):
    user = request.user
    role_map = {'lord': ['owner'], 'owner': ['admin', 'supervisor'], 'admin': ['supervisor']}
    if user.role not in role_map:
        return Response({'detail': 'Not allowed.'}, status=403)

    try:
        join_req = JoinRequest.objects.get(pk=pk, status='pending')
    except JoinRequest.DoesNotExist:
        return Response({'detail': 'Not found or already processed.'}, status=404)

    if join_req.requested_role not in role_map[user.role]:
        return Response({'detail': 'Role scope mismatch.'}, status=403)

    if User.objects.filter(email=join_req.email).exists():
        return Response({'detail': 'Email already registered.'}, status=400)
    if User.objects.filter(phone=join_req.phone).exists():
        return Response({'detail': 'Phone already registered.'}, status=400)

    # Handle password
    temp_password = join_req.raw_password if join_req.raw_password else join_req.email.split('@')[0][:8]

    # Resolve agency
    agency = join_req.agency
    if not agency:
        # Fallback if no agency was selected in the form
        if join_req.requested_role == 'owner':
            agency_name = request.data.get('agency_name', join_req.name + ' Agency')
            agency, _ = Agency.objects.get_or_create(
                name=agency_name, defaults={'created_by': user}
            )
        elif user.agency:
            agency = user.agency

    new_user = User.objects.create_user(
        email=join_req.email, name=join_req.name, phone=join_req.phone,
        password=temp_password, role=join_req.requested_role,
        status='approved', created_by=user, agency=agency,
    )
    if new_user.role in ['owner', 'admin', 'supervisor']:
        Wallet.objects.get_or_create(user=new_user)

    join_req.status      = 'approved'
    join_req.reviewed_by = user
    join_req.save()

    return Response({
        'detail': 'Approved.',
        'user': UserSerializer(new_user).data,
        'temp_password': temp_password,
    })


# ── Reject Join Request ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_join_request_view(request, pk):
    user = request.user
    if user.role not in ['lord', 'owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    try:
        join_req = JoinRequest.objects.get(pk=pk, status='pending')
    except JoinRequest.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    join_req.status      = 'rejected'
    join_req.reviewed_by = user
    join_req.save()
    return Response({'detail': 'Rejected.'})


# ── List Users Under Me ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_users_view(request):
    user = request.user
    if user.role == 'lord':
        qs = User.objects.filter(role='owner')
    elif user.role == 'owner':
        qs = User.objects.filter(role='admin', agency=user.agency)
    elif user.role == 'admin':
        qs = User.objects.filter(role='supervisor', agency=user.agency)
    else:
        return Response({'detail': 'Not allowed.'}, status=403)
    return Response(UserSerializer(qs, many=True).data)


# ── OTP ───────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp_view(request):
    phone = request.data.get('phone', '').strip()
    if not phone:
        return Response({'detail': 'Phone is required.'}, status=400)
    otp = generate_otp(phone)
    return Response({'detail': 'OTP sent (check console).', 'otp': otp, 'phone': phone})

@api_view(['POST'])
@permission_classes([AllowAny])
def guard_send_otp_view(request):
    """Specific hook for guards to request OTP. Validates guard exists."""
    from company.models import Guard
    phone = request.data.get('phone', '').strip()
    if not phone:
        return Response({'detail': 'Phone is required.'}, status=400)
    
    if not Guard.objects.filter(phone=phone, is_active=True).exists():
        return Response({'detail': 'No active guard found with this phone number.'}, status=404)
        
    otp = generate_otp(phone)
    return Response({'detail': 'OTP sent (check console).', 'otp': otp, 'phone': phone})

@api_view(['POST'])
@permission_classes([AllowAny])
def guard_verify_otp_view(request):
    """Verifies OTP and returns JWT tokens for Guard."""
    from company.models import Guard
    phone = request.data.get('phone', '').strip()
    otp_input = request.data.get('otp', '').strip()
    
    if not phone or not otp_input:
        return Response({'detail': 'Phone and OTP are required.'}, status=400)
        
    if not verify_otp(phone, otp_input):
        return Response({'detail': 'Invalid or expired OTP.'}, status=400)
        
    try:
        guard = Guard.objects.get(phone=phone, is_active=True)
    except Guard.DoesNotExist:
        return Response({'detail': 'Guard not found.'}, status=404)
        
    # Get or create a User account for the guard to satisfy SimpleJWT
    guard_user, created = User.objects.get_or_create(
        phone=phone,
        defaults={
            'email': f"{phone}@guard.postguard.internal",
            'name': guard.name,
            'role': 'guard',
            'status': 'approved',
            'agency': guard.agency
        }
    )
    
    # Optional: Update tokens if agency or name changed
    if not created and (guard_user.name != guard.name or guard_user.agency != guard.agency):
        guard_user.name = guard.name
        guard_user.agency = guard.agency
        guard_user.save()
        
    tokens = get_tokens_for_user(guard_user)
    return Response({
        'detail': 'Login successful.',
        'tokens': tokens,
        'user': UserSerializer(guard_user).data,
        'guard_id': guard.id
    })


# ── Delete Account ────────────────────────────────────────────────────────────

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    request.user.delete()
    return Response(status=204)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user_view(request, pk):
    if request.user.role != 'lord':
        return Response({'detail': 'Not allowed.'}, status=403)
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
        
    target.delete()
    return Response(status=204)


# ── Owner Dashboard Stats ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def owner_stats_view(request):
    """Stats for owner/admin dashboard."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    agency = request.user.agency
    if not agency:
        return Response({'site_count': 0, 'guard_count': 0, 'guard_onduty': 0,
                        'supervisor_count': 0, 'admin_count': 0, 'agency_name': ''})
    from company.models import Site, Guard
    site_count       = Site.objects.filter(agency=agency).count()
    guard_count      = Guard.objects.filter(agency=agency).count()
    guard_onduty     = Guard.objects.filter(agency=agency, is_on_duty=True).count()
    supervisor_count = User.objects.filter(agency=agency, role='supervisor').count()
    admin_count      = User.objects.filter(agency=agency, role='admin').count()
    return Response({
        'site_count': site_count,
        'guard_count': guard_count,
        'guard_onduty': guard_onduty,
        'supervisor_count': supervisor_count,
        'admin_count': admin_count,
        'agency_name': agency.name,
        'agency_created_at': agency.created_at,
    })


# ── Agency Users ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agency_users_view(request):
    """List all admins/supervisors in the caller's agency."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    agency = request.user.agency
    if not agency:
        return Response([])
    role_filter = request.query_params.get('role')
    qs = User.objects.filter(agency=agency).exclude(role__in=['lord', 'owner'])
    if role_filter:
        qs = qs.filter(role=role_filter)
    return Response(UserSerializer(qs, many=True).data)


# ── Create Agency User ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_agency_user_view(request):
    """Owner can create admins/supervisors. Admin can create supervisors."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    agency = request.user.agency
    if not agency:
        return Response({'detail': 'No agency linked to your account.'}, status=400)
        
    data  = request.data
    role  = data.get('role', 'supervisor')
    
    if role == 'admin' and request.user.role != 'owner':
        return Response({'detail': 'Only owners can create admins.'}, status=403)
        
    if role == 'client' and request.user.role != 'owner':
        return Response({'detail': 'Only owners can create clients.'}, status=403)
        
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    if not email:
        return Response({'detail': 'Email is required.'}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({'detail': 'Email already registered.'}, status=400)
    if phone and User.objects.filter(phone=phone).exists():
        return Response({'detail': 'Phone already registered.'}, status=400)
        
    new_user = User.objects.create_user(
        email=email,
        name=data.get('name', ''),
        phone=phone or f'u_{email.split("@")[0][:8]}',
        password=data.get('password', email.split('@')[0]),
        role=role,
        status='approved',
        created_by=request.user,
        agency=agency,
    )
    Wallet.objects.get_or_create(user=new_user)
    return Response(UserSerializer(new_user).data, status=201)


# ── Delete Agency User ────────────────────────────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_agency_user_view(request, pk):
    """Owner can delete admins/supervisors from their agency."""
    if request.user.role not in ['owner', 'admin']:
        return Response({'detail': 'Not allowed.'}, status=403)
    try:
        target = User.objects.get(pk=pk, agency=request.user.agency)
    except User.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    if target.role in ['lord', 'owner']:
        return Response({'detail': 'Cannot delete owner or lord.'}, status=403)
    # Admin can only delete supervisors
    if request.user.role == 'admin' and target.role != 'supervisor':
        return Response({'detail': 'Not allowed.'}, status=403)
    target.delete()
    return Response(status=204)
