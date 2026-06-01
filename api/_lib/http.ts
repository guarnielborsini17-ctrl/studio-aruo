import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, type SessionUser, type UserRole } from './auth';

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const DEFAULT_CORS_HEADERS = 'Content-Type, Authorization';

function normalizeAllowedMethods(allowed: string[]) {
  return [...new Set([...allowed.map((method) => method.toUpperCase()), 'OPTIONS'])];
}

export function applyCors(res: VercelResponse, allowedMethods?: string[]) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', DEFAULT_CORS_HEADERS);
  if (allowedMethods) {
    res.setHeader('Access-Control-Allow-Methods', normalizeAllowedMethods(allowedMethods).join(', '));
  }
}

export function sendJson(res: VercelResponse, status: number, data: unknown) {
  applyCors(res);
  res.status(status).json(data);
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  applyCors(res, allowed);
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'method_not_allowed' });
}

export function requireMethod(req: VercelRequest, res: VercelResponse, allowed: string[]) {
  const method = req.method?.toUpperCase();
  if (method === 'OPTIONS') {
    applyCors(res, allowed);
    res.setHeader('Allow', normalizeAllowedMethods(allowed).join(', '));
    res.status(204).end();
    return false;
  }
  if (!method || !allowed.includes(method)) {
    methodNotAllowed(res, allowed);
    return false;
  }
  return true;
}

export function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function rawStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
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
