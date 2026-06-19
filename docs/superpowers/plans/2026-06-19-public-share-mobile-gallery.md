# Public Share Mobile Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated public share links phone-friendly, preserve uploaded image aspect ratios, remove image titles from the public gallery, add click-to-enlarge viewing, and move pricing to a second screen.

**Architecture:** Keep all public portfolio data unchanged and only adjust URL generation plus public-page presentation. The generated share URL prefers the configured public app URL when requests originate from local development. The public page uses a lightweight local lightbox state for image preview.

**Tech Stack:** Vite, React, TypeScript, Vercel Node API, Node built-in test runner.

---

### Task 1: Public Share URL

**Files:**

- Modify: `api/_lib/shareUrl.ts`
- Test: `tests/share-url.test.mjs`

- [ ] Write a failing test that `buildPublicShareUrl()` uses `APP_URL` when the request origin is `localhost`.
- [ ] Implement `APP_URL` preference for localhost/127.0.0.1 origins while preserving current production-origin behavior.
- [ ] Run `node --test tests/share-url.test.mjs`.

### Task 2: Public Portfolio Presentation

**Files:**

- Modify: `src/pages/PublicPortfolio.tsx`

- [ ] Remove public-gallery image title rendering.
- [ ] Change public-gallery image CSS from fixed `aspect-[4/3] object-cover` to natural-ratio display using `object-contain` and `h-auto`.
- [ ] Add a clicked-image lightbox with close button and background click close.
- [ ] Move pricing section into a second full-height screen below the gallery with clear spacing.

### Task 3: Verification And Deployment

**Files:**

- Commit: `api/_lib/shareUrl.ts`, `src/pages/PublicPortfolio.tsx`, `tests/share-url.test.mjs`, this plan.

- [ ] Run `node --test tests/share-url.test.mjs tests/vercel-routing.test.mjs`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Commit and push to `main`.
- [ ] Wait for Vercel production deployment and verify `/api/registration-status` returns 200.
