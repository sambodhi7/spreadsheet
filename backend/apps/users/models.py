from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Application user; defined up front so identity can evolve safely."""

    pass
