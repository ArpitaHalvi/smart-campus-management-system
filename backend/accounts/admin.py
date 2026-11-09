from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'status', 'is_staff')
    list_filter = ('role', 'status', 'is_staff')
    # is_active follows `status`, so it can't be edited directly
    readonly_fields = ('is_active',)

    # Show role and account status when editing / creating users here
    fieldsets = UserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
        ('Account status', {'fields': ('status', 'status_reason')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role', {'fields': ('email', 'role')}),
    )
