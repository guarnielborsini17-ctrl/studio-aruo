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

const publicHandlerSource = await readFile('api/public-portfolio.ts', 'utf8');
assert.equal(publicHandlerSource.includes('share_enabled = true'), true);
assert.equal(publicHandlerSource.includes('password_hash'), false);
assert.equal(publicHandlerSource.includes('username'), false);
assert.equal(publicHandlerSource.includes('balance'), false);
assert.equal(publicHandlerSource.includes("error: 'portfolio_not_found'"), true);
assert.equal(publicHandlerSource.includes("'Cache-Control', 'no-store'"), true);
assert.equal(
  localAdapterSource.includes(
    "route('get', '/api/public-portfolio', 'api/public-portfolio.ts')"
  ),
  true
);

const platformApiSource = await readFile('src/lib/platformApi.ts', 'utf8');
assert.equal(platformApiSource.includes("'/api/share-link'"), true);
assert.equal(platformApiSource.includes("'/api/public-portfolio?token="), true);

const dashboardSource = await readFile('src/pages/ArtistDashboard.tsx', 'utf8');
assert.equal(dashboardSource.includes('公开作品页'), true);
assert.equal(dashboardSource.includes('生成公开链接'), true);
assert.equal(dashboardSource.includes('复制链接'), true);
assert.equal(dashboardSource.includes('关闭分享'), true);
assert.equal(dashboardSource.includes('重新生成'), true);

const publicPageSource = await readFile('src/pages/PublicPortfolio.tsx', 'utf8');
assert.equal(publicPageSource.includes('meta[name="robots"]'), true);
assert.equal(publicPageSource.includes('noindex,nofollow,noarchive'), true);
assert.equal(publicPageSource.includes('登录'), false);
assert.equal(publicPageSource.includes('注册'), false);
assert.equal(publicPageSource.includes('工作台'), false);

const appSource = await readFile('src/App.tsx', 'utf8');
assert.equal(appSource.includes('path="/share/:token"'), true);
assert.equal(appSource.includes("location.pathname.startsWith('/share/')"), true);

console.log('public portfolio share assertions passed');
