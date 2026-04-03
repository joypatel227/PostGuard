from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import InviteCode, JoinRequest

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='agency.name', read_only=True, default='')

    class Meta:
        model  = User
        fields = ['id', 'email', 'name', 'phone', 'role', 'status',
                  'agency', 'agency_name', 'date_joined', 'last_seen']
        read_only_fields = fields


class InviteCodeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model  = InviteCode
        fields = ['id', 'code', 'role_for', 'agency_name', 'created_by_name',
                  'used', 'expires_at', 'created_at']
        read_only_fields = fields


class UseCodeSerializer(serializers.Serializer):
    code     = serializers.CharField(max_length=6, min_length=6)
    name     = serializers.CharField(max_length=100)
    email    = serializers.EmailField()
    phone    = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_code(self, value):
        return value.upper()


class JoinRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model  = JoinRequest
        fields = ['id', 'name', 'email', 'phone', 'requested_role', 'agency', 'raw_password',
                  'message', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']
        extra_kwargs = {'raw_password': {'write_only': True}}

    def validate_requested_role(self, value):
        if value not in ['owner', 'admin', 'supervisor']:
            raise serializers.ValidationError("Invalid role.")
        return value


class JoinRequestDetailSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source='reviewed_by.name', read_only=True)
    agency_name = serializers.CharField(source='agency.name', read_only=True, default='')

    class Meta:
        model  = JoinRequest
        fields = ['id', 'name', 'email', 'phone', 'requested_role', 'agency_name',
                  'message', 'status', 'reviewed_by_name', 'created_at', 'updated_at']
        read_only_fields = fields
