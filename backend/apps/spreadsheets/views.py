from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .errors import RevisionConflict, SpreadsheetDomainError
from .selectors import sheet_for_user, workbook_for_user, workbooks_for_user
from .serializers import (
    BulkCellChangeSerializer,
    SheetCreateSerializer,
    SheetSnapshotSerializer,
    SheetSummarySerializer,
    SheetUpdateSerializer,
    WorkbookCreateSerializer,
    WorkbookSerializer,
    WorkbookUpdateSerializer,
)
from .services import (
    apply_cell_changes,
    create_sheet,
    create_workbook,
    delete_sheet,
    update_sheet,
    update_workbook,
)


def _domain_error_response(exc: SpreadsheetDomainError) -> Response:
    return Response(
        {"detail": exc.detail, "code": exc.code},
        status=status.HTTP_400_BAD_REQUEST,
    )


class WorkbookListCreateView(APIView):
    def get(self, request):
        workbooks = workbooks_for_user(request.user)
        return Response(WorkbookSerializer(workbooks, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = WorkbookCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workbook = create_workbook(owner=request.user, **serializer.validated_data)
        workbook = workbook_for_user(request.user, workbook.id)
        return Response(
            WorkbookSerializer(workbook, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class WorkbookDetailView(APIView):
    def get(self, request, workbook_id):
        workbook = workbook_for_user(request.user, workbook_id)
        return Response(WorkbookSerializer(workbook, context={"request": request}).data)

    def patch(self, request, workbook_id):
        workbook = workbook_for_user(request.user, workbook_id, edit=True)
        serializer = WorkbookUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workbook = update_workbook(workbook=workbook, **serializer.validated_data)
        workbook = workbook_for_user(request.user, workbook.id)
        return Response(WorkbookSerializer(workbook, context={"request": request}).data)

    def delete(self, request, workbook_id):
        workbook = workbook_for_user(request.user, workbook_id, owner=True)
        workbook.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SheetCreateView(APIView):
    def post(self, request, workbook_id):
        workbook = workbook_for_user(request.user, workbook_id, edit=True)
        serializer = SheetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            sheet = create_sheet(workbook=workbook, **serializer.validated_data)
        except SpreadsheetDomainError as exc:
            return _domain_error_response(exc)
        return Response(SheetSummarySerializer(sheet).data, status=status.HTTP_201_CREATED)


class SheetDetailView(APIView):
    def patch(self, request, sheet_id):
        sheet = sheet_for_user(request.user, sheet_id, edit=True)
        serializer = SheetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            sheet = update_sheet(sheet=sheet, **serializer.validated_data)
        except SpreadsheetDomainError as exc:
            return _domain_error_response(exc)
        return Response(SheetSummarySerializer(sheet).data)

    def delete(self, request, sheet_id):
        sheet = sheet_for_user(request.user, sheet_id, edit=True)
        try:
            delete_sheet(sheet=sheet)
        except SpreadsheetDomainError as exc:
            return _domain_error_response(exc)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SheetSnapshotView(APIView):
    def get(self, request, sheet_id):
        sheet = sheet_for_user(request.user, sheet_id, with_cells=True)
        payload = {"sheet": sheet, "cells": sheet.cells.all()}
        return Response(SheetSnapshotSerializer(payload).data)


class BulkCellChangeView(APIView):
    def patch(self, request, sheet_id):
        sheet = sheet_for_user(request.user, sheet_id, edit=True)
        serializer = BulkCellChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = apply_cell_changes(sheet=sheet, **serializer.validated_data)
        except RevisionConflict as exc:
            return Response(
                {
                    "detail": exc.detail,
                    "code": exc.code,
                    "currentRevision": exc.current_revision,
                },
                status=status.HTTP_409_CONFLICT,
            )
        except SpreadsheetDomainError as exc:
            return _domain_error_response(exc)
        return Response(
            {
                "revision": result["revision"],
                "workbookRevision": result["workbook_revision"],
                "changedCells": result["changed_cells"],
            }
        )
