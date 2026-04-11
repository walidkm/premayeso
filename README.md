# PreMayeso

Malawi MANEB exam-learning platform.

## Apps

- **web**: Next.js public landing page and learner web app
- **mobile**: Expo React Native learner app
- **admin**: Next.js admin CMS
- **api**: Node.js backend

## Local Setup

- `apps/web` uses `API_URL` or `NEXT_PUBLIC_API_URL` for the backend and `NEXT_PUBLIC_ADMIN_URL` for the admin subdomain.
- `apps/mobile` reads `EXPO_PUBLIC_API_URL` from its environment. For a physical device, use your machine's LAN URL such as `http://192.168.1.4:4000`.
- `apps/admin` uses Supabase Auth for sign-in and only allows canonical admin roles such as `content_author`, `reviewer`, `platform_admin`, and `super_admin`.
- do not commit `.vercel/` directories; Vercel project linking stays local to each machine

## Structure

```text
premayeso/
  apps/
    web/      # Public marketing site and learner web app
    mobile/   # Expo React Native app
    admin/    # Next.js admin panel
    api/      # Node.js backend
  docs/
  infra/
```

## Branch Workflow

- `main` -> stable, production-ready code
- `dev` -> active development branch

Work on `dev`, merge into `main` when stable.

## Deployment

- Vercel projects are split by app root:
  - `apps/web` -> `premayeso.com` and `www.premayeso.com`
  - `apps/admin` -> `admin.premayeso.com`
  - `apps/api` -> `api.premayeso.com`
- Keep the existing Vercel project `premayeso` attached to `apps/admin`.
- Create separate Vercel projects for `apps/web` and `apps/api`; do not route all domains through one project.
- Configure preview and production environment variables per Vercel project, not via committed `.vercel/project.json`.
- Detailed dashboard rollout steps live in [docs/vercel-rollout.md](/Users/Walid/OneDrive/Belgeler/GitHub/premayeso/docs/vercel-rollout.md).
- Release flow is:
  1. verify the release on `dev`
  2. fast-forward `main` from `dev`
  3. push `main` to trigger the production deployment
- Before promoting to `main`, verify:
  - `cd apps/web && npm run build`
  - `cd apps/admin && npm run build`
  - `cd apps/api && npm test`
  - required DB migrations are applied if the release depends on new identity, waitlist, or structured-paper changes
