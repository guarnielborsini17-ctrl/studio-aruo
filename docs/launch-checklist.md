# Studio Aruo Vercel Launch Checklist

## Services

- [ ] Neon project created
- [ ] Vercel Blob store created
- [ ] GitHub repository imported into Vercel

## Environment Variables

- [ ] `DATABASE_URL`
- [ ] `BLOB_READ_WRITE_TOKEN`
- [ ] `SESSION_SECRET`
- [ ] `SETUP_SECRET`
- [ ] `BETA_USER_LIMIT="10"`
- [ ] `VITE_API_BASE_URL` left empty unless using a separate API domain

## Build Settings

- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

## Initialize Database

Run once after the first deployment:

```bash
curl -X POST "https://your-vercel-domain.vercel.app/api/setup" \
  -H "X-Setup-Secret: your-setup-secret"
```

## Smoke Test

- [ ] Open `/api/registration-status` and confirm it reports `limit`, `registered`, `remaining`, and `open`
- [ ] Register an artist account
- [ ] Artist saves profile
- [ ] Artist saves pricing
- [ ] Artist uploads one work image
- [ ] When `registered` reaches the returned `limit`, the register page hides its form and the register API returns `registration_full`

## Development/CI Concurrency Test

- [ ] Set `REGISTRATION_LIMIT_TEST_DATABASE_URL` to a dedicated, disposable Neon database used only by the destructive test
- [ ] Never point the test database at production
- [ ] Run `npx.cmd tsx scripts/test-registration-limit-integration.ts` on Windows

`ALLOW_SHARED_REGISTRATION_LIMIT_TEST_DB=true` is a local, one-off override that
may be used only when `DATABASE_URL` itself points to a disposable,
non-production database. Never use it against production, and never configure it
in Vercel.

## Local Verification

```bash
npm run lint
npm run build
```
