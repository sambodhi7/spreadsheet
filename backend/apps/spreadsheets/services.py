from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from .errors import RevisionConflict, SpreadsheetDomainError
from .models import Cell, Sheet, Workbook

DEFAULT_TEXT_COLOR = "#1e293b"
DEFAULT_BACKGROUND_COLOR = "#ffffff"


@transaction.atomic
def create_workbook(*, owner, title: str) -> Workbook:
    workbook = Workbook.objects.create(owner=owner, title=title)
    Sheet.objects.create(workbook=workbook, name="Sheet 1", position=0)
    return workbook


@transaction.atomic
def update_workbook(*, workbook: Workbook, title: str) -> Workbook:
    locked = Workbook.objects.select_for_update().get(id=workbook.id)
    locked.title = title
    locked.revision += 1
    locked.save(update_fields=("title", "revision", "updated_at"))
    return locked


@transaction.atomic
def create_sheet(*, workbook: Workbook, name: str | None = None) -> Sheet:
    locked = Workbook.objects.select_for_update().get(id=workbook.id)
    maximum = locked.sheets.aggregate(maximum=Max("position"))["maximum"]
    position = (maximum if maximum is not None else -1) + 1

    if name is None:
        number = locked.sheets.count() + 1
        name = f"Sheet {number}"
        while locked.sheets.filter(name=name).exists():
            number += 1
            name = f"Sheet {number}"
    elif locked.sheets.filter(name=name).exists():
        raise SpreadsheetDomainError("A sheet with this name already exists.", "duplicate_name")

    sheet = Sheet.objects.create(workbook=locked, name=name, position=position)
    locked.revision += 1
    locked.save(update_fields=("revision", "updated_at"))
    return sheet


@transaction.atomic
def update_sheet(*, sheet: Sheet, name: str) -> Sheet:
    workbook = Workbook.objects.select_for_update().get(id=sheet.workbook_id)
    locked = Sheet.objects.select_for_update().get(id=sheet.id)
    if locked.workbook.sheets.exclude(id=locked.id).filter(name=name).exists():
        raise SpreadsheetDomainError("A sheet with this name already exists.", "duplicate_name")

    locked.name = name
    locked.revision += 1
    locked.save(update_fields=("name", "revision", "updated_at"))
    workbook.revision += 1
    workbook.save(update_fields=("revision", "updated_at"))
    return locked


@transaction.atomic
def delete_sheet(*, sheet: Sheet) -> None:
    workbook = Workbook.objects.select_for_update().get(id=sheet.workbook_id)
    if workbook.sheets.count() <= 1:
        raise SpreadsheetDomainError(
            "A workbook must contain at least one sheet.",
            "last_sheet",
        )
    Sheet.objects.filter(id=sheet.id).delete()
    workbook.revision += 1
    workbook.save(update_fields=("revision", "updated_at"))


def _is_default_cell(cell: Cell) -> bool:
    return (
        cell.raw == ""
        and cell.text_color == DEFAULT_TEXT_COLOR
        and cell.background_color == DEFAULT_BACKGROUND_COLOR
        and not cell.markdown
    )


@transaction.atomic
def apply_cell_changes(*, sheet: Sheet, base_revision: int, changes: list[dict]) -> dict:
    workbook = Workbook.objects.select_for_update().get(id=sheet.workbook_id)
    locked_sheet = Sheet.objects.select_for_update().get(id=sheet.id)
    if locked_sheet.revision != base_revision:
        raise RevisionConflict(locked_sheet.revision)

    coordinates = [(change["row"], change["column"]) for change in changes]
    for row, column in coordinates:
        if row >= locked_sheet.row_count or column >= locked_sheet.column_count:
            raise SpreadsheetDomainError(
                f"Cell ({row}, {column}) is outside the sheet bounds.",
                "cell_out_of_bounds",
            )

    columns_by_row: dict[int, set[int]] = {}
    for row, column in coordinates:
        columns_by_row.setdefault(row, set()).add(column)
    coordinate_query = Q()
    for row, columns in columns_by_row.items():
        coordinate_query |= Q(row=row, column__in=columns)

    existing = {
        (cell.row, cell.column): cell
        for cell in Cell.objects.filter(
            sheet=locked_sheet,
        ).filter(
            coordinate_query,
        )
    }

    now = timezone.now()
    to_create = []
    to_update = []
    to_delete = []
    for change in changes:
        coordinate = (change["row"], change["column"])
        cell = existing.get(coordinate)
        if cell is None:
            cell = Cell(sheet=locked_sheet, row=coordinate[0], column=coordinate[1])

        if "raw" in change:
            cell.raw = change["raw"]
        cell_format = change.get("format", {})
        if "text_color" in cell_format:
            cell.text_color = cell_format["text_color"]
        if "background_color" in cell_format:
            cell.background_color = cell_format["background_color"]
        if "markdown" in cell_format:
            cell.markdown = cell_format["markdown"]

        if _is_default_cell(cell):
            if cell.pk is not None:
                to_delete.append(cell.pk)
        elif cell.pk is None:
            cell.created_at = now
            cell.updated_at = now
            to_create.append(cell)
        else:
            cell.updated_at = now
            to_update.append(cell)

    if to_delete:
        Cell.objects.filter(id__in=to_delete).delete()
    if to_create:
        Cell.objects.bulk_create(to_create)
    if to_update:
        Cell.objects.bulk_update(
            to_update,
            fields=("raw", "text_color", "background_color", "markdown", "updated_at"),
        )

    locked_sheet.revision += 1
    locked_sheet.save(update_fields=("revision", "updated_at"))
    workbook.revision += 1
    workbook.save(update_fields=("revision", "updated_at"))
    return {
        "revision": locked_sheet.revision,
        "workbook_revision": workbook.revision,
        "changed_cells": len(changes),
    }
