# PreMayeso

Malawi MANEB exam-learning platform.

## Apps

- **mobile**: Expo React Native learner app
- **admin**: Next.js admin CMS
- **api**: Node.js backend

## Local Setup

- `apps/mobile` reads `EXPO_PUBLIC_API_URL` from its environment. For a physical device, use your machine's LAN URL such as `http://192.168.1.4:4000`.
- `apps/admin` uses Supabase Auth for sign-in and only allows users whose `public.users.role` is `admin`.

## Structure

```text
premayeso/
  apps/
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

- `apps/admin` is the production web deployment and is linked to Vercel from the `apps/admin` directory.
- Release flow is:
  1. verify the release on `dev`
  2. fast-forward `main` from `dev`
  3. push `main` to trigger the production deployment
- Before promoting to `main`, verify:
  - `cd apps/admin && npm run build`
  - `cd apps/api && npm test`
  - required DB migrations are applied if the release depends on new structured-paper objects such as `admin_publish_paper_workbook(jsonb)`
