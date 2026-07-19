import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function databaseIdentity(value: string) {
  try {
    const url = new URL(value);
    const protocol =
      url.protocol === 'postgres:' || url.protocol === 'postgresql:'
        ? 'postgresql'
        : url.protocol.toLowerCase().replace(/:$/, '');

    return JSON.stringify({
      protocol,
      hostname: url.hostname.toLowerCase(),
      port: url.port || '5432',
      pathname: decodeURI(url.pathname).replace(/\/+$/, '') || '/',
    });
  } catch {
    throw new Error(
      'invalid registration limit test database configuration',
    );
  }
}

const productionDatabaseUrl = process.env.DATABASE_URL || '';
const configuredTestDatabaseUrl =
  process.env.REGISTRATION_LIMIT_TEST_DATABASE_URL || '';
const allowShared =
  process.env.ALLOW_SHARED_REGISTRATION_LIMIT_TEST_DB === 'true';
const testDatabaseUrl =
  configuredTestDatabaseUrl || (allowShared ? productionDatabaseUrl : '');

if (!testDatabaseUrl) {
  throw new Error('REGISTRATION_LIMIT_TEST_DATABASE_URL is required');
}

if (
  !allowShared &&
  productionDatabaseUrl &&
  databaseIdentity(testDatabaseUrl) === databaseIdentity(productionDatabaseUrl)
) {
  throw new Error(
    'registration limit integration test requires a dedicated database',
  );
}

databaseIdentity(testDatabaseUrl);
process.env.DATABASE_URL = testDatabaseUrl;

const lockClient = new Client(testDatabaseUrl);
let connected = false;
let transactionStarted = false;
let locked = false;
let sql: Awaited<typeof import('../api/_lib/db')>['sql'] | undefined;
const marker = `limit-test-${randomUUID()}`;
const usernames = [`${marker}-a`, `${marker}-b`] as const;
const inviteCodes = [`${marker}-code-a`.toUpperCase(), `${marker}-code-b`.toUpperCase()] as const;

try {
  await lockClient.connect();
  connected = true;
  await lockClient.query('BEGIN');
  transactionStarted = true;
  await lockClient.query("SET lock_timeout = '30s'");
  await lockClient.query('SELECT pg_advisory_lock(734981246)');
  locked = true;

  ({ sql } = await import('../api/_lib/db'));
  const { registerUserWithinLimit } = await import(
    '../api/_lib/registrationLimit'
  );
  const countRows = await sql`SELECT COUNT(*)::int AS registered FROM users`;
  const registered = Number(countRows[0]?.registered || 0);
  const limit = registered + 1;
  await sql`
    INSERT INTO invite_codes (code)
    VALUES (${inviteCodes[0]}), (${inviteCodes[1]})
  `;

  const results = await Promise.all([
    registerUserWithinLimit({
      username: usernames[0],
      passwordHash: 'integration-only-hash',
      role: 'artist',
      displayName: 'Limit Test A',
      inviteCode: inviteCodes[0],
      limit,
    }),
    registerUserWithinLimit({
      username: usernames[1],
      passwordHash: 'integration-only-hash',
      role: 'artist',
      displayName: 'Limit Test B',
      inviteCode: inviteCodes[1],
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
  try {
    if (sql) {
      await sql`
        DELETE FROM invite_codes
        WHERE code IN (${inviteCodes[0]}, ${inviteCodes[1]})
      `;
      await sql`
        DELETE FROM users
        WHERE username IN (${usernames[0]}, ${usernames[1]})
      `;
    }
  } finally {
    try {
      if (locked) {
        await lockClient.query('SELECT pg_advisory_unlock(734981246)');
      }
    } finally {
      try {
        if (transactionStarted) {
          await lockClient.query('ROLLBACK');
        }
      } finally {
        if (connected) {
          await lockClient.end();
        }
      }
    }
  }
}
