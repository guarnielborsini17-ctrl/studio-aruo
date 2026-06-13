import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRegistrationStatus } from '../_lib/registrationLimit';
import { requireMethod, sendJson } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) {
    return;
  }

  sendJson(res, 200, await readRegistrationStatus());
}
