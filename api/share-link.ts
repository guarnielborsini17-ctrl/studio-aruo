import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, requireRole, sendJson } from './_lib/http';
import { createShareToken, mapShareState } from './_lib/shareToken';

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

function publicUrl(req: VercelRequest, token: string) {
  if (!token) return '';

  const proto = headerValue(req.headers['x-forwarded-proto']) || 'https';
  const host = headerValue(req.headers['x-forwarded-host']) || headerValue(req.headers.host);
  return host
    ? `${proto}://${host}/#/share/${encodeURIComponent(token)}`
    : `/#/share/${encodeURIComponent(token)}`;
}

function responseState(req: VercelRequest, row: Parameters<typeof mapShareState>[0]) {
  const state = mapShareState(row);
  return { ...state, url: publicUrl(req, state.token) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'POST', 'DELETE'])) {
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  const user = await requireRole(req, res, 'artist');
  if (!user) return;

  if (req.method === 'POST') {
    const token = createShareToken();
    const rows = await sql`
      UPDATE users
      SET share_token = ${token},
          share_enabled = true,
          share_updated_at = now(),
          updated_at = now()
      WHERE id = ${user.id}
      RETURNING share_token, share_enabled, share_updated_at
    `;
    sendJson(res, 200, responseState(req, rows[0] || {}));
    return;
  }

  if (req.method === 'DELETE') {
    const rows = await sql`
      UPDATE users
      SET share_enabled = false,
          share_updated_at = now(),
          updated_at = now()
      WHERE id = ${user.id}
      RETURNING share_token, share_enabled, share_updated_at
    `;
    sendJson(res, 200, responseState(req, rows[0] || {}));
    return;
  }

  const rows = await sql`
    SELECT share_token, share_enabled, share_updated_at
    FROM users
    WHERE id = ${user.id}
  `;
  sendJson(res, 200, responseState(req, rows[0] || {}));
}
