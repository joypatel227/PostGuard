import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from billing.models import BankAccount, BankTransaction

print('Starting balance recalculation')
count = 0

for acc in BankAccount.objects.all():
    # txns normally sorted by -created_at for ui. We sort oldest first here:
    txns = list(BankTransaction.objects.filter(bank_account=acc).order_by('created_at', 'id'))
    
    # 1. Reverse simulate to find the starting balance BEFORE any of these txns happened
    current_bal = acc.balance
    for t in reversed(txns):
        if t.type == 'credit':
            current_bal -= t.amount
        else:
            current_bal += t.amount
            
    print(f'[{acc.account_name}] Starting balance seed: {current_bal}')
    
    # 2. Forward simulate to assign exact running_balance
    bal = current_bal
    for t in txns:
        if t.type == 'credit':
            bal += t.amount
        else:
            bal -= t.amount
            
        t.running_balance = bal
        t.save()
        count += 1

print(f'Fixed {count} txns.')
