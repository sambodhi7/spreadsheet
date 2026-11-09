from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("apps.common.urls")),
    path("api/v1/", include("config.api_urls")),
]
