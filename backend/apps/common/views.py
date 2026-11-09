import logging

from django.db import connections
from django.http import JsonResponse
from django.views.decorators.http import require_GET


logger = logging.getLogger(__name__)


@require_GET
def live(_request):
    return JsonResponse({"status": "ok"})


@require_GET
def ready(_request):
    try:
        connections["default"].ensure_connection()
    except Exception:
        logger.exception("Database readiness check failed")
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ok"})
