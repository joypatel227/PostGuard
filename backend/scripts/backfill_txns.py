import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from billing.models import Payment, BankAccount, BankTransaction
from salary.models import SalaryPaymentLog, SalaryRecord
from decimal import Decimal

print('Backfilling BankTransaction table...')

# 1. Backfill Payments (Credits)
payments = Payment.objects.filter(status='verified').exclude(via_bank_account__isnull=True)
count_p = 0
for p in payments:
    site_name = p.bill.site.name if p.bill else "Unknown"
    desc = f"Payment from {site_name}"
    
    # Need to verify if we already stored this to prevent duplicates
    if not BankTransaction.objects.filter(type='credit', description__icontains=site_name, date=p.paid_at or p.created_at.date()).exists():
        amount = Decimal(str(p.amount_paid or 0))
        BankTransaction.objects.create(
            bank_account=p.via_bank_account,
            type='credit',
            amount=amount,
            running_balance=p.via_bank_account.balance if p.via_bank_account else 0, 
            description=desc,
            category='payment',
            date=p.paid_at or p.created_at.date(),
            created_at=p.created_at,
            created_by=p.submitted_by if hasattr(p, 'submitted_by') else None
        )
        count_p += 1

# 2. Backfill Salary (Debits) - using SalaryRecord since SalaryPaymentLog is also new
# We'll pull from SalaryRecord where amount_paid > 0 and from_bank is not null
salaries = SalaryRecord.objects.filter(amount_paid__gt=0).exclude(from_bank__isnull=True)
count_s = 0
for s in salaries:
    desc = f"Salary paid to {s.guard.name} ({s.month}/{s.year})"
    if not BankTransaction.objects.filter(type='debit', salary_record=s).exists():
        BankTransaction.objects.create(
            bank_account=s.from_bank,
            type='debit',
            amount=Decimal(str(s.amount_paid)),
            running_balance=s.from_bank.balance if s.from_bank else 0,
            description=desc,
            category='salary',
            date=s.paid_at if s.paid_at else (getattr(s.created_at, 'date', lambda: s.created_at)()),
            salary_record=s,
            created_at=s.paid_at or s.created_at,
            created_by=s.guard.user if hasattr(s.guard, 'user') else None # fallback, doesn't matter much for history
        )
        count_s += 1

print(f'Done. Added {count_p} legacy payments and {count_s} legacy salaries.')
