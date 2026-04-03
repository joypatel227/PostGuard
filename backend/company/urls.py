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
    # Guards
    path('guards/',           views.guard_list_create,  name='guard-list-create'),
    path('guards/<int:pk>/',  views.guard_detail,       name='guard-detail'),
    path('guards/<int:pk>/toggle-duty/', views.guard_toggle_duty, name='guard-toggle-duty'),
]
