import assert from 'node:assert/strict';
import dotenv from 'dotenv';

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
console.log('artist availability mapping assertions passed');
