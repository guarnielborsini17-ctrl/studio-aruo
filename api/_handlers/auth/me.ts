import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, sql } from '../../_lib/db';
import { requireMethod, requireUser, sendJson } from '../../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) {
    return;
  }

  const session = await requireUser(req, res);
  if (!session) {
    return;
  }

  const rows = await sql`SELECT * FROM users WHERE id = ${session.id} LIMIT 1`;
  const row = rows[0];
  if (!row) {
    sendJson(res, 401, { error: 'user_not_found' });
    return;
  }

  sendJson(res, 200, { user: mapUser(row as Parameters<typeof mapUser>[0]) });
}
