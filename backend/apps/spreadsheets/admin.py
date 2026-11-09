from django.contrib import admin

from .models import Cell, Sheet, Workbook, WorkbookPermission


class SheetInline(admin.TabularInline):
    model = Sheet
    extra = 0
    fields = ("name", "position", "row_count", "column_count", "revision")


class WorkbookPermissionInline(admin.TabularInline):
    model = WorkbookPermission
    extra = 0


@admin.register(Workbook)
class WorkbookAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "revision", "updated_at")
    list_filter = ("created_at", "updated_at")
    search_fields = ("title", "owner__username", "owner__email")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = (SheetInline, WorkbookPermissionInline)


@admin.register(Sheet)
class SheetAdmin(admin.ModelAdmin):
    list_display = ("name", "workbook", "position", "revision", "updated_at")
    list_filter = ("created_at", "updated_at")
    search_fields = ("name", "workbook__title")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Cell)
class CellAdmin(admin.ModelAdmin):
    list_display = ("sheet", "row", "column", "raw", "updated_at")
    search_fields = ("sheet__name", "sheet__workbook__title", "raw")
    list_filter = ("markdown",)
    readonly_fields = ("created_at", "updated_at")
