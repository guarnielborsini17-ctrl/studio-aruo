# Hide Chicken Leg UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep review functionality while hiding all user-facing recharge and chicken-leg actions.

**Architecture:** Remove the feature only from public React views and their client imports. Leave API routes, database schema, ranking data, and scoring untouched so the feature can be restored later.

**Tech Stack:** React 19, TypeScript, Vite.

---

### Task 1: Frontend Regression Check

**Files:**
- Create: `scripts/test-hidden-chicken-leg-ui.ts`

- [ ] Assert the designer dashboard, guide, register page, and artist profile contain no recharge or chicken-leg UI copy or client calls.
- [ ] Run the script and verify it fails before the UI changes.

### Task 2: Remove User-Facing Actions

**Files:**
- Modify: `src/pages/DesignerDashboard.tsx`
- Modify: `src/pages/Guide.tsx`
- Modify: `src/pages/Register.tsx`
- Modify: `src/pages/ArtistProfile.tsx`

- [ ] Remove balance and recharge state, handlers, imports, and markup.
- [ ] Remove chicken-leg draft fields, handlers, imports, and markup.
- [ ] Expand the review form to the available width.
- [ ] Replace all affected copy with review-only language.
- [ ] Run the regression script, TypeScript check, and production build.

### Task 3: Browser Verification

**Files:**
- No production file changes expected.

- [ ] Open the service guide and confirm the card says “合作后评价”.
- [ ] Open a designer dashboard and confirm only the review form remains.
- [ ] Open the ranking and confirm historical chicken-leg metrics remain visible.
