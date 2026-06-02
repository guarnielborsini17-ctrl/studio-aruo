import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, requireRole, sendJson, textValue } from './_lib/http';

type ChickenLegRow = {
  id: string;
  collaboration_id: string;
  designer_id: string;
  artist_id: string;
  amount: number | string;
  message?: string | null;
  created_at?: string;
};

function mapChickenLeg(row: ChickenLegRow) {
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    designerId: row.designer_id,
    artistId: row.artist_id,
    amount: Number(row.amount || 0),
    message: row.message || '',
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
  const message = textValue(req.body?.message);
  const amount = Number(req.body?.amount);

  if (!collaborationId || !Number.isInteger(amount) || amount <= 0) {
    sendJson(res, 400, { error: 'invalid_chicken_leg' });
    return;
  }

  const result = await sql`
    WITH collaboration AS (
      SELECT id, designer_id, artist_id
      FROM collaborations
      WHERE id = ${collaborationId} AND designer_id = ${user.id}
    ),
    balance_update AS (
      UPDATE users
      SET balance = balance - ${amount},
          updated_at = now()
      WHERE id = ${user.id}
        AND balance >= ${amount}
        AND EXISTS (SELECT 1 FROM collaboration)
      RETURNING id
    ),
    inserted AS (
      INSERT INTO chicken_legs (collaboration_id, designer_id, artist_id, amount, message)
      SELECT collaboration.id, collaboration.designer_id, collaboration.artist_id, ${amount}, ${message}
      FROM collaboration
      WHERE EXISTS (SELECT 1 FROM balance_update)
      RETURNING *
    )
    SELECT
      (SELECT COUNT(*)::int FROM collaboration) AS collaboration_count,
      (SELECT COUNT(*)::int FROM balance_update) AS balance_update_count,
      (SELECT COUNT(*)::int FROM inserted) AS inserted_count,
      (SELECT id FROM inserted LIMIT 1) AS id,
      (SELECT collaboration_id FROM inserted LIMIT 1) AS collaboration_id,
      (SELECT designer_id FROM inserted LIMIT 1) AS designer_id,
      (SELECT artist_id FROM inserted LIMIT 1) AS artist_id,
      (SELECT amount FROM inserted LIMIT 1) AS amount,
      (SELECT message FROM inserted LIMIT 1) AS message,
      (SELECT created_at FROM inserted LIMIT 1) AS created_at
  `;

  const row = result[0] as
    | {
        collaboration_count?: number | string;
        balance_update_count?: number | string;
        inserted_count?: number | string;
        id?: string | null;
        collaboration_id?: string | null;
        designer_id?: string | null;
        artist_id?: string | null;
        amount?: number | string | null;
        message?: string | null;
        created_at?: string | null;
      }
    | undefined;

  if (!row || Number(row.collaboration_count || 0) === 0) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  if (Number(row.balance_update_count || 0) === 0 || Number(row.inserted_count || 0) === 0) {
    sendJson(res, 409, { error: 'insufficient_balance' });
    return;
  }

  sendJson(res, 201, {
    chickenLeg: mapChickenLeg({
      id: row.id || '',
      collaboration_id: row.collaboration_id || '',
      designer_id: row.designer_id || '',
      artist_id: row.artist_id || '',
      amount: row.amount || 0,
      message: row.message || '',
      created_at: row.created_at || '',
    }),
  });
}
