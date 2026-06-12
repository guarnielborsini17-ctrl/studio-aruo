# Beta Registration Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit the first Studio Aruo beta to 10 total accounts, expose remaining capacity publicly, and reject the 11th registration even when requests arrive concurrently.

**Architecture:** Keep Neon `users` as the source of truth and add a small registration-capacity module shared by the status and register endpoints. Registration uses one SQL statement containing `pg_advisory_xact_lock`, the count, and the conditional insert, so the capacity decision and insert are serialized atomically. The React registration page treats the status endpoint as display data while preserving the register endpoint as the final authority.

**Tech Stack:** React 19, TypeScript, Vercel Functions, Neon Postgres, Express local Vercel adapter, Node assertion scripts via `tsx`.

---

## File Structure

- Create `api/_lib/registrationLimit.ts`: parse the configured limit, calculate public status, and perform the locked conditional insert.
- Create `api/registration-status.ts`: public read-only capacity endpoint.
- Modify `api/auth/register.ts`: call the atomic registration helper and map `full` and duplicate-user outcomes.
- Modify `scripts/local-api-dev.ts`: expose the new Vercel handler during local development.
- Modify `src/types/platform.ts`: define the registration status response.
- Modify `src/lib/platformApi.ts`: fetch registration status.
- Modify `src/pages/Register.tsx`: show remaining slots or the full state and handle the final-slot race.
- Create `scripts/test-registration-limit.ts`: verify pure capacity rules and frontend/API wiring.
- Create `scripts/test-registration-limit-integration.ts`: verify two concurrent registrations cannot consume one remaining slot twice.
- Modify `.env.example`: document `BETA_USER_LIMIT`.
- Modify `docs/deployment.md`: document Vercel configuration and post-deploy checks.

### Task 1: Define Registration Capacity Rules

**Files:**
- Create: `api/_lib/registrationLimit.ts`
- Create: `scripts/test-registration-limit.ts`

- [ ] **Step 1: Write failing limit and status tests**

Create `scripts/test-registration-limit.ts`:

```ts
import assert from 'node:assert/strict';
import {
  getBetaUserLimit,
  toRegistrationStatus,
} from '../api/_lib/registrationLimit';

assert.equal(getBetaUserLimit(undefined), 10);
assert.equal(getBetaUserLimit(''), 10);
assert.equal(getBetaUserLimit('abc'), 10);
assert.equal(getBetaUserLimit('0'), 10);
assert.equal(getBetaUserLimit('-2'), 10);
assert.equal(getBetaUserLimit('8.5'), 10);
assert.equal(getBetaUserLimit('12'), 12);

assert.deepEqual(toRegistrationStatus(0, 10), {
  limit: 10,
  registered: 0,
  remaining: 10,
  open: true,
});
assert.deepEqual(toRegistrationStatus(9, 10), {
  limit: 10,
  registered: 9,
  remaining: 1,
  open: true,
});
assert.deepEqual(toRegistrationStatus(10, 10), {
  limit: 10,
  registered: 10,
  remaining: 0,
  open: false,
});
assert.deepEqual(toRegistrationStatus(13, 10), {
  limit: 10,
  registered: 13,
  remaining: 0,
  open: false,
});

console.log('registration limit assertions passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
```

Expected: FAIL because `api/_lib/registrationLimit.ts` does not exist.

- [ ] **Step 3: Implement configuration parsing and status calculation**

Create `api/_lib/registrationLimit.ts` with:

```ts
import { sql } from './db';

export type RegistrationStatus = {
  limit: number;
  registered: number;
  remaining: number;
  open: boolean;
};

export function getBetaUserLimit(value = process.env.BETA_USER_LIMIT) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
}

export function toRegistrationStatus(
  registered: number,
  limit = getBetaUserLimit()
): RegistrationStatus {
  const safeRegistered = Math.max(0, Math.trunc(registered));
  const remaining = Math.max(0, limit - safeRegistered);
  return {
    limit,
    registered: safeRegistered,
    remaining,
    open: remaining > 0,
  };
}

export async function readRegistrationStatus() {
  const rows = await sql`SELECT COUNT(*)::int AS registered FROM users`;
  return toRegistrationStatus(Number(rows[0]?.registered || 0));
}
```

Do not accept a limit from the request body or query string.

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
npm run lint
```

Expected: the script prints `registration limit assertions passed`; TypeScript exits with code 0.

- [ ] **Step 5: Commit the capacity rules**

```powershell
git add api/_lib/registrationLimit.ts scripts/test-registration-limit.ts
git commit -m "feat: define beta registration capacity"
```

### Task 2: Add The Public Registration Status Endpoint

**Files:**
- Create: `api/registration-status.ts`
- Modify: `scripts/local-api-dev.ts`
- Modify: `scripts/test-registration-limit.ts`

- [ ] **Step 1: Add failing endpoint wiring assertions**

Append to `scripts/test-registration-limit.ts`:

```ts
import { readFile } from 'node:fs/promises';

const endpointSource = await readFile('api/registration-status.ts', 'utf8');
assert.equal(endpointSource.includes("requireMethod(req, res, ['GET'])"), true);
assert.equal(endpointSource.includes('readRegistrationStatus()'), true);

const localAdapterSource = await readFile('scripts/local-api-dev.ts', 'utf8');
assert.equal(
  localAdapterSource.includes(
    "route('get', '/api/registration-status', 'api/registration-status.ts')"
  ),
  true
);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
```

Expected: FAIL because `api/registration-status.ts` is missing.

- [ ] **Step 3: Implement the endpoint**

Create `api/registration-status.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRegistrationStatus } from './_lib/registrationLimit';
import { requireMethod, sendJson } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) {
    return;
  }

  sendJson(res, 200, await readRegistrationStatus());
}
```

- [ ] **Step 4: Expose the endpoint in the local Vercel adapter**

Add this route immediately after `/api/setup` in `scripts/local-api-dev.ts`:

```ts
route('get', '/api/registration-status', 'api/registration-status.ts');
```

- [ ] **Step 5: Run focused verification**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
npm run lint
```

Expected: the script and TypeScript pass.

- [ ] **Step 6: Commit the status endpoint**

```powershell
git add api/registration-status.ts scripts/local-api-dev.ts scripts/test-registration-limit.ts
git commit -m "feat: expose beta registration status"
```

### Task 3: Make Registration Atomic Under Concurrency

**Files:**
- Modify: `api/_lib/registrationLimit.ts`
- Modify: `api/auth/register.ts`
- Create: `scripts/test-registration-limit-integration.ts`
- Modify: `scripts/test-registration-limit.ts`

- [ ] **Step 1: Add the atomic registration result contract**

Append these assertions to `scripts/test-registration-limit.ts` after importing `REGISTER_USER_LOCK_ID`:

```ts
import { REGISTER_USER_LOCK_ID } from '../api/_lib/registrationLimit';

assert.equal(typeof REGISTER_USER_LOCK_ID, 'number');
assert.equal(Number.isSafeInteger(REGISTER_USER_LOCK_ID), true);
```

The helper result must be:

```ts
export type LimitedRegistrationResult =
  | { kind: 'created'; row: Record<string, unknown> }
  | { kind: 'full' };
```

- [ ] **Step 2: Implement the locked conditional insert**

In `api/_lib/registrationLimit.ts`, add:

```ts
export const REGISTER_USER_LOCK_ID = 734981245;

export type LimitedRegistrationInput = {
  username: string;
  passwordHash: string;
  role: 'designer' | 'artist';
  displayName: string;
  limit?: number;
};

export type LimitedRegistrationResult =
  | { kind: 'created'; row: Record<string, unknown> }
  | { kind: 'full' };

export async function registerUserWithinLimit(
  input: LimitedRegistrationInput
): Promise<LimitedRegistrationResult> {
  const limit = input.limit ?? getBetaUserLimit();
  const rows = await sql`
    WITH registration_lock AS (
      SELECT pg_advisory_xact_lock(${REGISTER_USER_LOCK_ID})
    ),
    capacity AS (
      SELECT COUNT(*)::int AS registered
      FROM users
      CROSS JOIN registration_lock
    ),
    inserted AS (
      INSERT INTO users (username, password_hash, role, display_name)
      SELECT
        ${input.username},
        ${input.passwordHash},
        ${input.role},
        ${input.displayName}
      FROM capacity
      WHERE registered < ${limit}
      RETURNING *
    )
    SELECT inserted.*
    FROM inserted
  `;

  return rows[0]
    ? { kind: 'created', row: rows[0] as Record<string, unknown> }
    : { kind: 'full' };
}
```

The `registration_lock` CTE must remain referenced by `capacity`; otherwise PostgreSQL may not execute it.

- [ ] **Step 3: Route registration through the helper**

In `api/auth/register.ts`:

1. Import `registerUserWithinLimit`.
2. Replace the direct `INSERT` with:

```ts
const result = await registerUserWithinLimit({
  username,
  passwordHash: hashPassword(password),
  role,
  displayName,
});

if (result.kind === 'full') {
  sendJson(res, 409, { error: 'registration_full' });
  return;
}

const user = mapUser(result.row as Parameters<typeof mapUser>[0]);
sendJson(res, 201, { user, token: createSessionToken(user) });
```

3. Preserve the existing PostgreSQL `23505` mapping to `username_exists`.

- [ ] **Step 4: Write the real concurrency integration script**

Create `scripts/test-registration-limit-integration.ts`:

```ts
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { sql } = await import('../api/_lib/db');
const { registerUserWithinLimit } = await import('../api/_lib/registrationLimit');

const marker = `limit-test-${Date.now()}`;
const countRows = await sql`SELECT COUNT(*)::int AS registered FROM users`;
const registered = Number(countRows[0]?.registered || 0);
const limit = registered + 1;

try {
  const results = await Promise.all([
    registerUserWithinLimit({
      username: `${marker}-a`,
      passwordHash: 'integration-only-hash',
      role: 'artist',
      displayName: 'Limit Test A',
      limit,
    }),
    registerUserWithinLimit({
      username: `${marker}-b`,
      passwordHash: 'integration-only-hash',
      role: 'artist',
      displayName: 'Limit Test B',
      limit,
    }),
  ]);

  assert.equal(results.filter((result) => result.kind === 'created').length, 1);
  assert.equal(results.filter((result) => result.kind === 'full').length, 1);

  const createdRows = await sql`
    SELECT COUNT(*)::int AS created
    FROM users
    WHERE username IN (${`${marker}-a`}, ${`${marker}-b`})
  `;
  assert.equal(Number(createdRows[0]?.created || 0), 1);
  console.log('registration concurrency assertions passed');
} finally {
  await sql`
    DELETE FROM users
    WHERE username IN (${`${marker}-a`}, ${`${marker}-b`})
  `;
}
```

This script deliberately sets the test limit to the current count plus one, so it validates the last-slot race without deleting real users.

- [ ] **Step 5: Run unit, integration, and type checks**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
npx tsx scripts/test-registration-limit-integration.ts
npm run lint
```

Expected: both scripts pass; cleanup leaves no `limit-test-*` users; TypeScript exits with code 0.

- [ ] **Step 6: Commit atomic registration**

```powershell
git add api/_lib/registrationLimit.ts api/auth/register.ts scripts/test-registration-limit.ts scripts/test-registration-limit-integration.ts
git commit -m "feat: enforce beta registration limit atomically"
```

### Task 4: Present Remaining Capacity On The Registration Page

**Files:**
- Modify: `src/types/platform.ts`
- Modify: `src/lib/platformApi.ts`
- Modify: `src/pages/Register.tsx`
- Modify: `scripts/test-registration-limit.ts`

- [ ] **Step 1: Add failing frontend wiring assertions**

Append to `scripts/test-registration-limit.ts`:

```ts
const apiSource = await readFile('src/lib/platformApi.ts', 'utf8');
assert.equal(apiSource.includes("'/api/registration-status'"), true);

const registerPageSource = await readFile('src/pages/Register.tsx', 'utf8');
assert.equal(registerPageSource.includes('首批内测剩余'), true);
assert.equal(registerPageSource.includes('首批内测名额已满'), true);
assert.equal(registerPageSource.includes("code === 'registration_full'"), true);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
```

Expected: FAIL because the frontend has no registration status support.

- [ ] **Step 3: Add the shared response type and API helper**

In `src/types/platform.ts`, add:

```ts
export type RegistrationStatus = {
  limit: number;
  registered: number;
  remaining: number;
  open: boolean;
};
```

In `src/lib/platformApi.ts`, import the type and add:

```ts
export async function fetchRegistrationStatus(): Promise<RegistrationStatus> {
  return platformRequest<RegistrationStatus>('/api/registration-status', {
    method: 'GET',
  });
}
```

- [ ] **Step 4: Load and render capacity state**

In `src/pages/Register.tsx`:

1. Import `useEffect`, `fetchRegistrationStatus`, and `RegistrationStatus`.
2. Add:

```ts
const [status, setStatus] = useState<RegistrationStatus | null>(null);

useEffect(() => {
  let cancelled = false;
  fetchRegistrationStatus()
    .then((next) => {
      if (!cancelled) setStatus(next);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
  };
}, []);
```

3. Above the form, render:

```tsx
{status?.open ? (
  <p className="mb-6 text-sm text-accent-blue">
    首批内测剩余 {status.remaining} 个名额
  </p>
) : status ? (
  <div className="mb-6 rounded-lg border border-glass-border bg-white/[0.035] p-5">
    <h3 className="text-xl text-white">首批内测名额已满</h3>
    <p className="mt-2 text-sm text-text-secondary">
      已有账号仍可继续登录使用。
    </p>
  </div>
) : null}
```

4. Render the form only when `status?.open !== false`.
5. Always retain the login link.
6. Move the existing `{error && ...}` message above the open/full conditional so a
   `registration_full` error remains visible after the form is hidden.

- [ ] **Step 5: Handle a final-slot race without clearing input**

Change the registration error mapping to:

```ts
if (code === 'username_exists') {
  setError('这个账号已经被注册');
} else if (code === 'registration_full') {
  setError('首批内测名额刚刚用完');
  setStatus((current) =>
    current
      ? { ...current, registered: current.limit, remaining: 0, open: false }
      : { limit: 10, registered: 10, remaining: 0, open: false }
  );
} else {
  setError('注册失败，请检查信息');
}
```

Do not reset `username`, `displayName`, or `password` when registration fails.
Remove the old error element from inside the form after moving it above the conditional.

- [ ] **Step 6: Run focused and regression verification**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
npx tsx scripts/test-artist-only-v1.ts
npm run lint
npm run build
```

Expected: all assertions pass and Vite builds successfully.

- [ ] **Step 7: Commit the registration experience**

```powershell
git add src/types/platform.ts src/lib/platformApi.ts src/pages/Register.tsx scripts/test-registration-limit.ts
git commit -m "feat: show beta registration availability"
```

### Task 5: Configure, Migrate, And Verify

**Files:**
- Modify: `.env.example`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Document the environment variable**

Add to `.env.example`:

```env
# Maximum total accounts during the first beta.
BETA_USER_LIMIT="10"
```

Add `BETA_USER_LIMIT="10"` to the Vercel environment variable block in `docs/deployment.md`, and add this smoke test:

```text
Open /api/registration-status and confirm limit, registered, remaining, and open.
When registered reaches 10, confirm /#/register hides the form and the register API returns registration_full.
```

- [ ] **Step 2: Run the local API and inspect status**

Start the API if it is not already running:

```powershell
npm run dev:api
```

In another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:3002/api/registration-status | ConvertTo-Json
```

Expected: a JSON object with `limit`, `registered`, `remaining`, and `open`.

- [ ] **Step 3: Verify in the in-app browser**

Open `http://127.0.0.1:3000/#/register` and confirm:

1. Remaining capacity is displayed when open.
2. The form remains usable when the status request fails.
3. A forced `registration_full` response displays the final-slot message.
4. The login link remains visible in both open and full states.
5. Mobile and desktop layouts have no clipped text or overlapping controls.

- [ ] **Step 4: Run final automated verification**

Run:

```powershell
npx tsx scripts/test-registration-limit.ts
npx tsx scripts/test-registration-limit-integration.ts
npx tsx scripts/test-artist-only-v1.ts
npm run lint
npm run build
git diff --check
git status --short
```

Expected: all checks pass; only intentional feature files and the two unrelated pre-existing untracked plan files appear.

- [ ] **Step 5: Commit documentation**

```powershell
git add .env.example docs/deployment.md
git commit -m "docs: configure beta registration limit"
```

- [ ] **Step 6: Deploy and set the production variable**

In Vercel Project Settings, set:

```env
BETA_USER_LIMIT=10
```

Deploy the committed branch, then verify:

```powershell
$productionUrl = Read-Host "Vercel production origin (for example https://studio-aruo.vercel.app)"
Invoke-RestMethod "$productionUrl/api/registration-status" | ConvertTo-Json
```

Expected: production reports the real Neon account count and a limit of 10.
