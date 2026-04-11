# Vercel Rollout

This repo is deployed as three separate Vercel projects from the same monorepo.

## Project mapping

- `apps/web` -> `premayeso.com` and `www.premayeso.com`
- `apps/admin` -> `admin.premayeso.com`
- `apps/api` -> `api.premayeso.com`

Keep `.vercel/` directories local-only. Do not commit project linking metadata.

## Existing admin project

Keep the current Vercel project `premayeso` attached to `apps/admin`.

- Root directory: `apps/admin`
- Production domain: `admin.premayeso.com`
- Required env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_API_URL=https://api.premayeso.com`

The admin app should not own `premayeso.com` or `www.premayeso.com`.

## New public web project

Create a new Vercel project named `premayeso-web`.

- Root directory: `apps/web`
- Production domains:
  - `premayeso.com`
  - `www.premayeso.com`
- Canonical host: `premayeso.com`
- Configure `www.premayeso.com` to redirect to the apex domain
- Required env vars:
  - `API_URL=https://api.premayeso.com`
  - `NEXT_PUBLIC_API_URL=https://api.premayeso.com`
  - `NEXT_PUBLIC_ADMIN_URL=https://admin.premayeso.com`

## New API project

Create a new Vercel project named `premayeso-api`.

- Root directory: `apps/api`
- Production domain: `api.premayeso.com`
- Required env vars:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - optional `AT_API_KEY`
  - optional `AT_USERNAME`

Do not add `apps/api/vercel.json` unless a real deployment proves Fastify detection is failing.

## Safe cutover order

1. Create the new `premayeso-web` and `premayeso-api` projects.
2. Confirm preview deployments for both projects succeed.
3. Attach `api.premayeso.com` to the API project and verify `GET /health`.
4. Confirm `admin.premayeso.com` is attached only to the existing admin project.
5. Remove `premayeso.com` and `www.premayeso.com` from any non-web project.
6. Attach `premayeso.com` and `www.premayeso.com` to the web project.
7. Trigger fresh production deployments on all three projects after env vars and domains are set.

## Verification

Local checks before dashboard changes:

```powershell
cd apps/web
npm run build

cd ../admin
npm run build

cd ../api
npm test
```

Post-deploy checks:

- `https://premayeso.com/` returns the public landing page and does not redirect to admin
- `https://www.premayeso.com/` resolves to the public site and redirects to apex if configured
- `https://premayeso.com/app` redirects unauthenticated users to `/login`
- `https://premayeso.com/admin/login` redirects to `https://admin.premayeso.com/login`
- `https://admin.premayeso.com/` redirects unauthenticated users to `/login`
- `https://api.premayeso.com/health` returns `200`
- student login from the web app completes against the API without mixed-domain failures
- admin requests continue to use `NEXT_PUBLIC_API_URL`
- admin responses continue to send `X-Robots-Tag: noindex, nofollow`
