import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const LOCK_PATH = join(
  tmpdir(),
  'studio-aruo-registration-limit-integration.lock',
);
const LOCK_TIMEOUT_MS = 30_000;
const LOCK_RETRY_MS = 100;

async function acquireIntegrationLock() {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      return await open(LOCK_PATH, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Timed out waiting ${LOCK_TIMEOUT_MS}ms for integration lock: ${LOCK_PATH}`,
        );
      }
      await delay(LOCK_RETRY_MS);
    }
  }
}

const lockHandle = await acquireIntegrationLock();
try {
  const { sql } = await import('../api/_lib/db');
  const { registerUserWithinLimit } = await import('../api/_lib/registrationLimit');
  const marker = `limit-test-${randomUUID()}`;
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
} finally {
  try {
    await lockHandle.close();
  } finally {
    await unlink(LOCK_PATH);
  }
}
