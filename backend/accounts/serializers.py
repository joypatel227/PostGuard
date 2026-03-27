from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import InviteCode, JoinRequest

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "phone", "role", "status", "date_joined"]
        read_only_fields = fields


class InviteCodeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

    class Meta:
        model = InviteCode
        fields = ["id", "code", "role_for", "created_by_name", "used", "expires_at", "created_at"]
        read_only_fields = fields


class UseCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6, min_length=6)
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_code(self, value):
        return value.upper()

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return value


class JoinRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = JoinRequest
        fields = [
            "id", "name", "email", "phone", "requested_role",
            "message", "status", "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def validate_requested_role(self, value):
        if value not in ["admin", "supervisor"]:
            raise serializers.ValidationError("Role must be 'admin' or 'supervisor'.")
        return value


class JoinRequestDetailSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source="reviewed_by.name", read_only=True)

    class Meta:
        model = JoinRequest
        fields = [
            "id", "name", "email", "phone", "requested_role",
            "message", "status", "reviewed_by_name", "created_at", "updated_at",
        ]
        read_only_fields = fields
