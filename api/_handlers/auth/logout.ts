import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireMethod, sendJson } from '../../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) {
    return;
  }

  sendJson(res, 200, { ok: true });
}
