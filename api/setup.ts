import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setupSchema } from './_lib/db';
import { requireMethod, sendJson } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) {
    return;
  }

  const secret = typeof req.headers['x-setup-secret'] === 'string' ? req.headers['x-setup-secret'] : '';
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    sendJson(res, 401, { error: 'invalid_setup_secret' });
    return;
  }

  await setupSchema();
  sendJson(res, 200, { ok: true });
}
