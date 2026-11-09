# Spreadsheet backend

Django API for the spreadsheet application. It uses Django 5.2 LTS, Django
REST Framework, session authentication, Google Identity Services, and `uv` for
dependency management.

## Local setup

1. Install a supported Python version and [uv](https://docs.astral.sh/uv/).
2. Copy `.env.example` to `.env` and add the Google Web OAuth client ID.
3. Run:

   ```powershell
   uv sync
   uv run python manage.py migrate
   uv run python manage.py runserver
   ```

Local development uses SQLite by default. Production deployments must provide
a PostgreSQL `DATABASE_URL`; `compose.yaml` remains available when local
PostgreSQL-specific testing is needed.

The API is rooted at `/api/v1/`. Health probes are available at
`/health/live/` and `/health/ready/`.

## Google authentication

The backend accepts a Google Identity Services ID credential and exchanges it
for a CSRF-protected Django session. Google's immutable `sub` claim is stored
as the external identity; email is profile data, not the identity key.

1. Call `GET /api/v1/auth/csrf/` with credentials enabled.
2. Send the CSRF token in `X-CSRFToken` and the Google credential as
   `{ "credential": "..." }` to `POST /api/v1/auth/google/`.
3. Use `GET /api/v1/auth/me/` to restore the signed-in user.
4. Use `POST /api/v1/auth/logout/` with the CSRF header to end the session.

## Domain model

- `Workbook` owns sheets and tracks an optimistic-concurrency revision.
- `WorkbookPermission` grants editor or viewer access to collaborators.
- `Sheet` is ordered within a workbook and tracks its own revision.
- `Cell` stores sparse raw inputs and formatting. Computed values are derived
  by the TypeScript spreadsheet engine and are not persisted.

## Quality checks

```powershell
uv run ruff check .
uv run ruff format --check .
uv run pytest
uv run python manage.py makemigrations --check --dry-run
uv run python manage.py check --deploy --settings=config.settings.production
```

Production must set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`,
`DATABASE_URL`, and `GOOGLE_OAUTH_CLIENT_ID`.
