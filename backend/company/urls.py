from django.urls import path
from . import views

urlpatterns = [
    # Agencies
    path('agencies/',         views.agency_list,        name='agency-list'),
    path('public-agencies/',  views.public_agency_list, name='public-agency-list'),
    path('agencies/<int:pk>/', views.agency_detail,     name='agency-detail'),
    # Sites
    path('sites/',            views.site_list_create,   name='site-list-create'),
    path('sites/<int:pk>/',   views.site_detail,        name='site-detail'),
    path('sites/<int:pk>/unlink-client/', views.site_unlink_client, name='site-unlink-client'),
    # Shifts
    path('sites/<int:site_pk>/shifts/', views.shift_list_create, name='shift-list-create'),
    path('shifts/<int:pk>/',            views.shift_detail,      name='shift-detail'),
    # Guards
    path('guards/',           views.guard_list_create,  name='guard-list-create'),
    path('guards/<int:pk>/',  views.guard_detail,       name='guard-detail'),
    path('guards/<int:pk>/assign/', views.guard_assign,     name='guard-assign'),
    path('guards/<int:pk>/toggle-duty/', views.guard_toggle_duty, name='guard-toggle-duty'),
    path('guards/bulk-attendance/',      views.bulk_attendance_view, name='bulk-attendance'),
    # Attendance
    path('attendance/',           views.attendance_list,   name='attendance-list'),
    path('attendance/<int:pk>/',  views.attendance_detail, name='attendance-detail'),
]

