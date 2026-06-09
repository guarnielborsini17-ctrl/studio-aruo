# Artist Availability Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each artist to save a busy/available state and earliest scheduling date in Neon, edit it from the artist dashboard, and display it in the homepage header only while that artist is logged in.

**Architecture:** Extend the existing `users` record and user API mapping with `isBusy` and `availableDate`. Keep `PUT /api/profile` as the single authenticated profile endpoint, but make its fields independently optional so the availability panel can save without overwriting other form state. The navigation reads availability directly from `AuthContext`, eliminating the old localStorage-backed status context.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Vercel Functions, Neon Postgres, `tsx` assertion scripts.

---

## File Structure

- Modify `api/_lib/db.ts`: migrate `users`, extend `UserRow`, and map availability fields.
- Create `api/_lib/profileInput.ts`: parse and validate optional profile update fields without database dependencies.
- Modify `api/profile.ts`: perform safe partial profile updates and restrict availability changes to artists.
- Modify `src/types/platform.ts`: expose availability on `PlatformUser`.
- Modify `src/lib/platformApi.ts`: normalize availability and accept partial profile updates.
- Modify `src/pages/ArtistDashboard.tsx`: add availability form state, validation, saving state, and controls.
- Modify `src/App.tsx`: remove local availability context and render the header pill from the authenticated artist.
- Create `scripts/test-artist-availability-status.ts`: verify mapping, parser behavior, dashboard wiring, and header rules.

### Task 1: Persist And Map Artist Availability

**Files:**
- Modify: `api/_lib/db.ts`
- Modify: `src/types/platform.ts`
- Modify: `src/lib/platformApi.ts`
- Create: `scripts/test-artist-availability-status.ts`

- [ ] **Step 1: Write the failing user-mapping test**

Create `scripts/test-artist-availability-status.ts` with:

```ts
import assert from 'node:assert/strict';
import { mapUser } from '../api/_lib/db';

const mapped = mapUser({
  id: 'artist-1',
  username: 'artist',
  role: 'artist',
  display_name: 'Artist',
  is_busy: false,
  available_date: '2026-06-20',
});

assert.equal(mapped.isBusy, false);
assert.equal(mapped.availableDate, '2026-06-20');
console.log('artist availability mapping assertions passed');
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
```

Expected: FAIL because `mapUser()` does not return `isBusy` or `availableDate`.

- [ ] **Step 3: Add the database migration and row mapping**

In `setupSchema()` in `api/_lib/db.ts`, add:

```ts
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_busy BOOLEAN NOT NULL DEFAULT true`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS available_date DATE NOT NULL DEFAULT CURRENT_DATE`;
```

Extend `UserRow`:

```ts
is_busy?: boolean | null;
available_date?: string | Date | null;
```

Add a date mapper and availability properties:

```ts
function mapDateOnly(value: string | Date | null | undefined) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function mapUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    pricingNote: row.pricing_note || '',
    balance: Number(row.balance || 0),
    isBusy: row.is_busy ?? true,
    availableDate: mapDateOnly(row.available_date),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}
```

- [ ] **Step 4: Extend frontend user typing and normalization**

Add to `PlatformUser` in `src/types/platform.ts`:

```ts
isBusy?: boolean;
availableDate?: string;
```

Add to `normalizeUser()` in `src/lib/platformApi.ts`:

```ts
isBusy: user.isBusy ?? true,
availableDate: user.availableDate ?? '',
```

- [ ] **Step 5: Run the mapping test and type checker**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
npm run lint
```

Expected: the assertion script prints `artist availability mapping assertions passed`; TypeScript exits with code 0.

- [ ] **Step 6: Commit the persisted user fields**

```powershell
git add api/_lib/db.ts src/types/platform.ts src/lib/platformApi.ts scripts/test-artist-availability-status.ts
git commit -m "feat: persist artist availability fields"
```

### Task 2: Support Safe Partial Profile Updates

**Files:**
- Create: `api/_lib/profileInput.ts`
- Modify: `api/profile.ts`
- Modify: `src/lib/platformApi.ts`
- Modify: `scripts/test-artist-availability-status.ts`

- [ ] **Step 1: Add failing parser assertions**

Append to `scripts/test-artist-availability-status.ts`:

```ts
import { parseProfileUpdate } from '../api/_lib/profileInput';

assert.deepEqual(parseProfileUpdate({ isBusy: false, availableDate: '2026-06-20' }), {
  hasDisplayName: false,
  displayName: '',
  hasBio: false,
  bio: '',
  hasAvatarUrl: false,
  avatarUrl: '',
  hasPricingNote: false,
  pricingNote: '',
  hasIsBusy: true,
  isBusy: false,
  hasAvailableDate: true,
  availableDate: '2026-06-20',
});
assert.throws(
  () => parseProfileUpdate({ availableDate: '2026-02-31' }),
  /invalid_available_date/
);
assert.throws(
  () => parseProfileUpdate({ isBusy: 'false' }),
  /invalid_is_busy/
);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
```

Expected: FAIL because `api/_lib/profileInput.ts` does not exist.

- [ ] **Step 3: Implement the profile input parser**

Create `api/_lib/profileInput.ts`:

```ts
function owns(input: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseProfileUpdate(value: unknown) {
  const input =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const hasIsBusy = owns(input, 'isBusy');
  const hasAvailableDate = owns(input, 'availableDate');
  const isBusy = input.isBusy;
  const availableDate = text(input.availableDate);

  if (hasIsBusy && typeof isBusy !== 'boolean') {
    throw new Error('invalid_is_busy');
  }
  if (hasAvailableDate && !validDateOnly(availableDate)) {
    throw new Error('invalid_available_date');
  }

  return {
    hasDisplayName: owns(input, 'displayName'),
    displayName: text(input.displayName),
    hasBio: owns(input, 'bio'),
    bio: text(input.bio),
    hasAvatarUrl: owns(input, 'avatarUrl'),
    avatarUrl: text(input.avatarUrl),
    hasPricingNote: owns(input, 'pricingNote'),
    pricingNote: text(input.pricingNote),
    hasIsBusy,
    isBusy: typeof isBusy === 'boolean' ? isBusy : true,
    hasAvailableDate,
    availableDate,
  };
}
```

- [ ] **Step 4: Change the profile endpoint to preserve omitted fields**

In `api/profile.ts`:

- Import `parseProfileUpdate`.
- Parse `req.body` inside a `try/catch`; return the parser error code with HTTP 400.
- Reject an explicitly supplied empty `displayName` with `display_name_required`.
- If either availability field is supplied and `user.role !== 'artist'`, return HTTP 403 with `wrong_role`.
- Replace the fixed update with conditional SQL assignments:

```ts
const rows = await sql`
  UPDATE users
  SET display_name = CASE WHEN ${input.hasDisplayName} THEN ${input.displayName} ELSE display_name END,
      bio = CASE WHEN ${input.hasBio} THEN ${input.bio} ELSE bio END,
      avatar_url = CASE WHEN ${input.hasAvatarUrl} THEN ${input.avatarUrl} ELSE avatar_url END,
      pricing_note = CASE WHEN ${input.hasPricingNote} THEN ${input.pricingNote} ELSE pricing_note END,
      is_busy = CASE WHEN ${input.hasIsBusy} THEN ${input.isBusy} ELSE is_busy END,
      available_date = CASE
        WHEN ${input.hasAvailableDate} THEN ${input.availableDate}::date
        ELSE available_date
      END,
      updated_at = now()
  WHERE id = ${user.id}
  RETURNING *
`;
```

- [ ] **Step 5: Make the frontend profile input partial**

Change `updateProfile()` in `src/lib/platformApi.ts` to:

```ts
export async function updateProfile(input: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  pricingNote?: string;
  isBusy?: boolean;
  availableDate?: string;
}): Promise<PlatformUser> {
```

- [ ] **Step 6: Run parser, existing regression, and type tests**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
npx tsx scripts/test-pricing-note-mapping.ts
npm run lint
```

Expected: both assertion scripts pass; TypeScript exits with code 0.

- [ ] **Step 7: Commit partial profile updates**

```powershell
git add api/_lib/profileInput.ts api/profile.ts src/lib/platformApi.ts scripts/test-artist-availability-status.ts
git commit -m "feat: support partial artist profile updates"
```

### Task 3: Add Availability Controls To The Artist Dashboard

**Files:**
- Modify: `src/pages/ArtistDashboard.tsx`
- Modify: `scripts/test-artist-availability-status.ts`

- [ ] **Step 1: Add failing dashboard source assertions**

Append to `scripts/test-artist-availability-status.ts`:

```ts
import { readFile } from 'node:fs/promises';

const dashboardSource = await readFile('src/pages/ArtistDashboard.tsx', 'utf8');
assert.equal(dashboardSource.includes('接单状态'), true);
assert.equal(dashboardSource.includes('保存接单状态'), true);
assert.equal(dashboardSource.includes('type="date"'), true);
assert.equal(
  dashboardSource.includes('updateProfile({ isBusy, availableDate })'),
  true
);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
```

Expected: FAIL because the dashboard does not contain availability controls.

- [ ] **Step 3: Add form state and synchronize it from the authenticated user**

Add state beside the existing profile state:

```ts
const [isBusy, setIsBusy] = useState(true);
const [availableDate, setAvailableDate] = useState('');
const [savingAvailability, setSavingAvailability] = useState(false);
```

In the user synchronization effect add:

```ts
setIsBusy(user.isBusy ?? true);
setAvailableDate(user.availableDate || new Date().toISOString().slice(0, 10));
```

- [ ] **Step 4: Add the independent save action**

Add:

```ts
const saveAvailability = async () => {
  if (!availableDate) {
    setNotice('请选择最早可排期日期。');
    return;
  }

  setSavingAvailability(true);
  try {
    await updateProfile({ isBusy, availableDate });
    await refreshUser();
    setNotice('接单状态已保存。');
  } catch {
    setNotice('接单状态保存失败。');
  } finally {
    setSavingAvailability(false);
  }
};
```

- [ ] **Step 5: Add the approved availability panel**

Below the display profile card in the dashboard sidebar, add a separate card containing:

```tsx
<div className="rounded-lg border border-glass-border bg-white/[0.035] p-5">
  <h3 className="mb-4 text-lg text-white">接单状态</h3>
  <div className="space-y-4">
    <div>
      <span className="mb-2 block text-sm text-text-secondary">当前状态</span>
      <div className="grid grid-cols-2 rounded-lg border border-glass-border bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setIsBusy(true)}
          className={cn('rounded-md px-3 py-2 text-sm', isBusy ? 'bg-white text-black' : 'text-text-secondary')}
        >
          繁忙
        </button>
        <button
          type="button"
          onClick={() => setIsBusy(false)}
          className={cn('rounded-md px-3 py-2 text-sm', !isBusy ? 'bg-white text-black' : 'text-text-secondary')}
        >
          空闲可接单
        </button>
      </div>
    </div>
    <label className="block">
      <span className="mb-2 block text-sm text-text-secondary">最早可排期日期</span>
      <input
        type="date"
        value={availableDate}
        onChange={(event) => setAvailableDate(event.target.value)}
        className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
      />
    </label>
    <button
      type="button"
      onClick={saveAvailability}
      disabled={savingAvailability}
      className={actionButtonClass}
    >
      <Save className="h-4 w-4" />
      {savingAvailability ? '正在保存...' : '保存接单状态'}
    </button>
  </div>
</div>
```

Import `cn` from `../lib/utils`.

- [ ] **Step 6: Run focused and type tests**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
npm run lint
```

Expected: availability assertions pass; TypeScript exits with code 0.

- [ ] **Step 7: Commit the dashboard controls**

```powershell
git add src/pages/ArtistDashboard.tsx scripts/test-artist-availability-status.ts
git commit -m "feat: edit availability from artist dashboard"
```

### Task 4: Drive The Homepage Status Pill From Authentication

**Files:**
- Modify: `src/App.tsx`
- Modify: `scripts/test-artist-availability-status.ts`

- [ ] **Step 1: Add failing navigation assertions**

Append to `scripts/test-artist-availability-status.ts`:

```ts
const appSource = await readFile('src/App.tsx', 'utf8');
assert.equal(appSource.includes("localStorage.getItem('aruo_status')"), false);
assert.equal(appSource.includes("localStorage.setItem('aruo_status'"), false);
assert.equal(appSource.includes('StatusContext.Provider'), false);
assert.equal(appSource.includes("user?.role === 'artist'"), true);
assert.equal(appSource.includes('user.isBusy'), true);
assert.equal(appSource.includes('user.availableDate'), true);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
```

Expected: FAIL because `App.tsx` still uses `StatusContext` and `aruo_status`.

- [ ] **Step 3: Remove the legacy status context**

From `src/App.tsx`, remove:

- `INITIAL_STATUS`
- `StatusType`
- `StatusContextType`
- `StatusContext`
- the `status` state initializer in `DataProvider`
- the `aruo_status` persistence effect
- `statusValue`
- the `StatusContext.Provider` wrapper

Leave all unrelated project, kanban, submission, workspace, and pricing contexts unchanged.

- [ ] **Step 4: Read the current artist from AuthContext in navigation**

Import `useAuth`:

```ts
import { AuthProvider, useAuth } from './contexts/AuthContext';
```

In `Navigation()` replace the status context read with:

```ts
const { user } = useAuth();
const showArtistStatus = user?.role === 'artist';
```

Render the existing status pill only when `showArtistStatus`:

```tsx
{showArtistStatus ? (
  <div className="hidden md:flex items-center ml-8 h-10 px-5 bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-full shadow-lg backdrop-blur-md transition-all hover:bg-[rgba(255,255,255,0.04)]">
    <div className="flex items-center gap-2 mr-4 pr-4 border-r border-glass-border">
      <div className={`h-1.5 w-1.5 rounded-full ${user.isBusy ? 'bg-accent-orange shadow-[0_0_8px_rgba(255,107,74,0.6)]' : 'bg-status-green shadow-[0_0_8px_rgba(74,255,148,0.6)]'}`} />
      <span className="text-xs font-medium text-white">
        {user.isBusy ? '繁忙状态 / Busy' : '空闲可接单 / Available'}
      </span>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-widest text-text-secondary">最早可排期日期</span>
      <span className="text-xs font-mono tracking-wider text-white">{user.availableDate}</span>
    </div>
  </div>
) : null}
```

- [ ] **Step 5: Run feature and regression tests**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
npx tsx scripts/test-artist-only-v1.ts
npx tsx scripts/test-batch-work-upload.ts
npx tsx scripts/test-hidden-chicken-leg-ui.ts
npx tsx scripts/test-pricing-note-mapping.ts
npm run lint
npm run build
```

Expected: all assertion scripts pass, TypeScript exits with code 0, and Vite produces a successful production build.

- [ ] **Step 6: Apply the local database migration**

With the local API running, load the setup secret without printing it and call the migration endpoint:

```powershell
npx tsx -e "import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' }); const response = await fetch('http://127.0.0.1:3002/api/setup', { method: 'POST', headers: { 'X-Setup-Secret': process.env.SETUP_SECRET ?? '' } }); console.log(await response.text()); if (!response.ok) process.exit(1);"
```

Expected: the setup endpoint reports success and the two new `users` columns exist.

- [ ] **Step 7: Verify in the in-app browser**

At `http://127.0.0.1:3000/#/dashboard/artist`:

1. Confirm the availability panel appears below display profile.
2. Change to “空闲可接单”, choose a date, and save.
3. Navigate to `http://127.0.0.1:3000/#/` and confirm the header pill updates.
4. Reload and confirm the state persists.
5. Log out and confirm the status pill disappears.
6. Check desktop and a mobile viewport for overlap or clipped text.

- [ ] **Step 8: Commit the authenticated homepage status**

```powershell
git add src/App.tsx scripts/test-artist-availability-status.ts
git commit -m "feat: show signed-in artist availability"
```

### Task 5: Final Verification

**Files:**
- Verify only; modify files only if a test exposes a defect.

- [ ] **Step 1: Inspect the final diff**

Run:

```powershell
git diff HEAD~4 --check
git status --short
```

Expected: no whitespace errors and no unintended files.

- [ ] **Step 2: Run the complete focused verification again**

Run:

```powershell
npx tsx scripts/test-artist-availability-status.ts
npx tsx scripts/test-artist-only-v1.ts
npx tsx scripts/test-batch-work-upload.ts
npx tsx scripts/test-hidden-chicken-leg-ui.ts
npx tsx scripts/test-pricing-note-mapping.ts
npm run lint
npm run build
```

Expected: every command passes.

- [ ] **Step 3: Confirm repository state**

Run:

```powershell
git status --short
git log -5 --oneline
```

Expected: working tree is clean and the feature commits appear above the design and plan commits.
