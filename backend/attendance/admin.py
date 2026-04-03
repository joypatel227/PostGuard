from django.contrib import admin
from .models import AdminAttendance, SupervisorAttendance, GuardAttendance
admin.site.register(AdminAttendance)
admin.site.register(SupervisorAttendance)
admin.site.register(GuardAttendance)
