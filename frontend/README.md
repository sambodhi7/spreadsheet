# Spreadsheet frontend

React and Vite client for the spreadsheet application.

## Local development

Copy `.env.example` to `.env.local`, then set the same Google Web OAuth client
ID used by Django:

```env
VITE_API_BASE_URL=/api/v1
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Start Django from `backend/`:

```powershell
uv run python manage.py migrate
uv run python manage.py runserver localhost:8000
```

Start the frontend from the repository root:

```powershell
pnpm dev
```

Open `http://localhost:5173`. That exact origin must be present in the Google
OAuth client's Authorized JavaScript origins.
Vite proxies `/api` to Django on port 8000, so browser requests remain on the
frontend origin. Production hosting should route `/api` to Django similarly.

## Persistence behavior

- Google credentials are exchanged for a CSRF-protected Django session.
- The selected sheet is loaded from the snapshot API.
- Raw values and formats update immediately in the browser.
- Changes are coalesced by coordinate and saved after 750 ms.
- Stale sheet revisions stop autosave and require a reload to avoid overwriting
  another writer's changes.

## Pages

- `/workbooks` lists every accessible workbook and supports inline renaming.
- `/workbooks/{workbookId}/sheets/{sheetId}` opens a specific sheet and supports
  workbook and sheet renaming.

Opening and leaving a workbook uses normal document navigation. Both URLs are
directly reloadable and bookmarkable rather than relying on transient in-memory
navigation state.
