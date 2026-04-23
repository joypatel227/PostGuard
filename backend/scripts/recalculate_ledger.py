import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from billing.models import BankAccount, BankTransaction

print('Starting Definitive Ledger Recalculation...')

for acc in BankAccount.objects.all():
    # Sort chronologically (oldest first)
    txns = list(BankTransaction.objects.filter(bank_account=acc).order_by('date', 'created_at', 'id'))
    
    if not txns:
        continue
        
    print(f'\nProcessing [{acc.account_name}] ({acc.bank_name})')
    print(f'  Current Bank Balance: {acc.balance}')
    
    # Trace backwards from the final current balance to establish the seed
    # The last txn should result in exactly acc.balance
    temp_bal = acc.balance
    for t in reversed(txns):
        # We store the balance AFTER the txn in running_balance.
        # So to move one step back, we reverse the op.
        if t.type == 'credit':
            temp_bal -= t.amount
        else:
            temp_bal += t.amount
            
    seed = temp_bal
    print(f'  Calculated starting seed: {seed}')
    
    # Now walk forward and assign running balances
    running = seed
    for t in txns:
        if t.type == 'credit':
            running += t.amount
        else:
            running -= t.amount
            
        t.running_balance = running
        t.save()
        print(f'    Txn {t.id} ({t.date}): {t.type} {t.amount} -> Bal: {t.running_balance}')

print('\nDone! All ledgers are now mathematically consistent with current account balances.')
