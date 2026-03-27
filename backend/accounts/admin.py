from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, InviteCode, JoinRequest


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'name', 'role', 'status', 'is_active', 'date_joined']
    list_filter = ['role', 'status', 'is_active']
    search_fields = ['email', 'name', 'phone']
    ordering = ['email']
    filter_horizontal = ['groups', 'user_permissions']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('name', 'phone', 'role', 'status', 'created_by')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'phone', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(InviteCode)
class InviteCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'role_for', 'created_by', 'used', 'expires_at', 'created_at']
    list_filter = ['role_for', 'used']
    readonly_fields = ['code', 'created_at']


@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'requested_role', 'status', 'created_at']
    list_filter = ['requested_role', 'status']
    readonly_fields = ['created_at', 'updated_at']