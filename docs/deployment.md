# Studio Aruo Vercel Deployment

This branch targets a Vercel demo deployment with:

- Vercel frontend and serverless API routes
- Neon Postgres for accounts, works, pricing, collaborations, reviews, and chicken legs
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
VITE_API_BASE_URL=""
```

Keep `VITE_API_BASE_URL` empty when the frontend and API are in the same Vercel project.

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

1. Register one designer account.
2. Register one render artist account.
3. Log in as the artist, edit profile, save pricing, upload a portfolio image.
4. Log in as the designer, open the artist ranking, create a collaboration.
5. Return to the designer dashboard, top up balance, write a review, and give chicken legs.

## 6. Update Deployment

Push new commits to the deployed branch. Vercel will rebuild automatically.
