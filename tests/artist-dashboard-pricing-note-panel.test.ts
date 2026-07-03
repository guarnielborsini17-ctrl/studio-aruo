import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('src/pages/ArtistDashboard.tsx', 'utf8');

test('artist dashboard pricing note is a separate collapsible panel with a taller text area', () => {
  assert.match(source, /id="pricing-note"/);
  assert.match(source, /title="价格说明"/);
  assert.match(source, /open=\{!collapsedPanels\.pricingNote\}/);
  assert.match(source, /min-h-44/);
});
