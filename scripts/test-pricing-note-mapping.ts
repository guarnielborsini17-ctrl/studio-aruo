import assert from 'node:assert/strict';
import { mapUser } from '../api/_lib/db';

const mapped = mapUser({
  id: 'artist-1',
  username: 'artist',
  role: 'artist',
  display_name: 'Artist',
  pricing_note: '急单请提前沟通。',
});

assert.equal(mapped.pricingNote, '急单请提前沟通。');
console.log('pricing note mapping assertions passed');
