# PreMayeso

Malawi MANEB exam-learning platform.

## Apps

- **mobile**: Expo React Native learner app
- **admin**: Next.js admin CMS
- **api**: Node.js backend

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
