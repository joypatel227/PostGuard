from rest_framework import serializers
from .models import Agency, Site, Guard


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Agency
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class SiteSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    guard_count = serializers.SerializerMethodField()

    class Meta:
        model  = Site
        fields = ['id', 'agency', 'agency_name', 'name', 'site_type', 'address',
                  'location_lat', 'location_lng', 'num_securities', 'is_active',
                  'bill_account_name', 'monthly_amount', 'guard_count', 'created_at']
        read_only_fields = ['id', 'agency_name', 'guard_count', 'created_at']

    def get_guard_count(self, obj):
        return obj.guards.filter(is_active=True).count()


class GuardSerializer(serializers.ModelSerializer):
    site_name   = serializers.CharField(source='site.name', read_only=True)
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    daily_rate  = serializers.FloatField(read_only=True)

    class Meta:
        model  = Guard
        fields = ['id', 'agency', 'agency_name', 'site', 'site_name', 'name',
                  'phone', 'address', 'monthly_salary', 'daily_rate',
                  'guard_type', 'is_active', 'is_on_duty', 'created_at']
        read_only_fields = ['id', 'agency_name', 'site_name', 'daily_rate', 'created_at']
