from django.db import models


class SiteVisit(models.Model):
    """A supervisor's scheduled visit to a site."""
    STATUS_CHOICES = [
        ("assigned",   "Assigned"),
        ("travelling", "Travelling"),
        ("reached",    "Reached / On Site"),
        ("visited",    "Visited / Done"),
        ("skipped",    "Skipped"),
    ]

    supervisor     = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="site_visits",
        limit_choices_to={"role": "supervisor"}
    )
    site           = models.ForeignKey("company.Site", on_delete=models.CASCADE, related_name="visits")
    assigned_date  = models.DateField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default="assigned")
    depart_time    = models.DateTimeField(null=True, blank=True)
    arrive_time    = models.DateTimeField(null=True, blank=True)
    complete_time  = models.DateTimeField(null=True, blank=True)

    # ETA computed from Maps API or stored manually
    eta_minutes    = models.PositiveIntegerField(null=True, blank=True)
    # Distance in km
    distance_km    = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)

    points_earned  = models.IntegerField(default=0)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["assigned_date", "status"]

    def __str__(self):
        return f"{self.supervisor.name} → {self.site.name} ({self.assigned_date})"


class Followup(models.Model):
    """Followup or complaint logged during a site visit."""
    TYPE_CHOICES = [
        ("info",      "Information / Update"),
        ("complaint", "Complaint"),
        ("urgent",    "Urgent"),
        ("other",     "Other"),
    ]

    site_visit   = models.ForeignKey(SiteVisit, on_delete=models.CASCADE, related_name="followups")
    followup_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="info")
    description  = models.TextField()
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.followup_type}] {self.site_visit}"


class FuelStop(models.Model):
    """Petrol/fuel stop logged by supervisor. Amount deducted from wallet."""
    supervisor   = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="fuel_stops",
        limit_choices_to={"role": "supervisor"}
    )
    location_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_name = models.CharField(max_length=200, blank=True)
    amount       = models.DecimalField(max_digits=8, decimal_places=2)
    timestamp    = models.DateTimeField(auto_now_add=True)
    notes        = models.TextField(blank=True)

    def __str__(self):
        return f"{self.supervisor.name} fuel ₹{self.amount} @ {self.timestamp.date()}"


class SupervisorLocation(models.Model):
    """Latest known live location for a supervisor (one row per supervisor, upserted)."""
    supervisor   = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="live_location",
        limit_choices_to={"role": "supervisor"}
    )
    lat          = models.DecimalField(max_digits=10, decimal_places=7)
    lng          = models.DecimalField(max_digits=10, decimal_places=7)
    is_on_duty   = models.BooleanField(default=False)
    updated_at   = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.supervisor.name} @ ({self.lat}, {self.lng})"
