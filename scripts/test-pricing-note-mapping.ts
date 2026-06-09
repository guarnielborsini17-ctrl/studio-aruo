import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { mapUser } = await import('../api/_lib/db');

const mapped = mapUser({
  id: 'artist-1',
  username: 'artist',
  role: 'artist',
  display_name: 'Artist',
  pricing_note: '急单请提前沟通。',
});

assert.equal(mapped.pricingNote, '急单请提前沟通。');
console.log('pricing note mapping assertions passed');
