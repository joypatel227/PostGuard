from rest_framework import serializers
from .models import Agency, Site, Guard, SiteShift, Attendance, DailyWage


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Agency
        fields = ['id', 'name', 'gstin', 'pan_number', 'invoice_prefix', 'created_at']
        read_only_fields = ['id', 'created_at']


class SiteShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SiteShift
        fields = ['id', 'site', 'name', 'start_time', 'end_time', 'created_at']
        read_only_fields = ['id', 'site', 'created_at']


class SiteSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    client_user_name = serializers.CharField(source='client_user.name', read_only=True, allow_null=True)
    guard_count = serializers.SerializerMethodField()
    shifts      = SiteShiftSerializer(many=True, read_only=True)

    class Meta:
        model  = Site
        fields = ['id', 'agency', 'agency_name', 'name', 'site_type', 'address',
                  'location_lat', 'location_lng', 'num_securities', 'is_active',
                  'invoice_format', 'client_user', 'client_user_name', 'bill_account_name', 'client_account_name', 'client_gstin', 'monthly_amount', 'guard_count', 'shifts', 'created_at']
        read_only_fields = ['id', 'agency', 'agency_name', 'guard_count', 'created_at']

    def get_guard_count(self, obj):
        return obj.guards.filter(is_active=True).count()


class GuardSerializer(serializers.ModelSerializer):
    site_name   = serializers.CharField(source='site.name', read_only=True)
    shift_name  = serializers.CharField(source='shift.name', read_only=True)
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    daily_rate  = serializers.FloatField(read_only=True)
    today_attendance = serializers.SerializerMethodField()
    all_today_attendances = serializers.SerializerMethodField()
    is_scheduled_on_duty = serializers.SerializerMethodField()
    remaining_salary = serializers.SerializerMethodField()
    amount_earned_month = serializers.SerializerMethodField()
    amount_paid_month = serializers.SerializerMethodField()
    shift_start_time = serializers.CharField(source='shift.start_time', read_only=True, default=None)
    shift_end_time   = serializers.CharField(source='shift.end_time', read_only=True, default=None)
    days_present_month = serializers.SerializerMethodField()

    class Meta:
        model  = Guard
        fields = ['id', 'agency', 'agency_name', 'site', 'site_name', 'shift', 'shift_name',
                  'shift_start_time', 'shift_end_time',
                  'name', 'phone', 'address', 
                  'bank_name', 'account_no', 'ifsc_code', 'upi_id',
                  'monthly_salary', 'advance_paid', 'remaining_salary',
                  'amount_earned_month', 'amount_paid_month',
                  'daily_rate', 'days_present_month',
                  'guard_type', 'is_active', 'is_on_duty', 'is_scheduled_on_duty',
                  'today_attendance', 'all_today_attendances', 'created_at']
        read_only_fields = ['id', 'agency', 'agency_name', 'site_name', 'shift_name', 'shift_start_time',
                            'shift_end_time', 'daily_rate', 'remaining_salary', 'days_present_month', 'created_at']

    def get_remaining_salary(self, obj):
        # This is a fallback; usually we look at the SalaryRecord
        return max(0, float(obj.monthly_salary) - float(obj.advance_paid))

    def get_amount_earned_month(self, obj):
        from salary.models import SalaryRecord
        from django.utils import timezone
        today = timezone.localdate()
        rec = SalaryRecord.compute_for_guard(obj, today.month, today.year)
        return float(rec.amount_earned)

    def get_amount_paid_month(self, obj):
        from salary.models import SalaryRecord
        from django.utils import timezone
        today = timezone.localdate()
        rec = SalaryRecord.compute_for_guard(obj, today.month, today.year)
        return float(rec.amount_paid)

    def get_days_present_month(self, obj):
        """Count present/late days this calendar month for salary calculation."""
        from django.utils import timezone
        import datetime
        today = timezone.localdate()
        first_day = today.replace(day=1)
        return obj.attendance_records.filter(
            date__gte=first_day, date__lte=today,
            status__in=['present', 'late']
        ).count()

    def get_is_scheduled_on_duty(self, obj):
        if not obj.site or not obj.shift:
            return False
        from django.utils import timezone
        now = timezone.localtime().time()
        start = obj.shift.start_time
        end = obj.shift.end_time
        if start <= end:
            return start <= now <= end
        else:  # Overnight
            return now >= start or now <= end

    def get_today_attendance(self, obj):
        """Returns the PRIMARY shift attendance for today (backward compatible)."""
        from django.utils import timezone
        import datetime
        today = timezone.localdate()
        acting_date = today
        
        if obj.site and obj.shift:
            start = obj.shift.start_time
            end = obj.shift.end_time
            now_time = timezone.localtime().time()
            if end < start and now_time <= end:
                acting_date = today - datetime.timedelta(days=1)

        # Get primary (non-overtime) record first, fall back to any
        att = obj.attendance_records.filter(date=acting_date, is_overtime=False).first()
        if not att:
            att = obj.attendance_records.filter(date=acting_date, shift=obj.shift).first()

        # Auto-presence logic for live shift
        if not att and obj.site and obj.shift:
            now = timezone.localtime().time()
            start = obj.shift.start_time
            end = obj.shift.end_time
            is_live = (start <= now <= end) if start <= end else (now >= start or now <= end)
            if is_live:
                try:
                    att = obj.attendance_records.create(
                        date=acting_date,
                        agency=obj.agency,
                        site=obj.site,
                        shift=obj.shift,
                        status='present',
                        check_in=timezone.now(),
                        notes='Auto-marked present (shift is live, guard assigned)'
                    )
                    if obj.guard_type == 'temporary':
                        DailyWage.objects.get_or_create(
                            agency=obj.agency, guard=obj, site=obj.site, date=acting_date,
                            defaults={'amount': obj.daily_rate, 'notes': f'Auto daily wage — {obj.shift.name} shift'}
                        )
                    obj.__class__.objects.filter(pk=obj.pk).update(is_on_duty=True)
                except Exception:
                    pass

        if att:
            return AttendanceSerializer(att).data
        return None

    def get_all_today_attendances(self, obj):
        """Returns ALL attendance records for today (primary + overtime shifts)."""
        from django.utils import timezone
        import datetime
        today = timezone.localdate()
        acting_date = today
        if obj.site and obj.shift:
            start = obj.shift.start_time
            end = obj.shift.end_time
            now_time = timezone.localtime().time()
            if end < start and now_time <= end:
                acting_date = today - datetime.timedelta(days=1)
        records = obj.attendance_records.filter(date=acting_date).select_related('shift', 'site')
        return AttendanceSerializer(records, many=True).data


class AttendanceSerializer(serializers.ModelSerializer):
    guard_name = serializers.CharField(source='guard.name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True, allow_null=True)
    site_name  = serializers.CharField(source='site.name', read_only=True, allow_null=True)
    class Meta:
        model  = Attendance
        fields = ['id', 'agency', 'guard', 'guard_name', 'site', 'site_name', 'shift', 'shift_name', 'date', 'check_in', 'check_out', 'status', 'is_overtime', 'notes']
        read_only_fields = ['id', 'agency']


class DailyWageSerializer(serializers.ModelSerializer):
    guard_name = serializers.CharField(source='guard.name', read_only=True)
    site_name  = serializers.CharField(source='site.name', read_only=True)
    
    class Meta:
        model  = DailyWage
        fields = ['id', 'agency', 'guard', 'guard_name', 'site', 'site_name', 'date', 'amount', 'is_paid', 'notes', 'created_at']
        read_only_fields = ['id', 'agency', 'guard_name', 'site_name', 'created_at']
