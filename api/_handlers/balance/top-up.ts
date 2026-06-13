import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, sql } from '../../_lib/db.js';
import { requireMethod, requireRole, sendJson } from '../../_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) {
    return;
  }

  const user = await requireRole(req, res, 'designer');
  if (!user) {
    return;
  }

  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
    sendJson(res, 400, { error: 'invalid_amount' });
    return;
  }

  const rows = await sql`
    UPDATE users
    SET balance = balance + ${amount},
        updated_at = now()
    WHERE id = ${user.id}
    RETURNING *
  `;

  const row = rows[0];
  if (!row) {
    sendJson(res, 404, { error: 'user_not_found' });
    return;
  }

  sendJson(res, 200, { user: mapUser(row as Parameters<typeof mapUser>[0]) });
}
