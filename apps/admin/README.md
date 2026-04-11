# Admin App

Next.js admin CMS for PreMayeso.

## Local Development

Run:

```bash
npm run dev
```

Open `http://localhost:3000` if the admin app is the only Next.js process running.

If you run the public web app at the same time, start admin on a different port:

```bash
npm run dev -- --port 3001
```

Then use `http://localhost:3001`.

## Production Build

Run:

```bash
npm run build
```

## Deployment

- This app should be deployed from the `apps/admin` directory.
- It should only own the admin surface such as `admin.premayeso.com`.
- Do not attach `premayeso.com` or `www.premayeso.com` to this app.
- `vercel.json` keeps the project on the Next.js framework preset.
- `next.config.ts` sets the monorepo root so Turbopack resolves workspace files correctly.
- Production releases are promoted by merging `dev` into `main` and pushing `main`.

## Notes

- Keep `.vercel/` local only.
- Ensure required environment variables are configured in Vercel before promoting a release.
