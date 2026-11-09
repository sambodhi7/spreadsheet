import pytest
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError

from apps.spreadsheets.models import Cell, Sheet, Workbook, WorkbookPermission
from apps.users.models import User


@pytest.fixture
def owner(db):
    return User.objects.create_user(username="owner")


@pytest.fixture
def workbook(owner):
    return Workbook.objects.create(owner=owner, title="Budget")


@pytest.fixture
def sheet(workbook):
    return Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0)


@pytest.mark.django_db
def test_sparse_cell_stores_raw_input_and_format(sheet):
    cell = Cell.objects.create(
        sheet=sheet,
        row=4,
        column=2,
        raw="=A1+B1",
        text_color="#ff0000",
        markdown=True,
    )

    assert sheet.cells.get() == cell
    assert cell.raw == "=A1+B1"
    assert cell.background_color == "#ffffff"
    assert not hasattr(cell, "computed_value")


@pytest.mark.django_db
def test_cell_coordinates_are_unique_within_sheet(sheet):
    Cell.objects.create(sheet=sheet, row=0, column=0, raw="first")

    with pytest.raises(IntegrityError), transaction.atomic():
        Cell.objects.create(sheet=sheet, row=0, column=0, raw="second")


@pytest.mark.django_db
def test_sheet_position_and_name_are_unique_within_workbook(workbook):
    Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0)

    with pytest.raises(IntegrityError), transaction.atomic():
        Sheet.objects.create(workbook=workbook, name="Another", position=0)

    with pytest.raises(IntegrityError), transaction.atomic():
        Sheet.objects.create(workbook=workbook, name="Sheet 1", position=1)


@pytest.mark.django_db
def test_workbook_permission_is_unique_per_user(workbook):
    collaborator = User.objects.create_user(username="collaborator")
    WorkbookPermission.objects.create(
        workbook=workbook,
        user=collaborator,
        role=WorkbookPermission.Role.EDITOR,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        WorkbookPermission.objects.create(
            workbook=workbook,
            user=collaborator,
            role=WorkbookPermission.Role.VIEWER,
        )


@pytest.mark.django_db
def test_owner_cannot_be_deleted_while_workbook_exists(workbook, owner):
    with pytest.raises(ProtectedError):
        owner.delete()


@pytest.mark.django_db
def test_deleting_workbook_cascades_to_sheets_and_cells(workbook, sheet):
    Cell.objects.create(sheet=sheet, row=0, column=0, raw="hello")

    workbook.delete()

    assert Sheet.objects.count() == 0
    assert Cell.objects.count() == 0
