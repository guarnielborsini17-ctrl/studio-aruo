import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../_lib/db';
import { requireMethod, sendJson } from '../../_lib/http';

type ArtistRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  review_count?: number | string | null;
  average_rating?: number | string | null;
  chicken_leg_total?: number | string | null;
  collaboration_count?: number | string | null;
  work_count?: number | string | null;
  score?: number | string | null;
  created_at?: string;
};

function mapArtist(row: ArtistRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    reviewCount: Number(row.review_count || 0),
    averageRating: Number(row.average_rating || 0),
    chickenLegTotal: Number(row.chicken_leg_total || 0),
    collaborationCount: Number(row.collaboration_count || 0),
    workCount: Number(row.work_count || 0),
    score: Number(row.score || 0),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) {
    return;
  }

  const rows = await sql`
    WITH review_stats AS (
      SELECT
        artist_id,
        COUNT(*)::int AS review_count,
        COALESCE(AVG(rating), 0) AS average_rating
      FROM reviews
      GROUP BY artist_id
    ),
    chicken_stats AS (
      SELECT
        artist_id,
        COALESCE(SUM(amount), 0) AS chicken_leg_total
      FROM chicken_legs
      GROUP BY artist_id
    ),
    collaboration_stats AS (
      SELECT
        artist_id,
        COUNT(*)::int AS collaboration_count
      FROM collaborations
      GROUP BY artist_id
    ),
    work_stats AS (
      SELECT
        user_id AS artist_id,
        COUNT(*)::int AS work_count
      FROM works
      GROUP BY user_id
    )
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.bio,
      COALESCE(rs.review_count, 0) AS review_count,
      COALESCE(rs.average_rating, 0) AS average_rating,
      COALESCE(cs.chicken_leg_total, 0) AS chicken_leg_total,
      COALESCE(collab.collaboration_count, 0) AS collaboration_count,
      COALESCE(ws.work_count, 0) AS work_count,
      (
        COALESCE(rs.review_count, 0) * 1000
        + COALESCE(rs.average_rating, 0) * 100
        + COALESCE(cs.chicken_leg_total, 0) * 10
        + COALESCE(collab.collaboration_count, 0) * 5
        + COALESCE(ws.work_count, 0)
      ) AS score,
      u.created_at
    FROM users u
    LEFT JOIN review_stats rs ON rs.artist_id = u.id
    LEFT JOIN chicken_stats cs ON cs.artist_id = u.id
    LEFT JOIN collaboration_stats collab ON collab.artist_id = u.id
    LEFT JOIN work_stats ws ON ws.artist_id = u.id
    WHERE u.role = 'artist'
    ORDER BY score DESC, u.created_at ASC
    LIMIT 100
  `;

  sendJson(res, 200, { artists: rows.map((row) => mapArtist(row as ArtistRow)) });
}
