from django.db import models


class Wallet(models.Model):
    """Virtual wallet for admin, owner, and supervisor users."""
    user    = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="wallet"
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.name} — ₹{self.balance}"


class WalletTransaction(models.Model):
    """Every credit/debit to any wallet."""
    TXN_TYPE_CHOICES = [
        ("deposit",      "Deposit (cash added)"),
        ("withdraw",     "Withdraw"),
        ("give_guard",   "Given to Guard"),
        ("give_supervisor", "Given to Supervisor"),
        ("fuel",         "Fuel Stop"),
        ("salary_deduct","Salary Advance Deduction"),
        ("transfer_in",  "Transfer Received"),
        ("transfer_out", "Transfer Sent"),
    ]

    wallet       = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    amount       = models.DecimalField(max_digits=12, decimal_places=2)
    txn_type     = models.CharField(max_length=30, choices=TXN_TYPE_CHOICES)
    # Running balance after this transaction
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    related_user  = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="wallet_txns_as_related"
    )
    related_guard = models.ForeignKey(
        "company.Guard", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="wallet_transactions"
    )
    note       = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="created_wallet_txns"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.wallet.user.name} {self.txn_type} ₹{self.amount}"
