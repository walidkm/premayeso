# Admin App

Next.js admin CMS for PreMayeso.

## Local Development

Run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production Build

Run:

```bash
npm run build
```

## Deployment

- This app is linked to Vercel from the `apps/admin` directory.
- `vercel.json` keeps the project on the Next.js framework preset.
- `next.config.ts` sets the monorepo root so Turbopack resolves workspace files correctly.
- Production releases are promoted by merging `dev` into `main` and pushing `main`.

## Notes

- Keep `.vercel/` local only.
- Ensure required environment variables are configured in Vercel before promoting a release.
