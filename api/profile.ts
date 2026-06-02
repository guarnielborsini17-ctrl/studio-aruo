import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, sql } from './_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['PUT'])) {
    return;
  }

  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const displayName = textValue(req.body?.displayName);
  const bio = textValue(req.body?.bio);
  const avatarUrl = textValue(req.body?.avatarUrl);

  if (!displayName) {
    sendJson(res, 400, { error: 'display_name_required' });
    return;
  }

  const rows = await sql`
    UPDATE users
    SET display_name = ${displayName},
        bio = ${bio},
        avatar_url = ${avatarUrl},
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
