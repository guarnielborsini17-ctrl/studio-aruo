import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { sql } = await import('../api/_lib/db');
const { registerUserWithinLimit } = await import('../api/_lib/registrationLimit');

const marker = `limit-test-${Date.now()}`;
const usernames = [`${marker}-a`, `${marker}-b`] as const;
const countRows = await sql`SELECT COUNT(*)::int AS registered FROM users`;
const registered = Number(countRows[0]?.registered || 0);
const limit = registered + 1;

try {
  const results = await Promise.all([
    registerUserWithinLimit({
      username: usernames[0],
      passwordHash: 'integration-only-hash',
      role: 'artist',
      displayName: 'Limit Test A',
      limit,
    }),
    registerUserWithinLimit({
      username: usernames[1],
      passwordHash: 'integration-only-hash',
      role: 'artist',
      displayName: 'Limit Test B',
      limit,
    }),
  ]);

  assert.equal(results.filter((result) => result.kind === 'created').length, 1);
  assert.equal(results.filter((result) => result.kind === 'full').length, 1);

  const createdRows = await sql`
    SELECT COUNT(*)::int AS created
    FROM users
    WHERE username IN (${usernames[0]}, ${usernames[1]})
  `;
  assert.equal(Number(createdRows[0]?.created || 0), 1);
  console.log('registration concurrency assertions passed');
} finally {
  await sql`
    DELETE FROM users
    WHERE username IN (${usernames[0]}, ${usernames[1]})
  `;
}
