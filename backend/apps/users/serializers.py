from rest_framework import serializers

from .models import User


class GoogleSignInSerializer(serializers.Serializer):
    credential = serializers.CharField(max_length=4096, trim_whitespace=False)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name")
        read_only_fields = fields
