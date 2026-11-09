from django.urls import path

from .views import FormulaSuggestionView

urlpatterns = [
    path("formula-suggestion/", FormulaSuggestionView.as_view(), name="ai-formula-suggestion")
]
