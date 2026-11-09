from rest_framework import serializers

from .models import Cell, Sheet, Workbook, hex_color_validator


class SheetSummarySerializer(serializers.ModelSerializer):
    rowCount = serializers.IntegerField(source="row_count", read_only=True)
    columnCount = serializers.IntegerField(source="column_count", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Sheet
        fields = (
            "id",
            "name",
            "position",
            "rowCount",
            "columnCount",
            "revision",
            "createdAt",
            "updatedAt",
        )


class WorkbookSerializer(serializers.ModelSerializer):
    sheets = SheetSummarySerializer(many=True, read_only=True)
    access = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Workbook
        fields = ("id", "title", "revision", "access", "sheets", "createdAt", "updatedAt")

    def get_access(self, workbook) -> str:
        user = self.context["request"].user
        if workbook.owner_id == user.id:
            return "owner"
        permission = next(
            (item for item in workbook.permissions.all() if item.user_id == user.id),
            None,
        )
        return permission.role if permission is not None else "none"


class WorkbookCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, default="Untitled workbook")


class WorkbookUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)


class SheetCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)


class SheetUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)


class CellFormatSerializer(serializers.Serializer):
    textColor = serializers.CharField(
        source="text_color",
        max_length=7,
        validators=(hex_color_validator,),
        required=False,
    )
    backgroundColor = serializers.CharField(
        source="background_color",
        max_length=7,
        validators=(hex_color_validator,),
        required=False,
    )
    markdown = serializers.BooleanField(required=False)


class CellChangeSerializer(serializers.Serializer):
    row = serializers.IntegerField(min_value=0)
    column = serializers.IntegerField(min_value=0)
    raw = serializers.CharField(max_length=100_000, allow_blank=True, required=False)
    format = CellFormatSerializer(required=False)

    def validate(self, attrs):
        if "raw" not in attrs and not attrs.get("format"):
            raise serializers.ValidationError("A raw value or format change is required.")
        return attrs


class BulkCellChangeSerializer(serializers.Serializer):
    baseRevision = serializers.IntegerField(source="base_revision", min_value=0)
    changes = CellChangeSerializer(many=True, allow_empty=False, max_length=1_000)

    def validate_changes(self, changes):
        coordinates = [(change["row"], change["column"]) for change in changes]
        if len(coordinates) != len(set(coordinates)):
            raise serializers.ValidationError("Each cell may appear only once per request.")
        return changes


class CellSerializer(serializers.ModelSerializer):
    format = serializers.SerializerMethodField()

    class Meta:
        model = Cell
        fields = ("row", "column", "raw", "format")

    def get_format(self, cell) -> dict:
        return {
            "textColor": cell.text_color,
            "backgroundColor": cell.background_color,
            "markdown": cell.markdown,
        }


class SheetSnapshotSerializer(serializers.Serializer):
    sheet = SheetSummarySerializer()
    cells = CellSerializer(many=True)
