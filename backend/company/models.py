from django.db import models
from django.utils import timezone


class Agency(models.Model):
    """Security agency that purchased PostGuard."""
    name       = models.CharField(max_length=150, unique=True)
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="created_agencies"
    )
    created_at = models.DateTimeField(auto_now_add=True)

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
    bill_account_name = models.CharField(max_length=150, blank=True)
    monthly_amount    = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.agency.name})"


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
    name           = models.CharField(max_length=100)
    phone          = models.CharField(max_length=15, unique=True)
    address        = models.TextField(blank=True)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    guard_type     = models.CharField(max_length=20, choices=GUARD_TYPE_CHOICES, default="regular")
    is_active      = models.BooleanField(default=True)
    is_on_duty     = models.BooleanField(default=False)

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