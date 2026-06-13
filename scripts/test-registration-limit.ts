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

  assert.equal(getBetaUserLimit(undefined), 10);
  assert.equal(getBetaUserLimit(''), 10);
  assert.equal(getBetaUserLimit('abc'), 10);
  assert.equal(getBetaUserLimit('0'), 10);
  assert.equal(getBetaUserLimit('-2'), 10);
  assert.equal(getBetaUserLimit('8.5'), 10);
  assert.equal(getBetaUserLimit('12'), 12);

  process.env.BETA_USER_LIMIT = '12';
  assert.equal(getBetaUserLimit(), 12);

  assert.deepEqual(toRegistrationStatus(0, 10), {
    limit: 10,
    registered: 0,
    remaining: 10,
    open: true,
  });
  assert.deepEqual(toRegistrationStatus(9, 10), {
    limit: 10,
    registered: 9,
    remaining: 1,
    open: true,
  });
  assert.deepEqual(toRegistrationStatus(10, 10), {
    limit: 10,
    registered: 10,
    remaining: 0,
    open: false,
  });
  assert.deepEqual(toRegistrationStatus(13, 10), {
    limit: 10,
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
      limit: 10,
      registered: 3,
      remaining: 7,
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
    assert.deepEqual(toRegistrationStatus(registered, 10), {
      limit: 10,
      registered: 0,
      remaining: 10,
      open: true,
    });
  }

  assert.deepEqual(toRegistrationStatus(9.8, 10), {
    limit: 10,
    registered: 9,
    remaining: 1,
    open: true,
  });
  assert.deepEqual(toRegistrationStatus(-2.4, 10), {
    limit: 10,
    registered: 0,
    remaining: 10,
    open: true,
  });

  const endpointSource = await readFile('api/registration-status.ts', 'utf8');
  assert.equal(endpointSource.includes("requireMethod(req, res, ['GET'])"), true);
  assert.equal(endpointSource.includes('readRegistrationStatus()'), true);

  const registerSource = await readFile('api/auth/register.ts', 'utf8');
  assert.equal(registerSource.includes('registerUserWithinLimit({'), true);
  assert.equal(registerSource.includes('registration_full'), true);
  assert.equal(registerSource.includes('username_exists'), true);
  assert.equal(registerSource.includes('INSERT INTO users'), false);

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
      "route('get', '/api/registration-status', 'api/registration-status.ts')"
    ),
    true
  );

  const platformApiSource = await readFile('src/lib/platformApi.ts', 'utf8');
  assert.equal(
    platformApiSource.includes("'/api/registration-status'"),
    true,
  );

  const registerPageSource = await readFile('src/pages/Register.tsx', 'utf8');
  assert.equal(registerPageSource.includes('首批内测剩余'), true);
  assert.equal(registerPageSource.includes('首批内测名额已满'), true);
  assert.equal(registerPageSource.includes("code === 'registration_full'"), true);

  console.log('registration limit assertions passed');
} finally {
  if (originalBetaUserLimit === undefined) {
    delete process.env.BETA_USER_LIMIT;
  } else {
    process.env.BETA_USER_LIMIT = originalBetaUserLimit;
  }
}
