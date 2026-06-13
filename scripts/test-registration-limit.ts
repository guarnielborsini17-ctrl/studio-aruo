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

  const localAdapterSource = await readFile('scripts/local-api-dev.ts', 'utf8');
  assert.equal(
    localAdapterSource.includes(
      "route('get', '/api/registration-status', 'api/registration-status.ts')"
    ),
    true
  );

  console.log('registration limit assertions passed');
} finally {
  if (originalBetaUserLimit === undefined) {
    delete process.env.BETA_USER_LIMIT;
  } else {
    process.env.BETA_USER_LIMIT = originalBetaUserLimit;
  }
}
