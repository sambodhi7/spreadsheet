from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ExternalIdentity, User

admin.site.register(User, UserAdmin)


@admin.register(ExternalIdentity)
class ExternalIdentityAdmin(admin.ModelAdmin):
    list_display = ("provider", "email_at_provider", "user", "created_at")
    list_filter = ("provider",)
    search_fields = ("subject", "email_at_provider", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")
