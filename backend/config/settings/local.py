from .base import *  # noqa: F403

DEBUG = True

if not SECRET_KEY:  # noqa: F405
    SECRET_KEY = "django-insecure-local-development-only"

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] += [  # noqa: F405
    "rest_framework.renderers.BrowsableAPIRenderer"
]
