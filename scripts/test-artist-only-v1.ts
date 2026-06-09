import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('src/App.tsx', 'utf8');
const register = await readFile('src/pages/Register.tsx', 'utf8');
const dashboard = await readFile('src/pages/Dashboard.tsx', 'utf8');
const artistDashboard = await readFile('src/pages/ArtistDashboard.tsx', 'utf8');
const guide = await readFile('src/pages/Guide.tsx', 'utf8');
const pricing = await readFile('src/pages/Pricing.tsx', 'utf8');

assert.equal(app.includes("{ href: '/artists'"), false, 'ranking should be removed from navigation');
assert.equal(app.includes('path="/artists" element={<FeatureUnavailable />}'), true, 'ranking route should be deferred');
assert.equal(
  app.includes('path="/dashboard/designer" element={<FeatureUnavailable />}'),
  true,
  'designer dashboard route should be deferred'
);
assert.equal(register.includes("role: 'artist'"), true, 'registration should always create artists');
assert.equal(register.includes('ROLE_OPTIONS'), false, 'registration should not expose role choices');
assert.equal(dashboard.includes("'/coming-soon'"), true, 'designer users should be sent to the unavailable page');
assert.equal(artistDashboard.includes('fetchCollaborations'), false, 'artist dashboard should not load collaborations');
assert.equal(artistDashboard.includes('合作记录'), false, 'artist dashboard should not show collaboration history');
assert.equal(guide.includes('/artists'), false, 'guide should not link to ranking');
assert.equal(pricing.includes("'/artists'"), false, 'pricing should not link to ranking');

console.log('artist-only v1 assertions passed');
