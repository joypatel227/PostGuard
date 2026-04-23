from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('login/',      views.login_view,       name='login'),
    path('heartbeat/',  views.heartbeat_view,   name='heartbeat'),
    path('me/',         views.me_view,          name='me'),

    # Invite codes
    path('generate-code/',           views.generate_code_view,          name='generate-code'),
    path('validate-code/',           views.validate_code_view,          name='validate-code'),
    path('my-codes/',                views.my_codes_view,               name='my-codes'),
    path('codes/<int:pk>/delete/',   views.delete_code_view,            name='delete-code'),
    path('use-code/',                views.use_code_view,               name='use-code'),
    
    # Owners (Lord only)
    path('create-owner/',            views.create_owner_view,           name='create-owner'),

    # Owner dashboard
    path('owner-stats/',             views.owner_stats_view,            name='owner-stats'),
    path('agency-users/',            views.agency_users_view,           name='agency-users'),
    path('create-agency-user/',      views.create_agency_user_view,     name='create-agency-user'),
    path('agency-users/<int:pk>/delete/', views.delete_agency_user_view, name='delete-agency-user'),

    # Join requests
    path('join-request/',                      views.join_request_view,            name='join-request'),
    path('join-requests/',                     views.list_join_requests_view,      name='list-join-requests'),
    path('join-requests/<int:pk>/approve/',    views.approve_join_request_view,    name='approve-join-request'),
    path('join-requests/<int:pk>/reject/',     views.reject_join_request_view,     name='reject-join-request'),

    # Users
    path('my-users/',       views.my_users_view,       name='my-users'),
    path('lord-stats/',     views.lord_stats_view,     name='lord-stats'),
    path('users/<int:pk>/delete/', views.delete_user_view, name='delete-user'),
    path('delete-account/', views.delete_account_view, name='delete-account'),
    path('send-otp/',       views.send_otp_view,       name='send-otp'),
    path('guard-send-otp/', views.guard_send_otp_view, name='guard-send-otp'),
    path('guard-verify-otp/', views.guard_verify_otp_view, name='guard-verify-otp'),
]
