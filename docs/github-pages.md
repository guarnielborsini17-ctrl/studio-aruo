# GitHub Pages Static Demo

This deployment publishes the frontend only. It is suitable for a public showcase/demo.

## What Works

- Gallery
- Pricing display
- Submit page UI
- Guide page
- Admin page as local demo mode

In demo mode, data is stored in the visitor's browser `localStorage`. It is not shared between devices.

## What Does Not Work

- Server-side persistence
- Shared admin data
- Real-time chat sync across devices
- Secure backend-protected admin operations

Use the cloud server deployment for production client intake.

## One-Time GitHub Setup

1. Create a GitHub repository.
2. Push this project to the repository.
3. Open repository settings.
4. Go to `Pages`.
5. Under `Build and deployment`, choose `GitHub Actions`.
6. Push to the `main` branch.

The workflow at `.github/workflows/deploy-github-pages.yml` will build and publish `dist/`.

## Optional Password Variable

In GitHub repository settings, go to:

```txt
Settings -> Secrets and variables -> Actions -> Variables
```

Add:

```txt
VITE_ADMIN_PASSWORD=your-demo-password
```

If this variable is missing, the demo password falls back to:

```txt
demo-admin
```

## Local Static Demo Build

Windows PowerShell:

```powershell
$env:VITE_STATIC_DEMO="true"
npm run build
```

Linux/macOS:

```bash
VITE_STATIC_DEMO=true npm run build
```

Preview:

```bash
npm run preview
```
