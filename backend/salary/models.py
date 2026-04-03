import calendar
from django.db import models


class SalaryRecord(models.Model):
    """Monthly salary record for a guard."""
    PAYMENT_MODE_CHOICES = [
        ("online",  "Online Transfer"),
        ("offline", "Cash / Offline"),
    ]

    guard           = models.ForeignKey("company.Guard", on_delete=models.CASCADE, related_name="salary_records")
    month           = models.PositiveIntegerField()   # 1-12
    year            = models.PositiveIntegerField()
    total_days      = models.PositiveIntegerField()   # days in that month (28/29/30/31)
    days_present    = models.PositiveIntegerField(default=0)
    days_absent     = models.PositiveIntegerField(default=0)
    days_half       = models.PositiveIntegerField(default=0)

    monthly_salary  = models.DecimalField(max_digits=10, decimal_places=2)  # snapshot at time of calc
    daily_rate      = models.DecimalField(max_digits=10, decimal_places=2)
    amount_earned   = models.DecimalField(max_digits=10, decimal_places=2)  # computed

    # Advance already given via wallet
    advance_given   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_paid     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_remaining = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    paid_at         = models.DateField(null=True, blank=True)
    payment_mode    = models.CharField(max_length=10, choices=PAYMENT_MODE_CHOICES, null=True, blank=True)
    from_bank       = models.ForeignKey(
        "billing.BankAccount", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="salary_payments"
    )
    to_account_details = models.TextField(blank=True)  # guard's bank/UPI details
    paid_by         = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="salary_paid"
    )
    notes           = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("guard", "month", "year")
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"{self.guard.name} — {self.month}/{self.year} ₹{self.amount_earned}"

    @classmethod
    def compute_for_guard(cls, guard, month, year):
        """Calculate and return (or update) the salary record for a guard/month."""
        from attendance.models import GuardAttendance
        total_days  = calendar.monthrange(year, month)[1]
        attendances = GuardAttendance.objects.filter(
            guard=guard, date__month=month, date__year=year
        )
        days_present = attendances.filter(status="present").count()
        days_half    = attendances.filter(status="half").count()
        days_absent  = total_days - days_present - days_half

        daily_rate    = round(float(guard.monthly_salary) / total_days, 2)
        amount_earned = round(daily_rate * (days_present + days_half * 0.5), 2)

        record, _ = cls.objects.get_or_create(
            guard=guard, month=month, year=year,
            defaults={"total_days": total_days, "monthly_salary": guard.monthly_salary,
                      "daily_rate": daily_rate}
        )
        record.total_days     = total_days
        record.days_present   = days_present
        record.days_half      = days_half
        record.days_absent    = max(0, days_absent)
        record.monthly_salary = guard.monthly_salary
        record.daily_rate     = daily_rate
        record.amount_earned  = amount_earned
        record.amount_remaining = max(0, amount_earned - record.advance_given - record.amount_paid)
        record.save()
        return record
