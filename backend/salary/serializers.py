from rest_framework import serializers
from django.utils import timezone
from .models import SalaryRecord


class SalaryRecordSerializer(serializers.ModelSerializer):
    guard_name     = serializers.CharField(source='guard.name', read_only=True)
    guard_phone    = serializers.CharField(source='guard.phone', read_only=True, default='')
    site_name      = serializers.CharField(source='guard.site.name', read_only=True, default='')
    paid_by_name   = serializers.CharField(source='paid_by.name', read_only=True, default='')
    from_bank_name = serializers.CharField(source='from_bank.account_name', read_only=True, default='')
    guard_site_id  = serializers.IntegerField(source='guard.site_id', read_only=True, allow_null=True)

    # Computed fields
    total_due            = serializers.SerializerMethodField()
    running_salary_due   = serializers.SerializerMethodField()  # earned since last paid → today
    running_days         = serializers.SerializerMethodField()  # attendance days since last paid
    days_since_last_paid = serializers.SerializerMethodField()  # calendar days since last paid
    running_remaining    = serializers.SerializerMethodField()  # running_salary_due - amount_paid
    last_payment_amount  = serializers.SerializerMethodField()  # amount of last bank transaction only

    class Meta:
        model  = SalaryRecord
        fields = [
            'id', 'guard', 'guard_name', 'guard_phone', 'site_name', 'guard_site_id',
            'month', 'year', 'total_days', 'days_present', 'days_absent', 'days_half',
            'monthly_salary', 'daily_rate', 'amount_earned',
            'advance_given', 'amount_paid', 'amount_remaining',
            'total_due', 'running_salary_due', 'running_days',
            'days_since_last_paid', 'running_remaining', 'last_payment_amount',
            'paid_at', 'payment_mode', 'from_bank', 'from_bank_name',
            'to_account_details', 'paid_by', 'paid_by_name',
            'notes', 'created_at',
        ]
        read_only_fields = [
            'id', 'guard_name', 'guard_phone', 'site_name', 'paid_by_name',
            'from_bank_name', 'total_days', 'days_present', 'days_absent',
            'days_half', 'monthly_salary', 'daily_rate', 'amount_earned', 'created_at',
        ]

    # ── helpers ──────────────────────────────────────────────────────────────

    def get_last_payment_amount(self, obj):
        """Return the precise amount of the most recent mapped payment log."""
        from .models import SalaryPaymentLog
        log = SalaryPaymentLog.objects.filter(
            salary_record=obj,
        ).order_by('-created_at').first()
        return float(log.amount) if log else 0.0

    def get_total_due(self, obj):
        """Lifetime unpaid remaining across all months for this guard."""
        from django.db.models import Sum
        return float(
            SalaryRecord.objects.filter(guard=obj.guard)
            .aggregate(t=Sum('amount_remaining'))['t'] or 0
        )

    def _running_data(self, obj):
        """
        Calculate attendance count and earned amount from
        (last paid date + 1 day)  →  today  for the record's month/year.
        """
        from company.models import Attendance
        today = timezone.now().date()
        month, year = obj.month, obj.year
        daily_rate = float(obj.daily_rate)

        atts_qs = Attendance.objects.filter(
            guard=obj.guard,
            date__month=month,
            date__year=year,
            is_overtime=False,
            status__in=['present', 'late'],
        )

        last_paid = obj.paid_at
        if last_paid:
            atts_qs = atts_qs.filter(date__gt=last_paid, date__lte=today)
        else:
            atts_qs = atts_qs.filter(date__lte=today)

        running_days = atts_qs.count()
        running_salary_due = round(daily_rate * running_days, 2)
        return running_days, running_salary_due

    def get_running_days(self, obj):
        return self._running_data(obj)[0]

    def get_running_salary_due(self, obj):
        return self._running_data(obj)[1]

    def _running_earned_up_to_today(self, obj):
        from company.models import Attendance
        today = timezone.now().date()
        daily_rate = float(obj.daily_rate)
        atts_qs = Attendance.objects.filter(
            guard=obj.guard,
            date__month=obj.month,
            date__year=obj.year,
            date__lte=today,
            is_overtime=False,
            status__in=['present', 'late'],
        )
        return round(daily_rate * atts_qs.count(), 2)

    def get_running_remaining(self, obj):
        """Net payable right now: Total earned this month up to today MINUS paid/advance."""
        earned_today = self._running_earned_up_to_today(obj)
        return round(earned_today - float(obj.advance_given) - float(obj.amount_paid), 2)

    def get_days_since_last_paid(self, obj):
        """Calendar days since the last payment date (or since month start)."""
        from datetime import date
        import calendar as cal
        today = timezone.now().date()
        if obj.paid_at:
            return (today - obj.paid_at).days
        # default: days elapsed since first day of record's month
        first_day = date(obj.year, obj.month, 1)
        return (today - first_day).days + 1
