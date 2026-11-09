from django.http import JsonResponse
from django.urls import path


def api_root(_request):
    return JsonResponse({"name": "spreadsheet-api", "version": "v1"})


urlpatterns = [path("", api_root, name="api-root")]
