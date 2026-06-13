import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../_lib/db.js';
import { requireMethod, requireUser, sendJson, textValue } from '../../_lib/http.js';

type CollaborationRow = {
  id: string;
  designer_id: string;
  artist_id: string;
  status: string;
  title: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  artist_name?: string | null;
  designer_name?: string | null;
};

function mapCollaboration(row: CollaborationRow) {
  return {
    id: row.id,
    designerId: row.designer_id,
    artistId: row.artist_id,
    status: row.status,
    title: row.title,
    note: row.note || '',
    artistName: row.artist_name || '',
    designerName: row.designer_name || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'POST'])) {
    return;
  }

  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  if (req.method === 'GET') {
    const rows = user.role === 'designer'
      ? await sql`
        SELECT c.*, a.display_name AS artist_name, d.display_name AS designer_name
        FROM collaborations c
        JOIN users a ON a.id = c.artist_id
        JOIN users d ON d.id = c.designer_id
        WHERE c.designer_id = ${user.id}
        ORDER BY c.created_at DESC
      `
      : await sql`
        SELECT c.*, a.display_name AS artist_name, d.display_name AS designer_name
        FROM collaborations c
        JOIN users a ON a.id = c.artist_id
        JOIN users d ON d.id = c.designer_id
        WHERE c.artist_id = ${user.id}
        ORDER BY c.created_at DESC
      `;

    sendJson(res, 200, { collaborations: rows.map((row) => mapCollaboration(row as CollaborationRow)) });
    return;
  }

  if (user.role !== 'designer') {
    sendJson(res, 403, { error: 'designer_required' });
    return;
  }

  const artistId = textValue(req.body?.artistId);
  const title = textValue(req.body?.title) || '合作项目';
  const note = textValue(req.body?.note);

  if (!artistId) {
    sendJson(res, 400, { error: 'artist_id_required' });
    return;
  }

  const artists = await sql`SELECT id FROM users WHERE id = ${artistId} AND role = 'artist' LIMIT 1`;
  if (!artists[0]) {
    sendJson(res, 404, { error: 'artist_not_found' });
    return;
  }

  try {
    const rows = await sql`
      INSERT INTO collaborations (designer_id, artist_id, title, note, status)
      VALUES (${user.id}, ${artistId}, ${title}, ${note}, 'active')
      RETURNING id
    `;

    const collaborationId = (rows[0] as { id: string } | undefined)?.id;
    const details = collaborationId
      ? await sql`
        SELECT c.*, a.display_name AS artist_name, d.display_name AS designer_name
        FROM collaborations c
        JOIN users a ON a.id = c.artist_id
        JOIN users d ON d.id = c.designer_id
        WHERE c.id = ${collaborationId}
        LIMIT 1
      `
      : [];

    sendJson(res, 201, { collaboration: mapCollaboration(details[0] as CollaborationRow) });
  } catch (error: any) {
    if (error?.code === '23514') {
      sendJson(res, 400, { error: 'invalid_collaboration' });
      return;
    }
    throw error;
  }
}
