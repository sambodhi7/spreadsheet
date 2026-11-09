import json

import pytest
from django.urls import reverse

from apps.spreadsheets.models import Cell, Sheet, Workbook, WorkbookPermission
from apps.users.models import User


@pytest.fixture
def api_user(db):
    return User.objects.create_user(username="api-user")


@pytest.fixture
def authenticated_client(client, api_user):
    client.force_login(api_user)
    return client


@pytest.mark.django_db
def test_workbook_endpoints_require_authentication(client):
    response = client.get(reverse("workbook-list"))

    assert response.status_code == 403


@pytest.mark.django_db
def test_create_workbook_also_creates_initial_sheet(authenticated_client, api_user):
    response = authenticated_client.post(
        reverse("workbook-list"),
        data=json.dumps({"title": "Quarterly Plan"}),
        content_type="application/json",
    )

    assert response.status_code == 201
    assert response.json()["access"] == "owner"
    assert response.json()["sheets"][0]["name"] == "Sheet 1"
    workbook = Workbook.objects.get(owner=api_user)
    assert workbook.sheets.count() == 1


@pytest.mark.django_db
def test_user_only_lists_accessible_workbooks(authenticated_client, api_user):
    owned = Workbook.objects.create(owner=api_user, title="Owned")
    other = User.objects.create_user(username="other")
    shared = Workbook.objects.create(owner=other, title="Shared")
    hidden = Workbook.objects.create(owner=other, title="Hidden")
    WorkbookPermission.objects.create(
        workbook=shared,
        user=api_user,
        role=WorkbookPermission.Role.VIEWER,
    )

    response = authenticated_client.get(reverse("workbook-list"))

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert ids == {str(owned.id), str(shared.id)}
    assert str(hidden.id) not in ids


@pytest.mark.django_db
def test_bulk_save_and_snapshot(authenticated_client, api_user):
    workbook = Workbook.objects.create(owner=api_user, title="Budget")
    sheet = Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0)

    response = authenticated_client.patch(
        reverse("sheet-cells", kwargs={"sheet_id": sheet.id}),
        data=json.dumps(
            {
                "baseRevision": 0,
                "changes": [
                    {"row": 0, "column": 0, "raw": "10"},
                    {
                        "row": 1,
                        "column": 0,
                        "raw": "=A1*2",
                        "format": {
                            "textColor": "#ff0000",
                            "backgroundColor": "#ffffff",
                            "markdown": False,
                        },
                    },
                ],
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json() == {"revision": 1, "workbookRevision": 1, "changedCells": 2}
    assert Cell.objects.filter(sheet=sheet).count() == 2

    snapshot = authenticated_client.get(
        reverse("sheet-snapshot", kwargs={"sheet_id": sheet.id})
    )
    assert snapshot.status_code == 200
    assert snapshot.json()["sheet"]["revision"] == 1
    assert snapshot.json()["cells"][1] == {
        "row": 1,
        "column": 0,
        "raw": "=A1*2",
        "format": {
            "textColor": "#ff0000",
            "backgroundColor": "#ffffff",
            "markdown": False,
        },
    }


@pytest.mark.django_db
def test_resetting_cell_to_default_removes_sparse_row(authenticated_client, api_user):
    workbook = Workbook.objects.create(owner=api_user)
    sheet = Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0, revision=2)
    Cell.objects.create(sheet=sheet, row=0, column=0, raw="old")

    response = authenticated_client.patch(
        reverse("sheet-cells", kwargs={"sheet_id": sheet.id}),
        data=json.dumps(
            {"baseRevision": 2, "changes": [{"row": 0, "column": 0, "raw": ""}]}
        ),
        content_type="application/json",
    )

    assert response.status_code == 200
    assert not Cell.objects.filter(sheet=sheet).exists()


@pytest.mark.django_db
def test_stale_revision_returns_conflict(authenticated_client, api_user):
    workbook = Workbook.objects.create(owner=api_user)
    sheet = Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0, revision=4)

    response = authenticated_client.patch(
        reverse("sheet-cells", kwargs={"sheet_id": sheet.id}),
        data=json.dumps(
            {"baseRevision": 3, "changes": [{"row": 0, "column": 0, "raw": "x"}]}
        ),
        content_type="application/json",
    )

    assert response.status_code == 409
    assert response.json()["code"] == "revision_conflict"
    assert response.json()["currentRevision"] == 4
    assert Cell.objects.count() == 0


@pytest.mark.django_db
def test_viewer_can_read_but_cannot_write(authenticated_client, api_user):
    owner = User.objects.create_user(username="workbook-owner")
    workbook = Workbook.objects.create(owner=owner)
    sheet = Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0)
    WorkbookPermission.objects.create(
        workbook=workbook,
        user=api_user,
        role=WorkbookPermission.Role.VIEWER,
    )

    assert (
        authenticated_client.get(reverse("sheet-snapshot", kwargs={"sheet_id": sheet.id})).status_code
        == 200
    )
    write_response = authenticated_client.patch(
        reverse("sheet-cells", kwargs={"sheet_id": sheet.id}),
        data=json.dumps(
            {"baseRevision": 0, "changes": [{"row": 0, "column": 0, "raw": "x"}]}
        ),
        content_type="application/json",
    )
    assert write_response.status_code == 404


@pytest.mark.django_db
def test_cannot_delete_last_sheet(authenticated_client, api_user):
    workbook = Workbook.objects.create(owner=api_user)
    sheet = Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0)

    response = authenticated_client.delete(reverse("sheet-detail", kwargs={"sheet_id": sheet.id}))

    assert response.status_code == 400
    assert response.json()["code"] == "last_sheet"
    assert Sheet.objects.filter(id=sheet.id).exists()
