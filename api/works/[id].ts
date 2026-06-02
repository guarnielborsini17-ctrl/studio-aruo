import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from '../_lib/http';

function queryId(value: string | string[] | undefined) {
  return textValue(Array.isArray(value) ? value[0] : value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['DELETE'])) {
    return;
  }

  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const id = queryId(req.query.id);
  if (!id) {
    sendJson(res, 400, { error: 'invalid_work_id' });
    return;
  }

  const rows = await sql`DELETE FROM works WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
  if (!rows[0]) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  sendJson(res, 200, { ok: true });
}
