from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',       include('accounts.urls')),
    path('api/company/',    include('company.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/supervisor/', include('supervisor.urls')),
    path('api/wallet/',     include('wallet.urls')),
    path('api/billing/',    include('billing.urls')),
    path('api/salary/',     include('salary.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
