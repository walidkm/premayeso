# apps/api

API backend for premayeso.

## Scripts

- `npm run build`: Compile the API.
- `npm run test`: Run the workbook, attempt, and publication validation unit tests.
- `npm run test:db`: Run the DB-backed structured paper integration flow against the configured Supabase environment.

## Environment

The API expects privileged Supabase server credentials in the local environment:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

`dotenv/config` is loaded automatically, so `apps/api/.env` is used during local scripts unless the shell overrides those values.

## Migrations

Use the infra migration runner from the repo root:

```powershell
node infra/migrate.mjs
```

Connection inputs are resolved in this order:

1. `DATABASE_URL`
2. `SUPABASE_DB_URL`
3. Legacy `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD`

The runner prints the resolved target before applying SQL and verifies the structured-paper tables, indexes, and `admin_publish_paper_workbook(jsonb)` RPC after migration.
