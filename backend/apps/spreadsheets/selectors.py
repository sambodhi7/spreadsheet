from django.db.models import Q
from django.http import Http404

from .models import Sheet, Workbook, WorkbookPermission


def workbooks_for_user(user):
    return (
        Workbook.objects.filter(Q(owner=user) | Q(permissions__user=user))
        .select_related("owner")
        .prefetch_related("permissions", "sheets")
        .distinct()
    )


def workbook_for_user(user, workbook_id, *, edit: bool = False, owner: bool = False):
    queryset = Workbook.objects.select_related("owner").prefetch_related("permissions", "sheets")
    if owner:
        queryset = queryset.filter(owner=user)
    elif edit:
        queryset = queryset.filter(
            Q(owner=user)
            | Q(permissions__user=user, permissions__role=WorkbookPermission.Role.EDITOR)
        )
    else:
        queryset = queryset.filter(Q(owner=user) | Q(permissions__user=user))

    try:
        return queryset.distinct().get(id=workbook_id)
    except (Workbook.DoesNotExist, ValueError) as exc:
        raise Http404 from exc


def sheet_for_user(user, sheet_id, *, edit: bool = False, with_cells: bool = False):
    queryset = Sheet.objects.select_related("workbook", "workbook__owner").prefetch_related(
        "workbook__permissions"
    )
    if with_cells:
        queryset = queryset.prefetch_related("cells")

    if edit:
        queryset = queryset.filter(
            Q(workbook__owner=user)
            | Q(
                workbook__permissions__user=user,
                workbook__permissions__role=WorkbookPermission.Role.EDITOR,
            )
        )
    else:
        queryset = queryset.filter(
            Q(workbook__owner=user) | Q(workbook__permissions__user=user)
        )

    try:
        return queryset.distinct().get(id=sheet_id)
    except (Sheet.DoesNotExist, ValueError) as exc:
        raise Http404 from exc
