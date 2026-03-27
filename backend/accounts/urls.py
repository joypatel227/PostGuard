from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path("login/", views.login_view, name="login"),
    path("me/", views.me_view, name="me"),

    # Invite codes
    path("generate-code/", views.generate_code_view, name="generate-code"),
    path("my-codes/", views.my_codes_view, name="my-codes"),
    path("codes/<int:pk>/", views.delete_code_view, name="delete-code"),
    path("use-code/", views.use_code_view, name="use-code"),

    # Join requests
    path("join-request/", views.join_request_view, name="join-request"),
    path("join-requests/", views.list_join_requests_view, name="list-join-requests"),
    path("join-requests/<int:pk>/approve/", views.approve_join_request_view, name="approve-join-request"),
    path("join-requests/<int:pk>/reject/", views.reject_join_request_view, name="reject-join-request"),

    # Users / Auth
    path("my-users/", views.my_users_view, name="my-users"),
    path("delete-account/", views.delete_account_view, name="delete-account"),
    path("send-otp/", views.send_otp_view, name="send-otp"),
]
