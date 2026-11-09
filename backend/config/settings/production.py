from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

required_settings = {
    "DJANGO_SECRET_KEY": SECRET_KEY,  # noqa: F405
    "DJANGO_ALLOWED_HOSTS": ALLOWED_HOSTS,  # noqa: F405
    "DATABASE_URL": env("DATABASE_URL", default=""),  # noqa: F405
    "GOOGLE_OAUTH_CLIENT_ID": GOOGLE_OAUTH_CLIENT_ID,  # noqa: F405
}
missing = [name for name, value in required_settings.items() if not value]
if missing:
    raise ImproperlyConfigured(f"Missing required production settings: {', '.join(missing)}")

DATABASES = {"default": env.db("DATABASE_URL")}  # noqa: F405
DATABASES["default"].update(CONN_MAX_AGE=60, CONN_HEALTH_CHECKS=True)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=31_536_000)  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
