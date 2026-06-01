import crypto from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

export type UserRole = 'designer' | 'artist';

export type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error('SESSION_SECRET is required');
  }
  return value;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function hmac(payload: string) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(password, salt, 64).toString('base64url');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, expected] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !expected) {
    return false;
  }
  const next = crypto.scryptSync(password, salt, 64).toString('base64url');
  return safeEqual(next, expected);
}

export function createSessionToken(user: SessionUser) {
  const payload = base64Url(JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${hmac(payload)}`;
}

export function parseSessionToken(token: string): SessionUser | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, hmac(payload))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser & {
      exp?: number;
    };

    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return null;
    }
    if (parsed.role !== 'designer' && parsed.role !== 'artist') {
      return null;
    }

    return {
      id: String(parsed.id || ''),
      username: String(parsed.username || ''),
      role: parsed.role,
      displayName: String(parsed.displayName || ''),
    };
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: VercelRequest) {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const token = value?.startsWith('Bearer ') ? value.slice(7) : '';
  return token ? parseSessionToken(token) : null;
}
