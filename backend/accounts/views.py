from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import InviteCode, JoinRequest
from .serializers import (
    LoginSerializer,
    UserSerializer,
    InviteCodeSerializer,
    UseCodeSerializer,
    JoinRequestSerializer,
    JoinRequestDetailSerializer,
)
from .utils import generate_otp, verify_otp

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ─── Login ───────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    password = serializer.validated_data["password"]
    user = authenticate(request, username=email, password=password)

    if user is None:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN)

    tokens = get_tokens_for_user(user)
    return Response({
        "tokens": tokens,
        "user": UserSerializer(user).data,
    })


# ─── Current User ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


# ─── Generate Invite Code ─────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_code_view(request):
    user = request.user

    # Lord generates admin codes; Admin generates supervisor codes
    if user.role == "lord":
        role_for = "admin"
    elif user.role == "admin":
        role_for = "supervisor"
    else:
        return Response(
            {"detail": "Only lords and admins can generate invite codes."},
            status=status.HTTP_403_FORBIDDEN,
        )

    invite = InviteCode.objects.create(created_by=user, role_for=role_for)
    return Response(InviteCodeSerializer(invite).data, status=status.HTTP_201_CREATED)


# ─── List Own Codes ───────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_codes_view(request):
    user = request.user
    if user.role not in ["lord", "admin"]:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
    codes = InviteCode.objects.filter(created_by=user).order_by("-created_at")
    return Response(InviteCodeSerializer(codes, many=True).data)


# ─── Use Invite Code (register) ───────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def use_code_view(request):
    serializer = UseCodeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    code_str = data["code"]

    try:
        invite = InviteCode.objects.get(code=code_str)
    except InviteCode.DoesNotExist:
        return Response({"detail": "Invalid invite code."}, status=status.HTTP_400_BAD_REQUEST)

    if not invite.is_valid():
        return Response(
            {"detail": "This code has already been used or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate duplicate email/phone
    if User.objects.filter(email=data["email"]).exists():
        return Response({"detail": "An account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(phone=data["phone"]).exists():
        return Response({"detail": "An account with this phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)

    # Verify OTP
    otp_code = request.data.get("otp")
    if not otp_code or not verify_otp(data["phone"], otp_code):
        return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

    # Create the user
    new_user = User.objects.create_user(
        email=data["email"],
        name=data["name"],
        phone=data["phone"],
        password=data["password"],
        role=invite.role_for,
        status="approved",
        created_by=invite.created_by,
    )

    # Mark code as used
    invite.used = True
    invite.used_by = new_user
    invite.save()

    tokens = get_tokens_for_user(new_user)
    return Response(
        {"tokens": tokens, "user": UserSerializer(new_user).data},
        status=status.HTTP_201_CREATED,
    )


# ─── Join Request (raise request) ─────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def join_request_view(request):
    serializer = JoinRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    if User.objects.filter(email=data["email"]).exists():
        return Response({"detail": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(phone=data["phone"]).exists():
        return Response({"detail": "Phone already registered."}, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Delete Account ───────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    user = request.user
    user.delete()
    return Response({"detail": "Account deleted successfully."}, status=status.HTTP_200_OK)


# ─── Delete Invite Code ───────────────────────────────────────────────────────

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_code_view(request, pk):
    user = request.user
    try:
        invite = InviteCode.objects.get(pk=pk, created_by=user)
    except InviteCode.DoesNotExist:
        return Response({"detail": "Code not found."}, status=status.HTTP_404_NOT_FOUND)

    if not invite.is_valid():
        return Response({"detail": "Only active/unused codes can be deleted."}, status=status.HTTP_400_BAD_REQUEST)

    invite.delete()
    return Response({"detail": "Code deleted."}, status=status.HTTP_204_NO_CONTENT)


# ─── Send OTP ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp_view(request):
    phone = request.data.get("phone")
    if not phone:
        return Response({"detail": "Phone is required."}, status=status.HTTP_400_BAD_REQUEST)
    
    generate_otp(phone)
    return Response({"detail": "OTP sent successfully."})


# ─── List Pending Requests ────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_join_requests_view(request):
    user = request.user
    if user.role == "lord":
        # Lord sees all admin join requests
        qs = JoinRequest.objects.filter(requested_role="admin").order_by("-created_at")
    elif user.role == "admin":
        # Admin sees all supervisor join requests
        qs = JoinRequest.objects.filter(requested_role="supervisor").order_by("-created_at")
    else:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

    return Response(JoinRequestDetailSerializer(qs, many=True).data)


# ─── Approve Join Request ─────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_join_request_view(request, pk):
    user = request.user
    if user.role not in ["lord", "admin"]:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

    try:
        join_req = JoinRequest.objects.get(pk=pk, status="pending")
    except JoinRequest.DoesNotExist:
        return Response(
            {"detail": "Request not found or already processed."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Validate scope
    if user.role == "lord" and join_req.requested_role != "admin":
        return Response({"detail": "Lords approve admin requests only."}, status=status.HTTP_403_FORBIDDEN)
    if user.role == "admin" and join_req.requested_role != "supervisor":
        return Response({"detail": "Admins approve supervisor requests only."}, status=status.HTTP_403_FORBIDDEN)

    # Check unique email/phone
    if User.objects.filter(email=join_req.email).exists():
        return Response({"detail": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(phone=join_req.phone).exists():
        return Response({"detail": "Phone already registered."}, status=status.HTTP_400_BAD_REQUEST)

    # Create user with temp password = first 8 chars of email
    temp_password = join_req.email.split("@")[0][:8]
    new_user = User.objects.create_user(
        email=join_req.email,
        name=join_req.name,
        phone=join_req.phone,
        password=temp_password,
        role=join_req.requested_role,
        status="approved",
        created_by=user,
    )

    join_req.status = "approved"
    join_req.reviewed_by = user
    join_req.save()

    return Response({
        "detail": "Request approved. User account created.",
        "user": UserSerializer(new_user).data,
        "temp_password": temp_password,
    })


# ─── Reject Join Request ──────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_join_request_view(request, pk):
    user = request.user
    if user.role not in ["lord", "admin"]:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

    try:
        join_req = JoinRequest.objects.get(pk=pk, status="pending")
    except JoinRequest.DoesNotExist:
        return Response(
            {"detail": "Request not found or already processed."},
            status=status.HTTP_404_NOT_FOUND,
        )

    join_req.status = "rejected"
    join_req.reviewed_by = user
    join_req.save()

    return Response({"detail": "Request rejected."})


# ─── List Users Under Me ──────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_users_view(request):
    user = request.user
    if user.role == "lord":
        qs = User.objects.filter(role="admin").order_by("name")
    elif user.role == "admin":
        qs = User.objects.filter(role="supervisor", created_by=user).order_by("name")
    else:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
    return Response(UserSerializer(qs, many=True).data)
