import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapWork, sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from '../_lib/http';

function queryText(value: string | string[] | undefined) {
  return textValue(Array.isArray(value) ? value[0] : value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'POST'])) {
    return;
  }

  if (req.method === 'GET') {
    const userId = queryText(req.query.userId);
    const rows = userId
      ? await sql`SELECT * FROM works WHERE user_id = ${userId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM works ORDER BY created_at DESC LIMIT 80`;

    sendJson(res, 200, { works: rows.map((row) => mapWork(row as Parameters<typeof mapWork>[0])) });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const title = textValue(req.body?.title);
  const description = textValue(req.body?.description);
  const imageUrl = textValue(req.body?.imageUrl);
  const imagePath = textValue(req.body?.imagePath);

  if (!title || !imageUrl) {
    sendJson(res, 400, { error: 'invalid_work' });
    return;
  }

  const rows = await sql`
    INSERT INTO works (user_id, title, description, image_url, image_path)
    VALUES (${user.id}, ${title}, ${description}, ${imageUrl}, ${imagePath})
    RETURNING *
  `;

  sendJson(res, 201, { work: mapWork(rows[0] as Parameters<typeof mapWork>[0]) });
}
