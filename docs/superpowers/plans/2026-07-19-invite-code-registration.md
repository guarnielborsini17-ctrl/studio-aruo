# Invite Code Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require an invite/application code for new registrations, preserve `1723670343` as a permanent account, and create nine one-time beta invite codes.

**Architecture:** Extend the existing registration-limit layer with an `invite_codes` table and a `users.account_type` column. Registration becomes a single locked transaction that validates and consumes one invite code before inserting the user. The register page sends the code and displays code-specific errors.

**Tech Stack:** TypeScript, React, Vite, Neon Postgres, Vercel-style API handlers, local API runner.

---

### Task 1: Backend Invite-Code Registration

**Files:**
- Modify: `api/_lib/db.ts`
- Modify: `api/_lib/registrationLimit.ts`
- Modify: `api/_handlers/auth/register.ts`
- Modify: `src/types/platform.ts`
- Test: `scripts/test-registration-limit.ts`

- [ ] Write failing assertions that require invite-code schema, invite-code registration input, code-specific errors, and permanent account mapping.
- [ ] Implement `users.account_type` and `invite_codes`.
- [ ] Change registration to require an invite code, consume it once, and return `invalid_invite_code` or `invite_code_used`.
- [ ] Mark `1723670343` as `permanent`.

### Task 2: Frontend Registration Form

**Files:**
- Modify: `src/types/platform.ts`
- Modify: `src/pages/Register.tsx`

- [ ] Write failing assertions for the register page application-code field and error copy.
- [ ] Add `inviteCode` to the register payload.
- [ ] Add a visible application-code input and map backend errors to Chinese UI text.

### Task 3: Seed And Verify

**Files:**
- Create: `scripts/seed-invite-codes.ts`
- Modify: `package.json`

- [ ] Add a script that upserts nine one-time invite codes and marks `1723670343` as permanent.
- [ ] Run lint/build and the registration tests.
- [ ] Deploy to the Tencent server and run the seed script against production.
