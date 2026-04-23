from django.urls import path
from . import views

urlpatterns = [
    path('',              views.salary_list,    name='salary-list'),
    path('<int:pk>/',     views.salary_detail,  name='salary-detail'),
    path('<int:pk>/pay/',  views.pay_salary,      name='pay-salary'),
    path('<int:pk>/undo/', views.undo_salary_payout, name='undo-salary'),
    path('summary/',       views.salary_summary,  name='salary-summary'),
    path('my-history/',    views.my_salary_history, name='my-salary-history'),
]
