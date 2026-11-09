from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Application user; defined up front so identity can evolve safely."""

    pass


class ExternalIdentity(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="external_identities",
    )
    provider = models.CharField(max_length=32, choices=Provider.choices)
    subject = models.CharField(max_length=255)
    email_at_provider = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("provider", "subject"),
                name="users_identity_provider_subject_uniq",
            ),
            models.UniqueConstraint(
                fields=("user", "provider"),
                name="users_identity_user_provider_uniq",
            ),
        ]
    def __str__(self) -> str:
        return f"{self.provider}:{self.subject}"
