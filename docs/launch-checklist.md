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

- [ ] Register a designer account
- [ ] Register a render artist account
- [ ] Artist saves profile
- [ ] Artist saves pricing
- [ ] Artist uploads one work image
- [ ] Designer opens artist ranking
- [ ] Designer creates a collaboration
- [ ] Designer tops up balance
- [ ] Designer writes a review
- [ ] Designer gives chicken legs

## Local Verification

```bash
npm run lint
npm run build
```
