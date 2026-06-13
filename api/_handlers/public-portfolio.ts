import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { requireMethod, sendJson, textValue } from '../_lib/http';

function queryText(value: string | string[] | undefined) {
  return textValue(Array.isArray(value) ? value[0] : value);
}

function dateOnly(value: string | Date | null | undefined) {
  if (!value) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) return;

  res.setHeader('Cache-Control', 'no-store');
  const token = queryText(req.query.token);
  if (!token) {
    sendJson(res, 404, { error: 'portfolio_not_found' });
    return;
  }

  const artistRows = await sql`
    SELECT
      id,
      display_name,
      avatar_url,
      bio,
      pricing_note,
      is_busy,
      available_date
    FROM users
    WHERE share_token = ${token}
      AND share_enabled = true
      AND role = 'artist'
    LIMIT 1
  `;
  const artist = artistRows[0];
  if (!artist) {
    sendJson(res, 404, { error: 'portfolio_not_found' });
    return;
  }

  const [works, pricing] = await Promise.all([
    sql`
      SELECT id, title, description, image_url, created_at
      FROM works
      WHERE user_id = ${artist.id}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, name, description, price, unit, sort_order
      FROM pricing_items
      WHERE artist_id = ${artist.id}
      ORDER BY sort_order ASC
    `,
  ]);

  sendJson(res, 200, {
    artist: {
      displayName: artist.display_name,
      avatarUrl: artist.avatar_url || '',
      bio: artist.bio || '',
      pricingNote: artist.pricing_note || '',
      isBusy: artist.is_busy ?? true,
      availableDate: dateOnly(artist.available_date),
    },
    works: works.map((work) => ({
      id: work.id,
      title: work.title,
      description: work.description || '',
      imageUrl: work.image_url,
      createdAt: work.created_at || '',
    })),
    pricing: pricing.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price || 0),
      unit: item.unit || 'piece',
      sortOrder: Number(item.sort_order || 0),
    })),
  });
}
