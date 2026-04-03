from django.contrib import admin
from .models import SiteVisit, Followup, FuelStop, SupervisorLocation
admin.site.register(SiteVisit)
admin.site.register(Followup)
admin.site.register(FuelStop)
admin.site.register(SupervisorLocation)
