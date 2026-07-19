import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSessionToken, hashPassword, MAX_PASSWORD_LENGTH, type UserRole } from '../../_lib/auth.js';
import { mapUser } from '../../_lib/db.js';
import { rawStringValue, requireMethod, sendJson, textValue } from '../../_lib/http.js';
import { registerUserWithinLimit } from '../../_lib/registrationLimit.js';

function parseRole(value: unknown): UserRole | null {
  return value === 'designer' || value === 'artist' ? value : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) {
    return;
  }

  const username = textValue(req.body?.username).toLowerCase();
  const displayName = textValue(req.body?.displayName) || username;
  const password = rawStringValue(req.body?.password);
  const role = parseRole(req.body?.role);
  const inviteCode = textValue(req.body?.inviteCode);

  if (username.length < 3) {
    sendJson(res, 400, { error: 'username_too_short' });
    return;
  }

  if (password.length < 6) {
    sendJson(res, 400, { error: 'password_too_short' });
    return;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    sendJson(res, 400, { error: 'password_too_long' });
    return;
  }

  if (!role) {
    sendJson(res, 400, { error: 'invalid_role' });
    return;
  }

  if (!inviteCode) {
    sendJson(res, 400, { error: 'invalid_invite_code' });
    return;
  }

  try {
    const result = await registerUserWithinLimit({
      username,
      passwordHash: hashPassword(password),
      role,
      displayName,
      inviteCode,
    });

    if (result.kind === 'full') {
      sendJson(res, 409, { error: 'registration_full' });
      return;
    }
    if (result.kind === 'invalid_invite_code') {
      sendJson(res, 400, { error: 'invalid_invite_code' });
      return;
    }
    if (result.kind === 'invite_code_used') {
      sendJson(res, 409, { error: 'invite_code_used' });
      return;
    }

    const user = mapUser(result.row as Parameters<typeof mapUser>[0]);
    sendJson(res, 201, { user, token: createSessionToken(user) });
  } catch (error: any) {
    if (error?.code === '23505') {
      sendJson(res, 409, { error: 'username_exists' });
      return;
    }
    throw error;
  }
}
