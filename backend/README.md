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

## Spreadsheet API

All spreadsheet endpoints require an authenticated Django session.

```text
GET    /api/v1/workbooks/
POST   /api/v1/workbooks/
GET    /api/v1/workbooks/{workbookId}/
PATCH  /api/v1/workbooks/{workbookId}/
DELETE /api/v1/workbooks/{workbookId}/
POST   /api/v1/workbooks/{workbookId}/sheets/
PATCH  /api/v1/sheets/{sheetId}/
DELETE /api/v1/sheets/{sheetId}/
GET    /api/v1/sheets/{sheetId}/snapshot/
PATCH  /api/v1/sheets/{sheetId}/cells/
```

Cell saves are atomic batches of at most 500 unique coordinates:

```json
{
  "baseRevision": 3,
  "changes": [
    {
      "row": 0,
      "column": 0,
      "raw": "=B1+10",
      "format": {
        "textColor": "#1e293b",
        "backgroundColor": "#ffffff",
        "markdown": false
      }
    }
  ]
}
```

A stale `baseRevision` returns HTTP 409 with the current sheet revision.

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

## AI formula suggestions

Create a Gemini API key in Google AI Studio and set `GEMINI_API_KEY` in the
backend environment. This is a separate credential from the Google sign-in
OAuth client ID. The default model is `gemini-2.5-flash-lite`; override it with
`AI_MODEL` if needed. The key never belongs in the frontend.

Authenticated clients can request a suggestion without changing the sheet:

```text
POST /api/v1/ai/formula-suggestion/
```

```json
{
  "sheetId": "sheet-uuid",
  "instruction": "Sum column A",
  "contextCells": [{"row": 0, "column": 0}]
}
```

The response contains `formula` and `explanation`. Only the requested cell
coordinates (up to 20) are sent as context. The user must review and insert
the suggestion; this endpoint does not save or execute it. Provider requests
are isolated in `apps/ai/providers/` so key selection and rate policies can be
added without changing this API.
