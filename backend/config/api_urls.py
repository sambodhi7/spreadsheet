from django.http import JsonResponse
from django.urls import include, path


def api_root(_request):
    return JsonResponse({"name": "spreadsheet-api", "version": "v1"})


urlpatterns = [
    path("", api_root, name="api-root"),
    path("auth/", include("apps.users.urls")),
    path("ai/", include("apps.ai.urls")),
    path("", include("apps.spreadsheets.urls")),
]
