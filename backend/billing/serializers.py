from rest_framework import serializers
from .models import BankAccount, Bill, Payment


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BankAccount
        fields = ['id', 'agency', 'account_name', 'bank_name', 'account_no',
                  'ifsc', 'upi_id', 'is_default', 'balance', 'transaction_limit', 'created_at']
        read_only_fields = ['id', 'agency', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    bill_details = serializers.SerializerMethodField()
    verified_by_details = serializers.SerializerMethodField()
    screenshot_url = serializers.SerializerMethodField()

    class Meta:
        model  = Payment
        fields = ['id', 'bill', 'bill_details', 'amount_paid', 'paid_at', 'screenshot',
                  'screenshot_url', 'via_bank_account', 'status', 'verified_by',
                  'verified_by_details', 'notes', 'created_at']
        read_only_fields = ['id', 'verified_by', 'created_at', 'bill_details',
                            'verified_by_details', 'screenshot_url']

    def get_bill_details(self, obj):
        try:
            b = obj.bill
            return {
                'id':         b.id,
                'site':       b.site_id,
                'site_name':  b.site.name if b.site else 'Unknown',
                'bill_type':  b.bill_type,
                'amount':     float(b.amount),
                'remaining':  float(b.remaining),
                'bill_month': b.bill_month,
                'bill_year':  b.bill_year,
            }
        except Exception:
            return None

    def get_verified_by_details(self, obj):
        if obj.verified_by:
            return {'id': obj.verified_by.id, 'name': obj.verified_by.name}
        return None

    def get_screenshot_url(self, obj):
        if obj.screenshot:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.screenshot.url)
            # Fallback: build full URL manually
            return f'http://localhost:8000{obj.screenshot.url}'
        return None


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
        read_only_fields = ['id', 'agency', 'site_name', 'agency_name', 'bank_account_name',
                            'payments', 'total_paid', 'created_at']

    def get_total_paid(self, obj):
        return sum(p.amount_paid for p in obj.payments.filter(status='verified'))
