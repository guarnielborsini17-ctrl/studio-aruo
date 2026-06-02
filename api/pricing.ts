import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, requireRole, sendJson, textValue } from './_lib/http';

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

function queryText(value: string | string[] | undefined) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'PUT'])) {
    return;
  }

  if (req.method === 'GET') {
    const artistId = queryText(req.query.artistId);
    if (!artistId) {
      sendJson(res, 400, { error: 'artist_id_required' });
      return;
    }

    const rows = await sql`SELECT * FROM pricing_items WHERE artist_id = ${artistId} ORDER BY sort_order ASC`;
    sendJson(res, 200, { items: rows.map((row) => mapPricing(row as PricingRow)) });
    return;
  }

  const user = await requireRole(req, res, 'artist');
  if (!user) {
    return;
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  await sql`DELETE FROM pricing_items WHERE artist_id = ${user.id}`;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const name = textValue(item.name);
    const description = textValue(item.description);
    const unit = textValue(item.unit) || 'item';
    const price = Number(item.price);

    if (!name || Number.isNaN(price) || price < 0) {
      continue;
    }

    await sql`
      INSERT INTO pricing_items (artist_id, name, description, price, unit, sort_order)
      VALUES (${user.id}, ${name}, ${description}, ${price}, ${unit}, ${index})
    `;
  }

  const rows = await sql`SELECT * FROM pricing_items WHERE artist_id = ${user.id} ORDER BY sort_order ASC`;
  sendJson(res, 200, { items: rows.map((row) => mapPricing(row as PricingRow)) });
}
