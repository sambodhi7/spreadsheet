from unittest.mock import patch

import pytest
from django.urls import reverse

from apps.ai.providers.gemini import ProviderError
from apps.spreadsheets.models import Cell, Sheet, Workbook
from apps.users.models import User


@pytest.mark.django_db
def test_formula_suggestion_uses_authorized_sheet_and_limited_context(client):
    user = User.objects.create_user(username="ai-user")
    workbook = Workbook.objects.create(owner=user)
    sheet = Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0)
    Cell.objects.create(sheet=sheet, row=0, column=0, raw="12")
    Cell.objects.create(sheet=sheet, row=0, column=1, raw="private")
    client.force_login(user)

    with patch("apps.ai.services.GeminiProvider.generate_formula", return_value={
        "formula": "=SUM(A1:A10)", "explanation": "Adds the values in column A."
    }) as provider:
        response = client.post(reverse("ai-formula-suggestion"), data={
            "sheetId": str(sheet.id),
            "instruction": "Sum column A",
            "contextCells": [{"row": 0, "column": 0}],
        }, content_type="application/json")

    assert response.status_code == 200
    assert response.json()["formula"] == "=SUM(A1:A10)"
    prompt = provider.call_args.args[0]
    assert "raw='12'" in prompt
    assert "private" not in prompt


@pytest.mark.django_db
def test_formula_suggestion_does_not_expose_other_users_sheet(client):
    owner = User.objects.create_user(username="owner-ai")
    sheet = Sheet.objects.create(
        workbook=Workbook.objects.create(owner=owner), name="Sheet 1", position=0
    )
    client.force_login(User.objects.create_user(username="stranger-ai"))
    response = client.post(reverse("ai-formula-suggestion"), data={
        "sheetId": str(sheet.id), "instruction": "Sum values"
    }, content_type="application/json")
    assert response.status_code == 404


@pytest.mark.django_db
def test_provider_failure_is_safe(client):
    user = User.objects.create_user(username="ai-failure")
    sheet = Sheet.objects.create(
        workbook=Workbook.objects.create(owner=user), name="Sheet 1", position=0
    )
    client.force_login(user)
    with patch(
        "apps.ai.services.GeminiProvider.generate_formula",
        side_effect=ProviderError("secret"),
    ):
        response = client.post(reverse("ai-formula-suggestion"), data={
            "sheetId": str(sheet.id), "instruction": "Sum values"
        }, content_type="application/json")
    assert response.status_code == 503
    assert "secret" not in response.content.decode()
