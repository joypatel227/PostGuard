from django.urls import path
from . import views

urlpatterns = [
    path('visits/',                    views.site_visit_list_create, name='visit-list-create'),
    path('visits/<int:pk>/',           views.site_visit_detail,      name='visit-detail'),
    path('followups/',                 views.followup_list_create,   name='followup-list-create'),
    path('toggle-duty/',               views.toggle_duty,            name='toggle-duty'),
    path('update-location/',           views.update_location,        name='update-location'),
    path('live-locations/',            views.live_locations,         name='live-locations'),
    path('fuel/',                      views.fuel_stop_list_create,  name='fuel-list-create'),
]
