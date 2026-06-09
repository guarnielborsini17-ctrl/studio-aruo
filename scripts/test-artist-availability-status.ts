import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { mapUser } = await import('../api/_lib/db');

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
