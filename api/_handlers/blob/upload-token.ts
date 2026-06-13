import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBlobUploadResponse } from '../../_lib/blob';
import { requireMethod, requireUser, sendJson } from '../../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) {
    return;
  }

  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const result = await createBlobUploadResponse(req.body, user.id, req);
  sendJson(res, 200, result);
}
