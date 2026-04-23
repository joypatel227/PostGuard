import random
import string
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, name, phone, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "lord")
        extra_fields.setdefault("status", "approved")
        return self.create_user(email, name, phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Role Hierarchy:
      lord  → owns the PostGuard SaaS platform (Shriyu Nexus)
      owner → security agency owner (buys PostGuard)
      admin → office manager for the agency
      supervisor → field supervisor visiting sites
    Guards are NOT system users — they are managed as Guard entities.
    """
    ROLE_CHOICES = [
        ("lord",       "Lord"),
        ("owner",      "Owner"),
        ("admin",      "Admin"),
        ("supervisor", "Supervisor"),
        ("guard",      "Guard"),
        ("client",     "Site Client"),
    ]
    STATUS_CHOICES = [
        ("pending",  "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    email    = models.EmailField(unique=True)
    name     = models.CharField(max_length=100)
    phone    = models.CharField(max_length=15, unique=True)
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default="owner")
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default="approved")

    # The user who created this account (lord→owner, owner→admin, admin/owner→supervisor)
    created_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="created_users"
    )

    # Agency this user belongs to (null for lord; owner is the head of an agency)
    agency = models.ForeignKey(
        "company.Agency", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="members"
    )

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_seen  = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["name", "phone"]

    objects = UserManager()

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.role})"


# ── Invite Codes ──────────────────────────────────────────────────────────────

def generate_invite_code():
    letters = random.choices(string.ascii_uppercase, k=4)
    numbers = random.choices(string.digits, k=2)
    code_list = letters + numbers
    random.shuffle(code_list)
    return "".join(code_list)


class InviteCode(models.Model):
    ROLE_CHOICES = [
        ("owner",      "Owner"),
        ("admin",      "Admin"),
        ("supervisor", "Supervisor"),
    ]

    code      = models.CharField(max_length=6, unique=True, default=generate_invite_code)
    role_for  = models.CharField(max_length=20, choices=ROLE_CHOICES)
    # For owner codes the lord sets the agency name at code generation time
    agency_name = models.CharField(max_length=150, blank=True, default="")

    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="generated_codes")
    used       = models.BooleanField(default=False)
    used_by    = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="used_code"
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=48)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

    def __str__(self):
        return f"{self.code} → {self.role_for} (used={self.used})"


# ── Join Requests ─────────────────────────────────────────────────────────────

class JoinRequest(models.Model):
    ROLE_CHOICES = [
        ("owner",      "Owner"),
        ("admin",      "Admin"),
        ("supervisor", "Supervisor"),
    ]
    STATUS_CHOICES = [
        ("pending",  "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    name           = models.CharField(max_length=100)
    email          = models.EmailField()
    phone          = models.CharField(max_length=15)
    requested_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    message        = models.TextField(blank=True)
    raw_password   = models.CharField(max_length=255, blank=True, default="")
    agency         = models.ForeignKey(
        "company.Agency", null=True, blank=True, on_delete=models.CASCADE, related_name="join_requests"
    )

    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_requests"
    )
    parent_user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="child_requests"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} → {self.requested_role} ({self.status})"