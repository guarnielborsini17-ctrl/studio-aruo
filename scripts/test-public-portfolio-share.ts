import assert from 'node:assert/strict';
import { createShareToken, mapShareState } from '../api/_lib/shareToken';

const first = createShareToken();
const second = createShareToken();

assert.notEqual(first, second);
assert.match(first, /^[A-Za-z0-9_-]+$/);
assert.ok(first.length >= 22);

assert.deepEqual(
  mapShareState({
    share_token: first,
    share_enabled: true,
    share_updated_at: '2026-06-13T12:00:00.000Z',
  }),
  {
    token: first,
    enabled: true,
    updatedAt: '2026-06-13T12:00:00.000Z',
  }
);

console.log('public portfolio share assertions passed');
