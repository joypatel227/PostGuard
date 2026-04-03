from django.urls import path
from . import views

urlpatterns = [
    path('admin/',                                views.admin_attendance,           name='admin-attendance'),
    path('supervisor/',                           views.supervisor_attendance,       name='supervisor-attendance'),
    path('supervisor/<int:pk>/review/',           views.supervisor_attendance_review, name='supervisor-att-review'),
    path('guard/',                                views.guard_attendance,           name='guard-attendance'),
    path('guard/bulk/',                           views.guard_attendance_bulk,      name='guard-attendance-bulk'),
]
