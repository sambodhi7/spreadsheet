import uuid

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

from apps.common.models import TimeStampedModel

MAX_SHEET_ROWS = 1_048_576
MAX_SHEET_COLUMNS = 16_384

hex_color_validator = RegexValidator(
    regex=r"^#[0-9a-fA-F]{6}$",
    message="Enter a color in #RRGGBB format.",
)


class Workbook(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_workbooks",
    )
    title = models.CharField(max_length=255, default="Untitled workbook")
    revision = models.PositiveBigIntegerField(default=0)
    collaborators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="WorkbookPermission",
        related_name="shared_workbooks",
        blank=True,
    )

    class Meta:
        ordering = ("-updated_at", "-created_at")

    def __str__(self) -> str:
        return self.title


class WorkbookPermission(TimeStampedModel):
    class Role(models.TextChoices):
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    workbook = models.ForeignKey(
        Workbook,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workbook_permissions",
    )
    role = models.CharField(max_length=16, choices=Role.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("workbook", "user"),
                name="spreadsheets_workbook_user_permission_uniq",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} — {self.workbook} ({self.role})"


class Sheet(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workbook = models.ForeignKey(Workbook, on_delete=models.CASCADE, related_name="sheets")
    name = models.CharField(max_length=100)
    position = models.PositiveIntegerField()
    row_count = models.PositiveIntegerField(default=1_000)
    column_count = models.PositiveIntegerField(default=26)
    revision = models.PositiveBigIntegerField(default=0)

    class Meta:
        ordering = ("position",)
        constraints = [
            models.UniqueConstraint(
                fields=("workbook", "position"),
                name="spreadsheets_sheet_position_uniq",
            ),
            models.UniqueConstraint(
                fields=("workbook", "name"),
                name="spreadsheets_sheet_name_uniq",
            ),
            models.CheckConstraint(
                condition=models.Q(row_count__gte=1, row_count__lte=MAX_SHEET_ROWS),
                name="spreadsheets_sheet_row_count_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    column_count__gte=1,
                    column_count__lte=MAX_SHEET_COLUMNS,
                ),
                name="spreadsheets_sheet_column_count_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.workbook}: {self.name}"


class Cell(TimeStampedModel):
    sheet = models.ForeignKey(Sheet, on_delete=models.CASCADE, related_name="cells")
    row = models.PositiveIntegerField()
    column = models.PositiveIntegerField()
    raw = models.TextField(blank=True, default="")
    text_color = models.CharField(
        max_length=7,
        default="#1e293b",
        validators=(hex_color_validator,),
    )
    background_color = models.CharField(
        max_length=7,
        default="#ffffff",
        validators=(hex_color_validator,),
    )
    markdown = models.BooleanField(default=False)

    class Meta:
        ordering = ("row", "column")
        constraints = [
            models.UniqueConstraint(
                fields=("sheet", "row", "column"),
                name="spreadsheets_cell_coordinate_uniq",
            ),
            models.CheckConstraint(
                condition=models.Q(row__gte=0, row__lt=MAX_SHEET_ROWS),
                name="spreadsheets_cell_row_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(column__gte=0, column__lt=MAX_SHEET_COLUMNS),
                name="spreadsheets_cell_column_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.sheet_id}[{self.row},{self.column}]"
