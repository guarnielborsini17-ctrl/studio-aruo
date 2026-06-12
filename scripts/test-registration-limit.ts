import assert from 'node:assert/strict';
import {
  getBetaUserLimit,
  toRegistrationStatus,
} from '../api/_lib/registrationLimit';

const originalBetaUserLimit = process.env.BETA_USER_LIMIT;

try {
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

  console.log('registration limit assertions passed');
} finally {
  if (originalBetaUserLimit === undefined) {
    delete process.env.BETA_USER_LIMIT;
  } else {
    process.env.BETA_USER_LIMIT = originalBetaUserLimit;
  }
}
