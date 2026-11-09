import json
from unittest.mock import patch

import pytest
from django.urls import reverse

from apps.users.models import ExternalIdentity, User
from apps.users.services.google import GoogleProfile


def _csrf_client(client):
    response = client.get(reverse("auth-csrf"))
    assert response.status_code == 200
    return response.json()["csrfToken"]


@pytest.mark.django_db
def test_google_sign_in_creates_session_and_identity(client):
    csrf_token = _csrf_client(client)
    profile = GoogleProfile(
        subject="google-subject-123",
        email="person@example.com",
        first_name="Test",
        last_name="Person",
    )

    with patch("apps.users.views.verify_google_credential", return_value=profile):
        response = client.post(
            reverse("auth-google"),
            data=json.dumps({"credential": "signed-google-token"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    assert response.status_code == 200
    assert response.json()["email"] == "person@example.com"
    user = User.objects.get()
    assert not user.has_usable_password()
    assert ExternalIdentity.objects.filter(
        user=user,
        provider=ExternalIdentity.Provider.GOOGLE,
        subject="google-subject-123",
    ).exists()

    me_response = client.get(reverse("auth-me"))
    assert me_response.status_code == 200
    assert me_response.json()["id"] == user.id


@pytest.mark.django_db
def test_google_sign_in_reuses_identity(client):
    csrf_token = _csrf_client(client)
    profile = GoogleProfile("same-subject", "person@example.com", "Test", "Person")

    with patch("apps.users.views.verify_google_credential", return_value=profile):
        for _ in range(2):
            response = client.post(
                reverse("auth-google"),
                data=json.dumps({"credential": "signed-google-token"}),
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            assert response.status_code == 200

    assert User.objects.count() == 1
    assert ExternalIdentity.objects.count() == 1


@pytest.mark.django_db
def test_logout_ends_session(client):
    user = User.objects.create_user(username="google_test")
    client.force_login(user)
    csrf_token = _csrf_client(client)

    response = client.post(reverse("auth-logout"), HTTP_X_CSRFTOKEN=csrf_token)

    assert response.status_code == 204
    assert client.get(reverse("auth-me")).status_code == 403


@pytest.mark.django_db
def test_google_sign_in_requires_csrf(client):
    csrf_client = client.__class__(enforce_csrf_checks=True)

    response = csrf_client.post(
        reverse("auth-google"),
        data=json.dumps({"credential": "signed-google-token"}),
        content_type="application/json",
    )

    assert response.status_code == 403
