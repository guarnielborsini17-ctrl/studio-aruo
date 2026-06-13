import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, mapWork, sql } from '../../_lib/db.js';
import { requireMethod, sendJson, textValue } from '../../_lib/http.js';

type PricingRow = {
  id: string;
  artist_id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  unit?: string | null;
  sort_order?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

type ReviewRow = {
  id: string;
  collaboration_id: string;
  designer_id: string;
  artist_id: string;
  rating: number | string;
  content: string;
  created_at?: string;
  designer_name?: string | null;
  designer_avatar_url?: string | null;
};

function queryId(value: string | string[] | undefined) {
  return textValue(Array.isArray(value) ? value[0] : value);
}

function mapPricing(row: PricingRow) {
  return {
    id: row.id,
    artistId: row.artist_id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price || 0),
    unit: row.unit || 'item',
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapReview(row: ReviewRow) {
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    designerId: row.designer_id,
    artistId: row.artist_id,
    designerName: row.designer_name || '',
    designerAvatarUrl: row.designer_avatar_url || '',
    rating: Number(row.rating || 0),
    content: row.content,
    createdAt: row.created_at || '',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) {
    return;
  }

  const id = queryId(req.query.id);
  if (!id) {
    sendJson(res, 400, { error: 'artist_id_required' });
    return;
  }

  const users = await sql`SELECT * FROM users WHERE id = ${id} AND role = 'artist' LIMIT 1`;
  const user = users[0];
  if (!user) {
    sendJson(res, 404, { error: 'artist_not_found' });
    return;
  }

  const works = await sql`SELECT * FROM works WHERE user_id = ${id} ORDER BY created_at DESC`;
  const pricing = await sql`SELECT * FROM pricing_items WHERE artist_id = ${id} ORDER BY sort_order ASC`;
  const reviews = await sql`
    SELECT
      r.*,
      u.display_name AS designer_name,
      u.avatar_url AS designer_avatar_url
    FROM reviews r
    JOIN users u ON u.id = r.designer_id
    WHERE r.artist_id = ${id}
    ORDER BY r.created_at DESC
  `;

  sendJson(res, 200, {
    artist: mapUser(user as Parameters<typeof mapUser>[0]),
    works: works.map((row) => mapWork(row as Parameters<typeof mapWork>[0])),
    pricing: pricing.map((row) => mapPricing(row as PricingRow)),
    reviews: reviews.map((row) => mapReview(row as ReviewRow)),
  });
}
