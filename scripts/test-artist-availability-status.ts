import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';

dotenv.config({ path: '.env.local' });

const { mapUser } = await import('../api/_lib/db');
const { parseProfileUpdate } = await import('../api/_lib/profileInput');

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

const dashboardSource = await readFile('src/pages/ArtistDashboard.tsx', 'utf8');
assert.equal(dashboardSource.includes('接单状态'), true);
assert.equal(dashboardSource.includes('保存接单状态'), true);
assert.equal(dashboardSource.includes('type="date"'), true);
assert.equal(
  dashboardSource.includes('updateProfile({ isBusy, availableDate })'),
  true
);
console.log('artist availability mapping assertions passed');
