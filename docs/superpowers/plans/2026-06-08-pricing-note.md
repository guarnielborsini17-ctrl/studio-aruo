# Pricing Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed pricing-page notice with artist-authored text saved from the workbench.

**Architecture:** Store one `pricing_note` value on each user, expose it through existing profile responses, and update it through the existing profile endpoint. The artist dashboard edits it beside package pricing, while the pricing page reads it from the authenticated user.

**Tech Stack:** React 19, TypeScript, Vite, Vercel functions, Neon Postgres.

---

### Task 1: Persist Pricing Note

**Files:**
- Modify: `api/_lib/db.ts`
- Modify: `api/profile.ts`
- Modify: `src/types/platform.ts`
- Modify: `src/lib/platformApi.ts`
- Create: `scripts/test-pricing-note-mapping.ts`

- [ ] Write a failing mapping test asserting `mapUser` exposes `pricingNote`.
- [ ] Add `pricing_note` to the schema and user mapping.
- [ ] Accept `pricingNote` in the profile endpoint and client helper.
- [ ] Run the test and TypeScript check.

### Task 2: Connect Workbench and Pricing Page

**Files:**
- Modify: `src/pages/ArtistDashboard.tsx`
- Modify: `src/pages/Pricing.tsx`

- [ ] Add controlled workbench textarea initialized from `user.pricingNote`.
- [ ] Save the note with the existing profile update when package pricing is saved.
- [ ] Render the note in the pricing-page information box with whitespace preserved.
- [ ] Run production build and browser verification.

### Task 3: Migrate Local Neon Database

**Files:**
- No permanent file changes expected.

- [ ] Run `setupSchema()` against `.env.local`.
- [ ] Save a note through the UI and verify it survives reload.
- [ ] Verify clearing the note restores the default text.
