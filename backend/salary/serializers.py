from rest_framework import serializers
from .models import SalaryRecord


class SalaryRecordSerializer(serializers.ModelSerializer):
    guard_name   = serializers.CharField(source='guard.name', read_only=True)
    site_name    = serializers.CharField(source='guard.site.name', read_only=True, default='')
    paid_by_name = serializers.CharField(source='paid_by.name', read_only=True, default='')
    from_bank_name = serializers.CharField(source='from_bank.account_name', read_only=True, default='')

    class Meta:
        model  = SalaryRecord
        fields = ['id', 'guard', 'guard_name', 'site_name', 'month', 'year',
                  'total_days', 'days_present', 'days_absent', 'days_half',
                  'monthly_salary', 'daily_rate', 'amount_earned',
                  'advance_given', 'amount_paid', 'amount_remaining',
                  'paid_at', 'payment_mode', 'from_bank', 'from_bank_name',
                  'to_account_details', 'paid_by', 'paid_by_name',
                  'notes', 'created_at']
        read_only_fields = ['id', 'guard_name', 'site_name', 'paid_by_name',
                            'from_bank_name', 'total_days', 'days_present',
                            'days_absent', 'days_half', 'monthly_salary',
                            'daily_rate', 'amount_earned', 'created_at']
