from rest_framework import serializers
from .models import BankAccount, Bill, Payment


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BankAccount
        fields = ['id', 'agency', 'account_name', 'bank_name', 'account_no',
                  'ifsc', 'upi_id', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Payment
        fields = ['id', 'bill', 'amount_paid', 'paid_at', 'screenshot',
                  'via_bank_account', 'status', 'verified_by', 'notes', 'created_at']
        read_only_fields = ['id', 'verified_by', 'created_at']


class BillSerializer(serializers.ModelSerializer):
    site_name        = serializers.CharField(source='site.name', read_only=True)
    agency_name      = serializers.CharField(source='agency.name', read_only=True)
    bank_account_name = serializers.CharField(source='bank_account.account_name', read_only=True, default='')
    payments         = PaymentSerializer(many=True, read_only=True)
    total_paid       = serializers.SerializerMethodField()

    class Meta:
        model  = Bill
        fields = ['id', 'site', 'site_name', 'agency', 'agency_name',
                  'bank_account', 'bank_account_name', 'bill_type', 'amount',
                  'remaining', 'bill_month', 'bill_year', 'bill_date', 'due_date',
                  'gst_number', 'gst_percent', 'bill_file', 'auto_send',
                  'auto_send_day', 'sent_at', 'created_at', 'payments', 'total_paid']
        read_only_fields = ['id', 'site_name', 'agency_name', 'bank_account_name',
                            'payments', 'total_paid', 'created_at']

    def get_total_paid(self, obj):
        return sum(p.amount_paid for p in obj.payments.filter(status='verified'))
