from rest_framework import serializers
from .models import SiteVisit, Followup, FuelStop, SupervisorLocation


class SiteVisitSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.name', read_only=True)
    site_name       = serializers.CharField(source='site.name', read_only=True)
    site_lat        = serializers.DecimalField(source='site.location_lat', max_digits=10, decimal_places=7, read_only=True)
    site_lng        = serializers.DecimalField(source='site.location_lng', max_digits=10, decimal_places=7, read_only=True)
    followup_count  = serializers.SerializerMethodField()

    class Meta:
        model  = SiteVisit
        fields = ['id', 'supervisor', 'supervisor_name', 'site', 'site_name',
                  'site_lat', 'site_lng', 'assigned_date', 'status',
                  'depart_time', 'arrive_time', 'complete_time',
                  'eta_minutes', 'distance_km', 'points_earned',
                  'notes', 'followup_count', 'created_at']
        read_only_fields = ['id', 'supervisor_name', 'site_name', 'site_lat',
                            'site_lng', 'followup_count', 'created_at']

    def get_followup_count(self, obj):
        return obj.followups.count()


class FollowupSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Followup
        fields = ['id', 'site_visit', 'followup_type', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class FuelStopSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.name', read_only=True)

    class Meta:
        model  = FuelStop
        fields = ['id', 'supervisor', 'supervisor_name', 'location_lat',
                  'location_lng', 'location_name', 'amount', 'timestamp', 'notes']
        read_only_fields = ['id', 'supervisor_name', 'timestamp']


class SupervisorLocationSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.name', read_only=True)

    class Meta:
        model  = SupervisorLocation
        fields = ['id', 'supervisor', 'supervisor_name', 'lat', 'lng',
                  'is_on_duty', 'updated_at']
        read_only_fields = ['id', 'supervisor_name', 'updated_at']
