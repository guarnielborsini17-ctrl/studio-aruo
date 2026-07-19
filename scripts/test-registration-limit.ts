import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getBetaUserLimit,
  REGISTER_USER_LOCK_ID,
  toRegistrationStatus,
} from '../api/_lib/registrationLimit';

const originalBetaUserLimit = process.env.BETA_USER_LIMIT;

try {
  assert.equal(REGISTER_USER_LOCK_ID, 734981245);
  assert.equal(Number.isSafeInteger(REGISTER_USER_LOCK_ID), true);

  delete process.env.BETA_USER_LIMIT;

  assert.equal(getBetaUserLimit(undefined), 9);
  assert.equal(getBetaUserLimit(''), 9);
  assert.equal(getBetaUserLimit('abc'), 9);
  assert.equal(getBetaUserLimit('0'), 9);
  assert.equal(getBetaUserLimit('-2'), 9);
  assert.equal(getBetaUserLimit('8.5'), 9);
  assert.equal(getBetaUserLimit('12'), 12);

  process.env.BETA_USER_LIMIT = '12';
  assert.equal(getBetaUserLimit(), 12);

  assert.deepEqual(toRegistrationStatus(0, 9), {
    limit: 9,
    registered: 0,
    remaining: 9,
    open: true,
  });
  assert.deepEqual(toRegistrationStatus(8, 9), {
    limit: 9,
    registered: 8,
    remaining: 1,
    open: true,
  });
  assert.deepEqual(toRegistrationStatus(9, 9), {
    limit: 9,
    registered: 9,
    remaining: 0,
    open: false,
  });
  assert.deepEqual(toRegistrationStatus(13, 9), {
    limit: 9,
    registered: 13,
    remaining: 0,
    open: false,
  });

  for (const limit of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -2,
    0,
    8.5,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.deepEqual(toRegistrationStatus(3, limit), {
      limit: 9,
      registered: 3,
      remaining: 6,
      open: true,
    });
  }

  assert.deepEqual(toRegistrationStatus(3, 12), {
    limit: 12,
    registered: 3,
    remaining: 9,
    open: true,
  });

  for (const registered of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.deepEqual(toRegistrationStatus(registered, 9), {
      limit: 9,
      registered: 0,
      remaining: 9,
      open: true,
    });
  }

  assert.deepEqual(toRegistrationStatus(8.8, 9), {
    limit: 9,
    registered: 8,
    remaining: 1,
    open: true,
  });
  assert.deepEqual(toRegistrationStatus(-2.4, 9), {
    limit: 9,
    registered: 0,
    remaining: 9,
    open: true,
  });

  const endpointSource = await readFile('api/_handlers/registration-status.ts', 'utf8');
  assert.equal(endpointSource.includes("requireMethod(req, res, ['GET'])"), true);
  assert.equal(endpointSource.includes('readRegistrationStatus()'), true);

  const registerSource = await readFile('api/_handlers/auth/register.ts', 'utf8');
  assert.equal(registerSource.includes('registerUserWithinLimit({'), true);
  assert.equal(registerSource.includes('inviteCode'), true);
  assert.equal(registerSource.includes('invalid_invite_code'), true);
  assert.equal(registerSource.includes('invite_code_used'), true);
  assert.equal(registerSource.includes('registration_full'), true);
  assert.equal(registerSource.includes('username_exists'), true);
  assert.equal(registerSource.includes('INSERT INTO users'), false);

  const dbSource = await readFile('api/_lib/db.ts', 'utf8');
  assert.equal(dbSource.includes('account_type'), true);
  assert.equal(dbSource.includes('invite_codes'), true);
  assert.equal(dbSource.includes("DEFAULT 'beta'"), true);
  assert.equal(dbSource.includes('accountType'), true);

  const registrationLimitSource = await readFile(
    'api/_lib/registrationLimit.ts',
    'utf8',
  );
  assert.equal(registrationLimitSource.includes('inviteCode: string'), true);
  assert.equal(registrationLimitSource.includes('used_by_user_id'), true);
  assert.equal(registrationLimitSource.includes('used_at'), true);
  assert.equal(
    registrationLimitSource.includes('FROM invite_codes'),
    true,
  );
  assert.equal(registrationLimitSource.includes('used_by_user_id IS NOT NULL'), true);
  assert.equal(registrationLimitSource.includes('used_by_user_id IS NULL'), true);
  assert.equal(registrationLimitSource.includes('markPermanentAccount'), true);

  const integrationSource = await readFile(
    'scripts/test-registration-limit-integration.ts',
    'utf8',
  );
  assert.equal(
    integrationSource.includes('REGISTRATION_LIMIT_TEST_DATABASE_URL'),
    true,
  );
  assert.equal(
    integrationSource.includes(
      'REGISTRATION_LIMIT_TEST_DATABASE_URL is required',
    ),
    true,
  );
  assert.equal(
    integrationSource.includes(
      'invalid registration limit test database configuration',
    ),
    true,
  );
  assert.equal(
    integrationSource.includes(
      'registration limit integration test requires a dedicated database',
    ),
    true,
  );
  assert.equal(integrationSource.includes('function databaseIdentity'), true);
  assert.equal(integrationSource.includes("url.protocol === 'postgres:'"), true);
  assert.equal(integrationSource.includes('url.hostname.toLowerCase()'), true);
  assert.equal(integrationSource.includes("url.port || '5432'"), true);
  assert.equal(
    integrationSource.includes(
      "decodeURI(url.pathname).replace(/\\/+$/, '') || '/'",
    ),
    true,
  );
  assert.equal(integrationSource.includes('url.username'), false);
  assert.equal(integrationSource.includes('url.password'), false);
  assert.equal(integrationSource.includes('url.search'), false);
  assert.equal(integrationSource.includes('url.hash'), false);
  assert.equal(integrationSource.includes('!allowShared'), true);
  assert.equal(
    integrationSource.includes('process.env.DATABASE_URL = testDatabaseUrl'),
    true,
  );
  assert.equal(
    integrationSource.includes(
      "import { Client } from '@neondatabase/serverless'",
    ),
    true,
  );
  assert.equal(integrationSource.includes('new Client(testDatabaseUrl)'), true);
  assert.equal(integrationSource.includes('let connected = false'), true);
  assert.equal(integrationSource.includes('let transactionStarted = false'), true);
  assert.equal(integrationSource.includes('let locked = false'), true);
  assert.equal(integrationSource.includes("lockClient.query('BEGIN')"), true);
  assert.equal(
    integrationSource.includes("SET lock_timeout = '30s'"),
    true,
  );
  assert.equal(
    integrationSource.includes('SELECT pg_advisory_lock(734981246)'),
    true,
  );
  assert.equal(
    integrationSource.includes('SELECT pg_advisory_unlock(734981246)'),
    true,
  );
  assert.equal(integrationSource.includes("lockClient.query('ROLLBACK')"), true);
  assert.equal(integrationSource.includes('await lockClient.end()'), true);
  assert.equal(integrationSource.includes('inviteCodes'), true);
  assert.equal(integrationSource.includes('inviteCode:'), true);
  assert.equal(integrationSource.includes('INSERT INTO invite_codes'), true);
  assert.equal(integrationSource.includes('DELETE FROM invite_codes'), true);
  assert.equal(integrationSource.includes('node:fs/promises'), false);
  assert.equal(integrationSource.includes('node:os'), false);
  assert.equal(integrationSource.includes('LOCK_PATH'), false);
  assert.equal(
    integrationSource.includes(
      'studio-aruo-registration-limit-integration.lock',
    ),
    false,
  );

  const localAdapterSource = await readFile('scripts/local-api-dev.ts', 'utf8');
  assert.equal(
    localAdapterSource.includes(
      "route('get', '/api/registration-status', 'api/_handlers/registration-status.ts')"
    ),
    true
  );

  const platformApiSource = await readFile('src/lib/platformApi.ts', 'utf8');
  assert.equal(
    platformApiSource.includes("'/api/registration-status'"),
    true,
  );
  assert.equal(platformApiSource.includes('accountType: user.accountType'), true);

  const packageSource = await readFile('package.json', 'utf8');
  assert.equal(packageSource.includes('"seed:invites"'), true);

  const seedSource = await readFile('scripts/seed-invite-codes.ts', 'utf8');
  assert.equal(seedSource.includes('TARGET_UNUSED_CODES = 9'), true);
  assert.equal(seedSource.includes('PERMANENT_USERNAME = \'1723670343\''), true);
  assert.equal(seedSource.includes('markPermanentAccount(PERMANENT_USERNAME)'), true);
  assert.equal(seedSource.includes('INSERT INTO invite_codes'), true);

  const registerPageSource = await readFile('src/pages/Register.tsx', 'utf8');
  assert.equal(registerPageSource.includes('inviteCode'), true);
  assert.equal(registerPageSource.includes('申请码'), true);
  assert.equal(registerPageSource.includes("code === 'invalid_invite_code'"), true);
  assert.equal(registerPageSource.includes("code === 'invite_code_used'"), true);
  assert.equal(registerPageSource.includes('首批内测剩余'), true);
  assert.equal(registerPageSource.includes('首批内测名额已满'), true);
  assert.equal(registerPageSource.includes("code === 'registration_full'"), true);
  assert.equal(registerPageSource.includes('registrationClosedRef'), true);
  assert.equal(
    registerPageSource.indexOf('registrationClosedRef.current = true') <
      registerPageSource.indexOf("setError('首批内测名额刚刚用完')"),
    true,
  );
  assert.equal(registerPageSource.includes('let cancelled = false'), true);
  assert.equal(registerPageSource.includes('cancelled = true'), true);
  assert.equal(
    registerPageSource.includes(
      'if (cancelled || registrationClosedRef.current)',
    ),
    true,
  );
  assert.equal(registerPageSource.includes('正在确认内测名额...'), true);
  assert.equal(registerPageSource.includes('role="status"'), true);
  assert.equal(registerPageSource.includes('aria-live="polite"'), true);
  assert.equal(registerPageSource.includes('role="alert"'), true);

  console.log('registration limit assertions passed');
} finally {
  if (originalBetaUserLimit === undefined) {
    delete process.env.BETA_USER_LIMIT;
  } else {
    process.env.BETA_USER_LIMIT = originalBetaUserLimit;
  }
}
