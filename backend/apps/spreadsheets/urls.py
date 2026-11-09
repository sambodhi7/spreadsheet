from django.urls import path

from .views import (
    BulkCellChangeView,
    SheetCreateView,
    SheetDetailView,
    SheetSnapshotView,
    WorkbookDetailView,
    WorkbookListCreateView,
)

urlpatterns = [
    path("workbooks/", WorkbookListCreateView.as_view(), name="workbook-list"),
    path("workbooks/<uuid:workbook_id>/", WorkbookDetailView.as_view(), name="workbook-detail"),
    path(
        "workbooks/<uuid:workbook_id>/sheets/",
        SheetCreateView.as_view(),
        name="sheet-create",
    ),
    path("sheets/<uuid:sheet_id>/", SheetDetailView.as_view(), name="sheet-detail"),
    path(
        "sheets/<uuid:sheet_id>/snapshot/",
        SheetSnapshotView.as_view(),
        name="sheet-snapshot",
    ),
    path(
        "sheets/<uuid:sheet_id>/cells/",
        BulkCellChangeView.as_view(),
        name="sheet-cells",
    ),
]
