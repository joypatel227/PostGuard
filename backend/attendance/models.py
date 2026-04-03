from django.db import models
from django.utils import timezone


class AdminAttendance(models.Model):
    """Attendance for admin users (office-based, triggered by system or manual)."""
    SOURCE_CHOICES = [
        ("system", "System (auto clock-in/out)"),
        ("manual", "Manual (set by owner)"),
    ]

    user       = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE,
        related_name="admin_attendances",
        limit_choices_to={"role__in": ["admin"]}
    )
    date       = models.DateField(default=timezone.now)
    clock_in   = models.DateTimeField(null=True, blank=True)
    clock_out  = models.DateTimeField(null=True, blank=True)
    source     = models.CharField(max_length=10, choices=SOURCE_CHOICES, default="manual")
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user.name} — {self.date} ({self.source})"


class SupervisorAttendance(models.Model):
    """Attendance for supervisors — via image upload with location."""
    STATUS_CHOICES = [
        ("pending",  "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    user         = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE,
        related_name="supervisor_attendances",
        limit_choices_to={"role": "supervisor"}
    )
    date         = models.DateField(default=timezone.now)
    image        = models.ImageField(upload_to="attendance/supervisor/", null=True, blank=True)
    location_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    reviewed_by  = models.ForeignKey(
        "accounts.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="reviewed_supervisor_att"
    )
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user.name} — {self.date} ({self.status})"


class GuardAttendance(models.Model):
    """Attendance for guards — marked by supervisor or admin."""
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent",  "Absent"),
        ("half",    "Half Day"),
    ]
    SOURCE_CHOICES = [
        ("manual",    "Manual entry"),
        ("whatsapp",  "WhatsApp paste"),
        ("image",     "Image upload"),
    ]

    guard        = models.ForeignKey(
        "company.Guard", on_delete=models.CASCADE, related_name="attendances"
    )
    date         = models.DateField(default=timezone.now)
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default="present")
    source       = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")
    image        = models.ImageField(upload_to="attendance/guard/", null=True, blank=True)
    location_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    marked_by    = models.ForeignKey(
        "accounts.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="marked_attendances"
    )
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("guard", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.guard.name} — {self.date} ({self.status})"