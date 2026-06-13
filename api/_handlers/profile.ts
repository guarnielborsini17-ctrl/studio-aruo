import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, sql } from '../_lib/db.js';
import { requireMethod, requireUser, sendJson } from '../_lib/http.js';
import { parseProfileUpdate } from '../_lib/profileInput.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['PUT'])) {
    return;
  }

  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  let input: ReturnType<typeof parseProfileUpdate>;
  try {
    input = parseProfileUpdate(req.body);
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'invalid_profile_update',
    });
    return;
  }

  if (input.hasDisplayName && !input.displayName) {
    sendJson(res, 400, { error: 'display_name_required' });
    return;
  }

  if ((input.hasIsBusy || input.hasAvailableDate) && user.role !== 'artist') {
    sendJson(res, 403, { error: 'wrong_role' });
    return;
  }

  const rows = await sql`
    UPDATE users
    SET display_name = CASE
          WHEN ${input.hasDisplayName} THEN ${input.displayName}
          ELSE display_name
        END,
        bio = CASE WHEN ${input.hasBio} THEN ${input.bio} ELSE bio END,
        avatar_url = CASE
          WHEN ${input.hasAvatarUrl} THEN ${input.avatarUrl}
          ELSE avatar_url
        END,
        pricing_note = CASE
          WHEN ${input.hasPricingNote} THEN ${input.pricingNote}
          ELSE pricing_note
        END,
        is_busy = CASE WHEN ${input.hasIsBusy} THEN ${input.isBusy} ELSE is_busy END,
        available_date = CASE
          WHEN ${input.hasAvailableDate} THEN ${input.availableDate}::date
          ELSE available_date
        END,
        updated_at = now()
    WHERE id = ${user.id}
    RETURNING *
  `;

  const row = rows[0];
  if (!row) {
    sendJson(res, 404, { error: 'user_not_found' });
    return;
  }

  sendJson(res, 200, { user: mapUser(row as Parameters<typeof mapUser>[0]) });
}
