import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('src/pages/ArtistDashboard.tsx', 'utf8');

test('artist dashboard pricing rows are persisted when removed', () => {
  assert.match(source, /const removePricingItem = async \(index: number\)/);
  assert.match(source, /await persistPricingItems\(nextItems\)/);
  assert.match(source, /aria-label=\{`删除套餐 \$\{index \+ 1\}`\}/);
});
