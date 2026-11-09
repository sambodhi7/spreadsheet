import hashlib
from dataclasses import dataclass
from functools import lru_cache

from django.conf import settings
from django.db import IntegrityError, transaction

from ..models import ExternalIdentity, User


class GoogleSignInError(Exception):
    """Raised when a Google credential cannot be trusted or used."""


@dataclass(frozen=True)
class GoogleProfile:
    subject: str
    email: str
    first_name: str
    last_name: str


@lru_cache(maxsize=1)
def _google_request():
    import requests
    from cachecontrol import CacheControl
    from google.auth.transport.requests import Request

    return Request(session=CacheControl(requests.Session()))


def verify_google_credential(credential: str) -> GoogleProfile:
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise GoogleSignInError("Google authentication is not configured")

    try:
        from google.auth.exceptions import GoogleAuthError
        from google.oauth2.id_token import verify_oauth2_token
    except ImportError as exc:
        raise GoogleSignInError("Google authentication is unavailable") from exc

    try:
        claims = verify_oauth2_token(
            credential,
            _google_request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except (GoogleAuthError, ValueError) as exc:
        raise GoogleSignInError("Invalid Google credential") from exc

    subject = claims.get("sub")
    email = claims.get("email")
    if not subject or not email or claims.get("email_verified") is not True:
        raise GoogleSignInError("Google account must have a verified email address")

    return GoogleProfile(
        subject=subject,
        email=email,
        first_name=claims.get("given_name", ""),
        last_name=claims.get("family_name", ""),
    )


def _username_for(subject: str) -> str:
    digest = hashlib.sha256(subject.encode()).hexdigest()[:32]
    return f"google_{digest}"


def _sync_profile(user: User, profile: GoogleProfile) -> None:
    changed_fields = []
    for field, value in (
        ("email", profile.email),
        ("first_name", profile.first_name),
        ("last_name", profile.last_name),
    ):
        if getattr(user, field) != value:
            setattr(user, field, value)
            changed_fields.append(field)
    if changed_fields:
        user.save(update_fields=changed_fields)


def get_or_create_google_user(profile: GoogleProfile) -> User:
    provider = ExternalIdentity.Provider.GOOGLE
    identity = (
        ExternalIdentity.objects.select_related("user")
        .filter(provider=provider, subject=profile.subject)
        .first()
    )
    if identity is not None:
        if not identity.user.is_active:
            raise GoogleSignInError("User account is disabled")
        _sync_profile(identity.user, profile)
        if identity.email_at_provider != profile.email:
            identity.email_at_provider = profile.email
            identity.save(update_fields=("email_at_provider", "updated_at"))
        return identity.user

    try:
        with transaction.atomic():
            user = User(username=_username_for(profile.subject))
            user.set_unusable_password()
            user.email = profile.email
            user.first_name = profile.first_name
            user.last_name = profile.last_name
            user.save()
            ExternalIdentity.objects.create(
                user=user,
                provider=provider,
                subject=profile.subject,
                email_at_provider=profile.email,
            )
            return user
    except IntegrityError:
        identity = ExternalIdentity.objects.select_related("user").get(
            provider=provider,
            subject=profile.subject,
        )
        if not identity.user.is_active:
            raise GoogleSignInError("User account is disabled")
        _sync_profile(identity.user, profile)
        return identity.user
