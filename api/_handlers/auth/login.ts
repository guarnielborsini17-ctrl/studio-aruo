import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSessionToken, verifyPassword } from '../../_lib/auth';
import { mapUser, sql } from '../../_lib/db';
import { rawStringValue, requireMethod, sendJson, textValue } from '../../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) {
    return;
  }

  const username = textValue(req.body?.username).toLowerCase();
  const password = rawStringValue(req.body?.password);

  const rows = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  const row = rows[0];

  if (!row || !verifyPassword(password, row.password_hash)) {
    sendJson(res, 401, { error: 'invalid_credentials' });
    return;
  }

  const user = mapUser(row as Parameters<typeof mapUser>[0]);
  sendJson(res, 200, { user, token: createSessionToken(user) });
}
