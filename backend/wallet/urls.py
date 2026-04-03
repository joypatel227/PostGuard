from django.urls import path
from . import views

urlpatterns = [
    path('my/',              views.my_wallet,         name='my-wallet'),
    path('agency/',          views.agency_wallets,    name='agency-wallets'),
    path('deposit/',         views.deposit,           name='wallet-deposit'),
    path('give-guard/',      views.give_to_guard,     name='give-guard'),
    path('give-supervisor/', views.give_to_supervisor, name='give-supervisor'),
    path('history/',         views.transaction_history, name='wallet-history'),
]
