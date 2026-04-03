from django.urls import path
from . import views

urlpatterns = [
    path('bank-accounts/',                    views.bank_account_list_create, name='bank-account-list'),
    path('bank-accounts/<int:pk>/',           views.bank_account_detail,      name='bank-account-detail'),
    path('bills/',                            views.bill_list_create,         name='bill-list'),
    path('bills/<int:pk>/',                   views.bill_detail,              name='bill-detail'),
    path('bills/<int:pk>/send/',              views.send_bill,                name='send-bill'),
    path('payments/',                         views.payment_list_create,      name='payment-list'),
    path('payments/<int:pk>/verify/',         views.verify_payment,           name='verify-payment'),
    path('summary/',                          views.billing_summary,          name='billing-summary'),
]
