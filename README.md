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

```
premayeso/
  apps/
    mobile/   # Expo React Native app
    admin/    # Next.js admin panel
    api/      # Node.js backend
  docs/
  infra/
```

## Branch Workflow

- `main` → stable, production-ready code
- `dev` → active development branch

Work on `dev`, merge into `main` when stable.

## Status

Initial monorepo setup complete. Next: scaffold apps/mobile, apps/admin, and apps/api.
