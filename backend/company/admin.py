from django.contrib import admin
from .models import Company, Site, Guard

# Register your models here.

admin.site.register(Company)
admin.site.register(Site)
admin.site.register(Guard)