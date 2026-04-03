from django.contrib import admin
from .models import BankAccount, Bill, Payment
admin.site.register(BankAccount)
admin.site.register(Bill)
admin.site.register(Payment)
