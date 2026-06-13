# Studio Aruo Vercel Demo

Studio Aruo's current first-version UI supports artist registration, profiles, pricing, and portfolio uploads through Vercel Blob. The Neon schema also retains legacy collaboration and review tables for future use.

## Local Development

```bash
npm install
npm run dev
```

The local frontend runs on `http://127.0.0.1:3000`.

## Production Environment Variables

Copy `.env.example` to `.env.local` for local work. Configure these production values in Vercel Project Settings:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
SESSION_SECRET="replace-with-a-long-random-secret"
SETUP_SECRET="replace-with-a-long-random-setup-secret"
BETA_USER_LIMIT="10"
VITE_API_BASE_URL=""
```

`VITE_API_BASE_URL` can stay empty when the frontend and API are deployed in the same Vercel project.

## Registration-Limit Integration Test

For development or CI only, set `REGISTRATION_LIMIT_TEST_DATABASE_URL` to a
dedicated, disposable Neon test database used exclusively by the destructive
concurrency integration test. Never point it at production.

On Windows PowerShell:

```powershell
$env:REGISTRATION_LIMIT_TEST_DATABASE_URL = "postgres://USER:PASSWORD@TEST_HOST.neon.tech/TEST_DB?sslmode=require"
npx.cmd tsx scripts/test-registration-limit-integration.ts
```

`ALLOW_SHARED_REGISTRATION_LIMIT_TEST_DB=true` is a local, one-off override that
may be used only when `DATABASE_URL` itself points to a disposable,
non-production database. Never use it against production, and never configure it
in Vercel.

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
