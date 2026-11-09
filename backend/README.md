# Spreadsheet backend

Django API for the spreadsheet application. The project uses Django 5.2 LTS,
Django REST Framework, PostgreSQL, and `uv` for dependency management.

## Local setup

1. Install Python 3.13 and [uv](https://docs.astral.sh/uv/).
2. Copy `.env.example` to `.env` and adjust the values.
3. Start PostgreSQL with `docker compose up -d db` or provide another
   `DATABASE_URL`.
4. Run:

   ```powershell
   uv sync
   uv run python manage.py migrate
   uv run python manage.py runserver
   ```

The API is rooted at `/api/v1/`. Health probes are available at
`/health/live/` and `/health/ready/`.

## Quality checks

```powershell
uv run ruff check .
uv run ruff format --check .
uv run pytest
uv run python manage.py check --deploy --settings=config.settings.production
```

Production must set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, and
`DATABASE_URL`. Never derive production configuration from `.env.example`.
