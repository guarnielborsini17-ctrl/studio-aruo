# Artist-Only V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present Studio Aruo as an artist-only first release while preserving dormant designer and ranking code.

**Architecture:** Add one reusable unavailable page and route all deferred surfaces to it. Remove links and artist-facing collaboration UI, and simplify registration to always create an artist account without changing backend role support.

**Tech Stack:** React 19, React Router, TypeScript, Vite.

---

### Task 1: Artist-Only Frontend Contract

**Files:**
- Create: `scripts/test-artist-only-v1.ts`

- [ ] Assert navigation contains no `/artists` link.
- [ ] Assert registration sends `role: 'artist'` and contains no role selector.
- [ ] Assert deferred routes render `FeatureUnavailable`.
- [ ] Assert artist dashboard contains no collaboration UI.
- [ ] Run the script and verify it fails before implementation.

### Task 2: Deferred Feature Routing

**Files:**
- Create: `src/pages/FeatureUnavailable.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] Create the “功能还待开放” page with links to the homepage and login.
- [ ] Route ranking, artist detail, and designer dashboard paths to that page.
- [ ] Send authenticated designer users to the unavailable page.
- [ ] Remove the ranking navigation item and renumber remaining navigation.

### Task 3: Artist-Only Content and Workbench

**Files:**
- Modify: `src/pages/Register.tsx`
- Modify: `src/pages/Guide.tsx`
- Modify: `src/pages/Pricing.tsx`
- Modify: `src/pages/ArtistDashboard.tsx`

- [ ] Remove registration role controls and always register as `artist`.
- [ ] Rewrite the guide around artist-only workflows.
- [ ] Remove the public link to artist ranking from pricing.
- [ ] Remove collaboration loading, state, and display from the artist dashboard.
- [ ] Run the contract test, TypeScript check, and production build.

### Task 4: Browser Verification

**Files:**
- No production file changes expected.

- [ ] Verify `/artists` shows “功能还待开放”.
- [ ] Verify `/register` contains no designer choice.
- [ ] Verify an existing designer account reaches the unavailable page.
- [ ] Verify an artist account still reaches the artist dashboard.
