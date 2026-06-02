# Studio Aruo Vercel Demo

Studio Aruo is a designer/render-artist collaboration demo. It includes role-based accounts, artist rankings, portfolio uploads through Vercel Blob, collaboration records, reviews, chicken-leg rewards, and simulated designer balance top-ups.

## Local Development

```bash
npm install
npm run dev
```

The local frontend runs on `http://127.0.0.1:3000`.

## Required Environment Variables

Copy `.env.example` to `.env.local` for local work, and configure the same values in Vercel Project Settings.

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
SESSION_SECRET="replace-with-a-long-random-secret"
SETUP_SECRET="replace-with-a-long-random-setup-secret"
VITE_API_BASE_URL=""
```

`VITE_API_BASE_URL` can stay empty when the frontend and API are deployed in the same Vercel project.

## First-Time Setup

After deployment, initialize the Neon schema once:

```bash
curl -X POST "https://your-vercel-domain.vercel.app/api/setup" \
  -H "X-Setup-Secret: replace-with-a-long-random-setup-secret"
```

## Verification

```bash
npm run lint
npm run build
```
