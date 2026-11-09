from rest_framework import serializers


class CellCoordinateSerializer(serializers.Serializer):
    row = serializers.IntegerField(min_value=0)
    column = serializers.IntegerField(min_value=0)


class FormulaRequestSerializer(serializers.Serializer):
    sheetId = serializers.UUIDField(source="sheet_id")
    instruction = serializers.CharField(max_length=1000)
    contextCells = CellCoordinateSerializer(
        source="coordinates", many=True, max_length=20, required=False
    )
