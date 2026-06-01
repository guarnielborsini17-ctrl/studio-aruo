import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, type SessionUser, type UserRole } from './auth';

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

export function sendJson(res: VercelResponse, status: number, data: unknown) {
  res.status(status).json(data);
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'method_not_allowed' });
}

export function requireMethod(req: VercelRequest, res: VercelResponse, allowed: string[]) {
  const method = req.method?.toUpperCase();
  if (!method || !allowed.includes(method)) {
    methodNotAllowed(res, allowed);
    return false;
  }
  return true;
}

export function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function requireUser(req: VercelRequest, res: VercelResponse): Promise<SessionUser | null> {
  const user = await getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: 'unauthenticated' });
    return null;
  }
  return user;
}

export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  role: UserRole
): Promise<SessionUser | null> {
  const user = await requireUser(req, res);
  if (!user) {
    return null;
  }
  if (user.role !== role) {
    sendJson(res, 403, { error: 'wrong_role' });
    return null;
  }
  return user;
}
