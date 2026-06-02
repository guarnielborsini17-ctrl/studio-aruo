import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from '../_lib/http';

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

function collaborationIdFromQuery(value: string | string[] | undefined) {
  return textValue(Array.isArray(value) ? value[0] : value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['PUT'])) {
    return;
  }

  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const id = collaborationIdFromQuery(req.query.id);
  const requestedStatus = req.body?.status;
  const status = requestedStatus === 'completed' || requestedStatus === 'active' ? requestedStatus : '';

  if (!id) {
    sendJson(res, 400, { error: 'collaboration_id_required' });
    return;
  }

  if (!status) {
    sendJson(res, 400, { error: 'invalid_status' });
    return;
  }

  const currentRows = await sql`
    SELECT status
    FROM collaborations
    WHERE id = ${id} AND (designer_id = ${user.id} OR artist_id = ${user.id})
    LIMIT 1
  `;

  const currentStatus = (currentRows[0] as { status: string } | undefined)?.status;
  if (!currentStatus) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  if (currentStatus === 'completed' && status === 'active') {
    sendJson(res, 409, { error: 'collaboration_completed' });
    return;
  }

  if (currentStatus === status) {
    const details = await sql`
      SELECT c.*, a.display_name AS artist_name, d.display_name AS designer_name
      FROM collaborations c
      JOIN users a ON a.id = c.artist_id
      JOIN users d ON d.id = c.designer_id
      WHERE c.id = ${id}
      LIMIT 1
    `;

    sendJson(res, 200, { collaboration: mapCollaboration(details[0] as CollaborationRow) });
    return;
  }

  const rows = await sql`
    UPDATE collaborations
    SET status = ${status}, updated_at = now()
    WHERE id = ${id} AND (designer_id = ${user.id} OR artist_id = ${user.id})
    RETURNING id
  `;

  const collaborationId = (rows[0] as { id: string } | undefined)?.id;
  if (!collaborationId) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  const details = await sql`
    SELECT c.*, a.display_name AS artist_name, d.display_name AS designer_name
    FROM collaborations c
    JOIN users a ON a.id = c.artist_id
    JOIN users d ON d.id = c.designer_id
    WHERE c.id = ${collaborationId}
    LIMIT 1
  `;

  sendJson(res, 200, { collaboration: mapCollaboration(details[0] as CollaborationRow) });
}
