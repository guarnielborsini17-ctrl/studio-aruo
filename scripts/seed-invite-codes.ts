import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const TARGET_UNUSED_CODES = 9;
const INVITE_PREFIX = 'ARUO-TEST';
const PERMANENT_USERNAME = '1723670343';

function randomSuffix() {
  return crypto
    .randomBytes(4)
    .toString('base64url')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6)
    .padEnd(6, 'X');
}

function makeInviteCode(index: number) {
  return `${INVITE_PREFIX}-${String(index).padStart(2, '0')}-${randomSuffix()}`;
}

const { setupSchema, sql } = await import('../api/_lib/db');
const { markPermanentAccount } = await import('../api/_lib/registrationLimit');

await setupSchema();
await markPermanentAccount(PERMANENT_USERNAME);

const existingRows = await sql`
  SELECT code
  FROM invite_codes
  WHERE used_by_user_id IS NULL
  ORDER BY created_at ASC
`;
const codes = existingRows.map((row) => String(row.code));

let attempts = 0;
while (codes.length < TARGET_UNUSED_CODES) {
  attempts += 1;
  const code = makeInviteCode(codes.length + 1);
  const inserted = await sql`
    INSERT INTO invite_codes (code)
    VALUES (${code})
    ON CONFLICT (code) DO NOTHING
    RETURNING code
  `;
  if (inserted[0]?.code) {
    codes.push(String(inserted[0].code));
  }
  if (attempts > 100) {
    throw new Error('failed to generate invite codes');
  }
}

console.log(`Permanent account: ${PERMANENT_USERNAME}`);
console.log('Unused invite codes:');
for (const code of codes.slice(0, TARGET_UNUSED_CODES)) {
  console.log(code);
}
