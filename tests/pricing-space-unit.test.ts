import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboardSource = readFileSync('src/pages/ArtistDashboard.tsx', 'utf8');
const pricingSource = readFileSync('src/pages/Pricing.tsx', 'utf8');
const publicPortfolioSource = readFileSync('src/pages/PublicPortfolio.tsx', 'utf8');
const pricingApiSource = readFileSync('api/_handlers/pricing.ts', 'utf8');

test('artist pricing unit selector supports per-space pricing', () => {
  assert.match(dashboardSource, /<option value="space">按空间<\/option>/);
  assert.match(pricingApiSource, /'space'/);
});

test('pricing display pages render space unit in Chinese', () => {
  assert.match(pricingSource, /if \(unit === 'space'\) return '空间';/);
  assert.match(publicPortfolioSource, /if \(unit === "space"\) return "空间";/);
});
