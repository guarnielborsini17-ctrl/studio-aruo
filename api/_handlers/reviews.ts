import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireMethod, requireRole, sendJson, textValue } from '../_lib/http.js';

type ReviewRow = {
  id: string;
  collaboration_id: string;
  designer_id: string;
  artist_id: string;
  rating: number | string;
  content: string;
  created_at?: string;
};

function mapReview(row: ReviewRow) {
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    designerId: row.designer_id,
    artistId: row.artist_id,
    rating: Number(row.rating || 0),
    content: row.content,
    createdAt: row.created_at || '',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) {
    return;
  }

  const user = await requireRole(req, res, 'designer');
  if (!user) {
    return;
  }

  const collaborationId = textValue(req.body?.collaborationId);
  const rating = Number(req.body?.rating);
  const content = textValue(req.body?.content);

  if (!collaborationId || !content || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    sendJson(res, 400, { error: 'invalid_review' });
    return;
  }

  const collaborations = await sql`
    SELECT id, designer_id, artist_id
    FROM collaborations
    WHERE id = ${collaborationId} AND designer_id = ${user.id}
    LIMIT 1
  `;

  const collaboration = collaborations[0] as
    | { id: string; designer_id: string; artist_id: string }
    | undefined;

  if (!collaboration) {
    sendJson(res, 403, { error: 'collaboration_required' });
    return;
  }

  try {
    const rows = await sql`
      INSERT INTO reviews (collaboration_id, designer_id, artist_id, rating, content)
      VALUES (${collaboration.id}, ${collaboration.designer_id}, ${collaboration.artist_id}, ${rating}, ${content})
      RETURNING *
    `;

    sendJson(res, 201, { review: mapReview(rows[0] as ReviewRow) });
  } catch (error: any) {
    if (error?.code === '23505') {
      sendJson(res, 409, { error: 'review_exists' });
      return;
    }

    if (error?.code === '23503') {
      sendJson(res, 403, { error: 'collaboration_required' });
      return;
    }

    throw error;
  }
}
