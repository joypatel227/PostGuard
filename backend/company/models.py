from django.db import models
from django.utils import timezone


class Agency(models.Model):
    """Security agency that purchased PostGuard."""
    name       = models.CharField(max_length=150, unique=True)
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="created_agencies"
    )
    gstin          = models.CharField(max_length=15, blank=True)
    pan_number     = models.CharField(max_length=10, blank=True)
    invoice_prefix = models.CharField(max_length=20, default="2026-27/")
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Agencies"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Site(models.Model):
    """A physical security site (client location)."""
    SITE_TYPE_CHOICES = [
        ("flat",     "Flat / Residential Complex"),
        ("bunglow",  "Bunglow / Villa"),
        ("company",  "Company / Commercial"),
        ("other",    "Other"),
    ]

    agency       = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="sites")
    name         = models.CharField(max_length=150)
    site_type    = models.CharField(max_length=20, choices=SITE_TYPE_CHOICES, default="company")
    address      = models.TextField(blank=True)
    location_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    num_securities = models.PositiveIntegerField(default=0)
    is_active    = models.BooleanField(default=True)

    # Bill / payment settings (stored per-site, edited by owner)
    INVOICE_FORMAT_CHOICES = [
        ('normal', 'Normal Invoice'),
        ('gst',    'GST Invoice'),
    ]
    invoice_format    = models.CharField(max_length=10, choices=INVOICE_FORMAT_CHOICES, default='normal')
    client_user       = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_sites", help_text="The login account for the client's Dashboard")
    bill_account_name = models.CharField(max_length=150, blank=True, help_text="Owner's receiving bank account name")
    client_account_name = models.CharField(max_length=150, blank=True, help_text="Client's sending bank account details")
    client_gstin      = models.CharField(max_length=15, blank=True, help_text="Client's GST number")
    monthly_amount    = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.agency.name})"


class SiteShift(models.Model):
    """A shift definition for a specific site (e.g. Day, Night)."""
    site       = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="shifts")
    name       = models.CharField(max_length=50)   # e.g., "Day"
    start_time = models.TimeField()
    end_time   = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time"]
        
    def __str__(self):
        return f"{self.site.name} - {self.name} ({self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')})"


class Guard(models.Model):
    """Security guard — a managed entity, NOT a system user."""
    GUARD_TYPE_CHOICES = [
        ("regular",   "Regular"),
        ("temporary", "Temporary"),
    ]

    agency         = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="guards")
    site           = models.ForeignKey(
        Site, null=True, blank=True, on_delete=models.SET_NULL, related_name="guards"
    )
    shift          = models.ForeignKey(
        SiteShift, null=True, blank=True, on_delete=models.SET_NULL, related_name="guards"
    )
    name           = models.CharField(max_length=100)
    phone          = models.CharField(max_length=15, unique=True)
    address        = models.TextField(blank=True)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    advance_paid   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    guard_type     = models.CharField(max_length=20, choices=GUARD_TYPE_CHOICES, default="regular")
    is_active      = models.BooleanField(default=True)
    is_on_duty     = models.BooleanField(default=False)

    # Personal Bank Details
    bank_name    = models.CharField(max_length=150, blank=True)
    account_no   = models.CharField(max_length=30, blank=True)
    ifsc_code    = models.CharField(max_length=20, blank=True)
    upi_id       = models.CharField(max_length=100, blank=True)

    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="created_guards"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} @ {self.site.name if self.site else 'Unassigned'}"

    @property
    def daily_rate(self):
        """Salary per day based on current month days."""
        import calendar
        today = timezone.now().date()
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        if days_in_month == 0:
            return 0
        return round(float(self.monthly_salary) / days_in_month, 2)


class Attendance(models.Model):
    """Attendance record — supports multiple shifts/day (overtime). Each guard+date+shift is unique."""
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent",  "Absent"),
        ("late",    "Late"),
    ]
    
    agency      = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="attendance_records")
    guard       = models.ForeignKey(Guard, on_delete=models.CASCADE, related_name="attendance_records")
    site        = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True)
    shift       = models.ForeignKey(SiteShift, on_delete=models.SET_NULL, null=True, blank=True)
    date        = models.DateField(default=timezone.now)
    check_in    = models.DateTimeField(null=True, blank=True)
    check_out   = models.DateTimeField(null=True, blank=True)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default="present")
    is_overtime = models.BooleanField(default=False, help_text="True if this is an extra/second shift on the same day")
    notes       = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-check_in"]
        unique_together = [["guard", "date", "shift"]]  # One record per guard per day per shift

    def __str__(self):
        tag = " [OT]" if self.is_overtime else ""
        return f"{self.guard.name} - {self.date} ({self.status}){tag}"


class DailyWage(models.Model):
    """Tracks daily earnings/payments for guards (especially temporary ones)."""
    agency     = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="daily_wages")
    guard      = models.ForeignKey(Guard, on_delete=models.CASCADE, related_name="daily_wages")
    site       = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True)
    date       = models.DateField(default=timezone.now)
    amount     = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid    = models.BooleanField(default=False)
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        unique_together = ["guard", "site", "date"] # One daily record per site

    def __str__(self):
        return f"{self.guard.name} - ₹{self.amount} ({self.date})"