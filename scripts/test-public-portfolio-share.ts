import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

const shareHandlerSource = await readFile('api/share-link.ts', 'utf8');
assert.equal(shareHandlerSource.includes("['GET', 'POST', 'DELETE']"), true);
assert.equal(shareHandlerSource.includes("requireRole(req, res, 'artist')"), true);
assert.equal(shareHandlerSource.includes('createShareToken()'), true);
assert.equal(shareHandlerSource.includes('share_enabled = false'), true);
assert.equal(shareHandlerSource.includes("'Cache-Control', 'no-store'"), true);

const localAdapterSource = await readFile('scripts/local-api-dev.ts', 'utf8');
assert.equal(
  localAdapterSource.includes("route('get', '/api/share-link', 'api/share-link.ts')"),
  true
);
assert.equal(
  localAdapterSource.includes("route('post', '/api/share-link', 'api/share-link.ts')"),
  true
);
assert.equal(
  localAdapterSource.includes("route('delete', '/api/share-link', 'api/share-link.ts')"),
  true
);

console.log('public portfolio share assertions passed');
