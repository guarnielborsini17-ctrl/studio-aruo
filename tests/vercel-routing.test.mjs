import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('routes nested API paths through the single API function', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const apiRewrite = config.rewrites?.find((rewrite) => rewrite.source === '/api/(.*)');

  assert.deepEqual(apiRewrite, {
    source: '/api/(.*)',
    destination: '/api?path=$1',
  });
  assert.equal(fs.existsSync(new URL('../api/index.ts', import.meta.url)), true);
});
