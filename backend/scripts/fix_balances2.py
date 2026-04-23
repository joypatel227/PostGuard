import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from billing.models import BankAccount, BankTransaction

print('Starting exact date-based balance recalculation')
count = 0

for acc in BankAccount.objects.all():
    # Sort EXACTLY as the UI sorts them chronologically: oldest date first, oldest insertion first
    txns = list(BankTransaction.objects.filter(bank_account=acc).order_by('date', 'created_at'))
    
    current_bal = acc.balance
    for t in reversed(txns):
        if t.type == 'credit':
            current_bal -= t.amount
        else:
            current_bal += t.amount
            
    print(f'[{acc.account_name}] Starting balance seed: {current_bal}')
    
    bal = current_bal
    for t in txns:
        if t.type == 'credit':
            bal += t.amount
        else:
            bal -= t.amount
            
        t.running_balance = bal
        t.save()
        count += 1

print(f'Fixed {count} txns correctly over timeline.')
