# Studio Aruo Vercel Deployment

This branch targets a Vercel demo deployment with:

- Vercel frontend and serverless API routes
- Neon Postgres for artist accounts, profiles, works, and pricing
- Vercel Blob for portfolio image uploads

## 1. Create Services

1. Create a Neon project and copy its pooled Postgres connection string.
2. Create a Vercel Blob store and copy `BLOB_READ_WRITE_TOKEN`.
3. Import the GitHub repository into Vercel.

## 2. Configure Vercel Environment Variables

Set these in Vercel Project Settings:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
SESSION_SECRET="use-a-long-random-string"
SETUP_SECRET="use-a-different-long-random-string"
BETA_USER_LIMIT="10"
VITE_API_BASE_URL=""
```

Keep `VITE_API_BASE_URL` empty when the frontend and API are in the same Vercel project.

`REGISTRATION_LIMIT_TEST_DATABASE_URL` is optional and CI-only. When running the
destructive registration-limit concurrency integration test, set it to a dedicated
Neon test database that is used only by that test. Never point it at production.

`ALLOW_SHARED_REGISTRATION_LIMIT_TEST_DB=true` is a local, one-off override for
deliberately running against the same database as `DATABASE_URL`. Do not configure
this override in Vercel.

## 3. Deploy

Vercel should use:

```text
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

The repository also includes `vercel.json` with the same build settings.

## 4. Initialize Database

After the first deployment succeeds, call setup once:

```bash
curl -X POST "https://your-vercel-domain.vercel.app/api/setup" \
  -H "X-Setup-Secret: use-a-different-long-random-string"
```

Expected response:

```json
{ "ok": true }
```

## 5. Smoke Test

1. Open `/api/registration-status` and confirm the response includes `limit`, `registered`, `remaining`, and `open`.
2. Register one artist account.
3. Log in as the artist, edit the profile, save pricing, and upload a portfolio image.
4. When `registered` reaches 10, confirm `/#/register` hides the registration form and the register API returns `registration_full`.

## 6. Run The Registration-Limit Concurrency Test

Run this destructive integration test only with a dedicated Neon test database:

```powershell
$env:REGISTRATION_LIMIT_TEST_DATABASE_URL = "postgres://USER:PASSWORD@TEST_HOST.neon.tech/TEST_DB?sslmode=require"
npx tsx scripts/test-registration-limit-integration.ts
```

Do not use a production database for this command.

## 7. Update Deployment

Push new commits to the deployed branch. Vercel will rebuild automatically.
