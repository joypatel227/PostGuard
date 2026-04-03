from rest_framework import serializers
from .models import AdminAttendance, SupervisorAttendance, GuardAttendance


class AdminAttendanceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model  = AdminAttendance
        fields = ['id', 'user', 'user_name', 'date', 'clock_in', 'clock_out',
                  'source', 'notes', 'created_at']
        read_only_fields = ['id', 'user_name', 'created_at']


class SupervisorAttendanceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = SupervisorAttendance
        fields = ['id', 'user', 'user_name', 'date', 'image', 'location_lat',
                  'location_lng', 'status', 'status_display', 'notes', 'created_at']
        read_only_fields = ['id', 'user_name', 'status_display', 'created_at']


class GuardAttendanceSerializer(serializers.ModelSerializer):
    guard_name = serializers.CharField(source='guard.name', read_only=True)
    site_name  = serializers.CharField(source='guard.site.name', read_only=True)

    class Meta:
        model  = GuardAttendance
        fields = ['id', 'guard', 'guard_name', 'site_name', 'date', 'status',
                  'source', 'image', 'location_lat', 'location_lng', 'marked_by',
                  'notes', 'created_at']
        read_only_fields = ['id', 'guard_name', 'site_name', 'created_at']
