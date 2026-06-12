import assert from 'node:assert/strict';
import {
  getBetaUserLimit,
  toRegistrationStatus,
} from '../api/_lib/registrationLimit';

assert.equal(getBetaUserLimit(undefined), 10);
assert.equal(getBetaUserLimit(''), 10);
assert.equal(getBetaUserLimit('abc'), 10);
assert.equal(getBetaUserLimit('0'), 10);
assert.equal(getBetaUserLimit('-2'), 10);
assert.equal(getBetaUserLimit('8.5'), 10);
assert.equal(getBetaUserLimit('12'), 12);

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

console.log('registration limit assertions passed');
