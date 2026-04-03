from django.db import models


class BankAccount(models.Model):
    """Owner's bank account used for receiving payments from sites."""
    agency       = models.ForeignKey("company.Agency", on_delete=models.CASCADE, related_name="bank_accounts")
    account_name = models.CharField(max_length=150)
    bank_name    = models.CharField(max_length=150)
    account_no   = models.CharField(max_length=30)
    ifsc         = models.CharField(max_length=20, blank=True)
    upi_id       = models.CharField(max_length=100, blank=True)
    is_default   = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account_name} — {self.bank_name}"


class Bill(models.Model):
    """A bill sent to a site for security services."""
    BILL_TYPE_CHOICES = [
        ("gst",    "GST Bill"),
        ("normal", "Normal Bill"),
        ("manual", "Manual (uploaded file)"),
    ]

    site           = models.ForeignKey("company.Site", on_delete=models.CASCADE, related_name="bills")
    agency         = models.ForeignKey("company.Agency", on_delete=models.CASCADE, related_name="bills")
    bank_account   = models.ForeignKey(
        BankAccount, null=True, blank=True, on_delete=models.SET_NULL, related_name="bills"
    )
    bill_type      = models.CharField(max_length=10, choices=BILL_TYPE_CHOICES, default="normal")
    amount         = models.DecimalField(max_digits=12, decimal_places=2)
    remaining      = models.DecimalField(max_digits=12, decimal_places=2)

    # For generated bills (normal/gst) — dynamic fields filled in template
    bill_month     = models.PositiveIntegerField(null=True, blank=True)   # 1-12
    bill_year      = models.PositiveIntegerField(null=True, blank=True)
    bill_date      = models.DateField(null=True, blank=True)
    due_date       = models.DateField(null=True, blank=True)
    gst_number     = models.CharField(max_length=20, blank=True)
    gst_percent    = models.DecimalField(max_digits=5, decimal_places=2, default=18)

    # For manual bills (uploaded file)
    bill_file      = models.FileField(upload_to="bills/manual/", null=True, blank=True)

    # Auto-send settings
    auto_send      = models.BooleanField(default=False)
    auto_send_day  = models.PositiveIntegerField(null=True, blank=True)  # day of month

    sent_at        = models.DateTimeField(null=True, blank=True)
    created_by     = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="created_bills"
    )
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Bill: {self.site.name} ₹{self.amount} ({self.bill_type})"


class Payment(models.Model):
    """A payment made against a bill by the site."""
    STATUS_CHOICES = [
        ("pending",  "Pending Verification"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    bill           = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="payments")
    amount_paid    = models.DecimalField(max_digits=12, decimal_places=2)
    paid_at        = models.DateField()
    screenshot     = models.ImageField(upload_to="payments/screenshots/", null=True, blank=True)
    via_bank_account = models.ForeignKey(
        BankAccount, null=True, blank=True, on_delete=models.SET_NULL, related_name="payments_received"
    )
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    verified_by    = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="verified_payments"
    )
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment ₹{self.amount_paid} for {self.bill.site.name} ({self.status})"
