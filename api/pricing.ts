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

const ALLOWED_UNITS = new Set([
  'item',
  'piece',
  'set',
  'session',
  'hour',
  'day',
  'sqm',
  '次',
  '张',
  '套',
  '起/张',
  '起/套',
  '起/次',
  '起/小时',
  '起/天',
]);

function queryText(value: string | string[] | undefined) {
  return textValue(Array.isArray(value) ? value[0] : value);
}

function isValidUnit(unit: string) {
  return ALLOWED_UNITS.has(unit);
}

function parsePricingItems(items: unknown) {
  if (!Array.isArray(items)) {
    return null;
  }

  const parsed: Array<{
    name: string;
    description: string;
    price: number;
    unit: string;
  }> = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const name = textValue((item as { name?: unknown }).name);
    const description = textValue((item as { description?: unknown }).description);
    const unit = textValue((item as { unit?: unknown }).unit);
    const price = Number((item as { price?: unknown }).price);

    if (!name || !unit || !Number.isFinite(price) || price < 0 || !isValidUnit(unit)) {
      return null;
    }

    parsed.push({ name, description, price, unit });
  }

  return parsed;
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

  const items = parsePricingItems(req.body?.items);
  if (!items) {
    sendJson(res, 400, { error: 'invalid_pricing_items' });
    return;
  }

  const transactionalSql = sql as typeof sql & {
    transaction?: (queries: unknown[]) => Promise<unknown>;
  };

  if (typeof transactionalSql.transaction === 'function') {
    await transactionalSql.transaction([
      transactionalSql`DELETE FROM pricing_items WHERE artist_id = ${user.id}`,
      ...items.map(
        (item, index) => transactionalSql`
          INSERT INTO pricing_items (artist_id, name, description, price, unit, sort_order)
          VALUES (${user.id}, ${item.name}, ${item.description}, ${item.price}, ${item.unit}, ${index})
        `
      ),
    ]);
  } else {
    await sql`DELETE FROM pricing_items WHERE artist_id = ${user.id}`;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      await sql`
        INSERT INTO pricing_items (artist_id, name, description, price, unit, sort_order)
        VALUES (${user.id}, ${item.name}, ${item.description}, ${item.price}, ${item.unit}, ${index})
      `;
    }
  }

  const rows = await sql`SELECT * FROM pricing_items WHERE artist_id = ${user.id} ORDER BY sort_order ASC`;
  sendJson(res, 200, { items: rows.map((row) => mapPricing(row as PricingRow)) });
}
