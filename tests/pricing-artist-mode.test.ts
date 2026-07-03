import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('src/pages/Pricing.tsx', 'utf8');

test('artist pricing page does not fall back to public default prices', () => {
  assert.match(source, /const isArtist = user\?\.role === 'artist'/);
  assert.match(source, /还没有设置套餐价格/);
  assert.doesNotMatch(source, /const showingArtistPricing = user\?\.role === 'artist' && artistPricing\.length > 0/);
});
