import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.spreadsheets.selectors import sheet_for_user

from .providers.gemini import ProviderError
from .serializers import FormulaRequestSerializer
from .services import suggest_formula

logger = logging.getLogger(__name__)


class FormulaSuggestionView(APIView):
    def post(self, request):
        serializer = FormulaRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        sheet = sheet_for_user(request.user, data["sheet_id"])
        try:
            suggestion = suggest_formula(
                sheet=sheet,
                instruction=data["instruction"],
                coordinates=data.get("coordinates", []),
            )
        except ProviderError:
            logger.exception("Formula suggestion failed")
            return Response(
                {"detail": "Formula suggestion is unavailable", "code": "ai_unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"formula": suggestion.formula, "explanation": suggestion.explanation})
