# Vercel Demo Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Studio Aruo Vercel demo platform with role-based login, Neon Postgres persistence, Vercel Blob image uploads, designer/artist dashboards, collaborations, reviews, chicken legs, and rankings.

**Architecture:** Keep the existing Vite/React frontend and add Vercel-compatible API routes under `api/`. Shared API helpers live in `api/_lib/`, frontend data access lives in `src/lib/`, and role-specific UI is split into focused pages/components instead of growing `Admin.tsx`.

**Tech Stack:** React 19, Vite, TypeScript, Vercel Functions, Neon Postgres via `@neondatabase/serverless`, Vercel Blob via `@vercel/blob`, Node `crypto` for password hashing and HMAC session tokens.

---

## File Structure

- Create `api/_lib/http.ts`: method guards, JSON responses, request body parsing, auth extraction.
- Create `api/_lib/db.ts`: Neon SQL client, table setup SQL, row mappers, deterministic ranking query.
- Create `api/_lib/auth.ts`: password hashing, password verification, signed session token creation/validation.
- Create `api/_lib/blob.ts`: Vercel Blob upload token helper.
- Create `api/setup.ts`: one-time schema setup endpoint protected by `SETUP_SECRET`.
- Create `api/auth/register.ts`, `api/auth/login.ts`, `api/auth/me.ts`, `api/auth/logout.ts`.
- Create `api/works/index.ts`, `api/works/[id].ts`.
- Create `api/blob/upload-token.ts`.
- Create `api/artists/index.ts`, `api/artists/[id].ts`.
- Create `api/profile.ts`, `api/pricing.ts`, `api/collaborations/index.ts`, `api/collaborations/[id].ts`, `api/reviews.ts`, `api/chicken-legs.ts`, `api/balance/top-up.ts`.
- Create `src/types/platform.ts`: shared frontend platform types.
- Create `src/lib/platformApi.ts`: typed frontend API client and session token storage.
- Create `src/contexts/AuthContext.tsx`: session state and role helpers.
- Create `src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/pages/Dashboard.tsx`, `src/pages/DesignerDashboard.tsx`, `src/pages/ArtistDashboard.tsx`, `src/pages/ArtistRanking.tsx`, `src/pages/ArtistProfile.tsx`.
- Modify `src/App.tsx`: remove `/submit` from navigation, add auth provider and new routes, redirect `/admin` and `/submit` to `/dashboard`.
- Modify `src/pages/Admin.tsx`: keep only if still imported nowhere; otherwise stop routing to it.
- Modify `.env.example`: document `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`, `SETUP_SECRET`, `VITE_API_BASE_URL`.
- Modify `package.json`: add Vercel demo dependencies and scripts.
- Create `vercel.json`: Vite build output config if needed.

---

### Task 1: Add Platform Dependencies And Environment Contract

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `vercel.json`

- [ ] **Step 1: Update dependencies**

Add these dependencies to `package.json`:

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^1.0.1",
    "@vercel/blob": "^1.1.1"
  }
}
```

Keep all existing dependencies. Do not remove `express` or `server/*` yet because local legacy scripts still reference them.

- [ ] **Step 2: Add deployment env documentation**

Append this block to `.env.example`:

```dotenv
# Vercel demo platform
DATABASE_URL="postgres://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
SESSION_SECRET="replace-with-a-long-random-secret"
SETUP_SECRET="replace-with-a-long-random-setup-secret"
VITE_API_BASE_URL=""
```

- [ ] **Step 3: Add Vercel config**

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install @neondatabase/serverless @vercel/blob
```

Expected: `package-lock.json` updates and install exits with code 0.

- [ ] **Step 5: Verify TypeScript still compiles**

Run:

```bash
npm run lint
```

Expected: existing project may still compile before new API files are added. If it fails, fix only dependency/env-related issues introduced in this task.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example vercel.json
git commit -m "chore: add Vercel platform dependencies"
```

---

### Task 2: Add API Shared Types, HTTP Helpers, Database Schema, And Auth Helpers

**Files:**
- Create: `api/_lib/http.ts`
- Create: `api/_lib/db.ts`
- Create: `api/_lib/auth.ts`
- Create: `api/_lib/blob.ts`

- [ ] **Step 1: Create HTTP helper**

Create `api/_lib/http.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest, type SessionUser } from './auth';

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export function sendJson(res: VercelResponse, status: number, data: unknown) {
  res.status(status).json(data);
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'method_not_allowed' });
}

export function applyCors(res: VercelResponse, allowed: string[]) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Setup-Secret');
  res.setHeader('Access-Control-Allow-Methods', [...new Set([...allowed.map((method) => method.toUpperCase()), 'OPTIONS'])].join(', '));
}

export function requireMethod(req: VercelRequest, res: VercelResponse, allowed: string[]) {
  const method = req.method?.toUpperCase();
  if (method === 'OPTIONS') {
    applyCors(res, allowed);
    res.setHeader('Allow', [...new Set([...allowed.map((method) => method.toUpperCase()), 'OPTIONS'])].join(', '));
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
  role: 'designer' | 'artist'
) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== role) {
    sendJson(res, 403, { error: 'wrong_role' });
    return null;
  }
  return user;
}
```

- [ ] **Step 2: Create auth helper**

Create `api/_lib/auth.ts`:

```ts
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
export const MAX_PASSWORD_LENGTH = 128;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET is required');
  return value;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function assertPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string') {
    throw new TypeError('password must be a string');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError('password exceeds maximum length');
  }
}

export function hashPassword(password: unknown) {
  assertPassword(password);
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = crypto.scryptSync(password, salt, 64).toString('base64url');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: unknown, stored: string) {
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }
  const [scheme, salt, derived] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !derived) return false;
  const next = crypto.scryptSync(password, salt, 64).toString('base64url');
  const a = Buffer.from(next);
  const b = Buffer.from(derived);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSessionToken(user: SessionUser) {
  const payload = base64Url(JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string): SessionUser | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as SessionUser & { exp?: number };
    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) return null;
    if (parsed.role !== 'designer' && parsed.role !== 'artist') return null;
    return {
      id: parsed.id,
      username: parsed.username,
      role: parsed.role,
      displayName: parsed.displayName,
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
```

- [ ] **Step 3: Create database helper and schema**

Create `api/_lib/db.ts`:

```ts
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export const sql = neon(process.env.DATABASE_URL);

export async function setupSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('designer', 'artist')),
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT NOT NULL DEFAULT '',
      balance INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      image_path TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pricing_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      unit TEXT NOT NULL DEFAULT '寮?,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS collaborations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      designer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE collaborations
        ADD CONSTRAINT collaborations_id_designer_artist_key UNIQUE (id, designer_id, artist_id);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  await sql`
    CREATE OR REPLACE FUNCTION enforce_collaboration_role_invariant()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      designer_role TEXT;
      artist_role TEXT;
    BEGIN
      IF NEW.designer_id = NEW.artist_id THEN
        RAISE EXCEPTION 'collaboration participants must be different users'
          USING ERRCODE = '23514';
      END IF;

      SELECT role
        INTO designer_role
        FROM users
        WHERE id = NEW.designer_id;

      IF designer_role IS DISTINCT FROM 'designer' THEN
        RAISE EXCEPTION 'collaboration designer must have role designer'
          USING ERRCODE = '23514';
      END IF;

      SELECT role
        INTO artist_role
        FROM users
        WHERE id = NEW.artist_id;

      IF artist_role IS DISTINCT FROM 'artist' THEN
        RAISE EXCEPTION 'collaboration artist must have role artist'
          USING ERRCODE = '23514';
      END IF;

      RETURN NEW;
    END;
    $$;
  `;

  await sql`DROP TRIGGER IF EXISTS collaborations_role_invariant_trigger ON collaborations`;

  await sql`
    CREATE TRIGGER collaborations_role_invariant_trigger
    BEFORE INSERT OR UPDATE ON collaborations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_collaboration_role_invariant()
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collaboration_id UUID NOT NULL UNIQUE REFERENCES collaborations(id) ON DELETE CASCADE,
      designer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE reviews
        ADD CONSTRAINT reviews_collaboration_scope_fkey
        FOREIGN KEY (collaboration_id, designer_id, artist_id)
        REFERENCES collaborations(id, designer_id, artist_id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chicken_legs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
      designer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL CHECK (amount > 0),
      message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE chicken_legs
        ADD CONSTRAINT chicken_legs_collaboration_scope_fkey
        FOREIGN KEY (collaboration_id, designer_id, artist_id)
        REFERENCES collaborations(id, designer_id, artist_id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;
}

export function mapUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    balance: Number(row.balance || 0),
    createdAt: row.created_at,
  };
}

export function mapWork(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || '',
    imageUrl: row.image_url,
    imagePath: row.image_path || '',
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 4: Create Blob helper**

Create `api/_lib/blob.ts`:

```ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { IncomingMessage } from 'node:http';
import type { VercelRequest } from '@vercel/node';

const MAXIMUM_SIZE_IN_BYTES = 8 * 1024 * 1024;

export async function createBlobUploadResponse(body: HandleUploadBody, userId: string, request: VercelRequest | IncomingMessage) {
  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      const lower = pathname.toLowerCase();
      if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.webp')) {
        throw new Error('Only image uploads are allowed');
      }
      return {
        allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp'],
        maximumSizeInBytes: MAXIMUM_SIZE_IN_BYTES,
        tokenPayload: JSON.stringify({ userId }),
      };
    },
    onUploadCompleted: async () => {},
  });
}
```

- [ ] **Step 5: Run compile**

Run:

```bash
npm run lint
```

Expected: API helper files compile. If `@vercel/node` types are missing, install them with `npm install -D @vercel/node`.

- [ ] **Step 6: Commit**

```bash
git add api/_lib package.json package-lock.json
git commit -m "feat: add Vercel API foundation"
```

---

### Task 3: Add Setup And Authentication API Routes

**Files:**
- Create: `api/setup.ts`
- Create: `api/auth/register.ts`
- Create: `api/auth/login.ts`
- Create: `api/auth/me.ts`
- Create: `api/auth/logout.ts`

- [ ] **Step 1: Create schema setup endpoint**

Create `api/setup.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setupSchema } from './_lib/db';
import { requireMethod, sendJson } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;
  const secret = typeof req.headers['x-setup-secret'] === 'string' ? req.headers['x-setup-secret'] : '';
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    sendJson(res, 401, { error: 'invalid_setup_secret' });
    return;
  }
  await setupSchema();
  sendJson(res, 200, { ok: true });
}
```

- [ ] **Step 2: Create registration endpoint**

Create `api/auth/register.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSessionToken, hashPassword, MAX_PASSWORD_LENGTH, type UserRole } from '../_lib/auth';
import { mapUser, sql } from '../_lib/db';
import { rawStringValue, requireMethod, sendJson, textValue } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;

  const username = textValue(req.body?.username).toLowerCase();
  const password = rawStringValue(req.body?.password);
  const displayName = textValue(req.body?.displayName) || username;
  const role = req.body?.role as UserRole;

  if (!username || username.length < 3) return sendJson(res, 400, { error: 'username_too_short' });
  if (!password || password.length < 6 || password.length > MAX_PASSWORD_LENGTH) return sendJson(res, 400, { error: 'password_too_short' });
  if (role !== 'designer' && role !== 'artist') return sendJson(res, 400, { error: 'invalid_role' });

  try {
    const rows = await sql`
      INSERT INTO users (username, password_hash, role, display_name)
      VALUES (${username}, ${hashPassword(password)}, ${role}, ${displayName})
      RETURNING *
    `;
    const user = mapUser(rows[0]);
    sendJson(res, 201, { user, token: createSessionToken(user) });
  } catch (err: any) {
    if (String(err?.message || '').includes('duplicate') || err?.code === '23505') {
      return sendJson(res, 409, { error: 'username_exists' });
    }
    throw err;
  }
}
```

- [ ] **Step 3: Create login endpoint**

Create `api/auth/login.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSessionToken, MAX_PASSWORD_LENGTH, verifyPassword } from '../_lib/auth';
import { mapUser, sql } from '../_lib/db';
import { rawStringValue, requireMethod, sendJson, textValue } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;

  const username = textValue(req.body?.username).toLowerCase();
  const password = rawStringValue(req.body?.password);
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    sendJson(res, 401, { error: 'invalid_credentials' });
    return;
  }
  const rows = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  const row = rows[0];

  if (!row || !verifyPassword(password, row.password_hash)) {
    sendJson(res, 401, { error: 'invalid_credentials' });
    return;
  }

  const user = mapUser(row);
  sendJson(res, 200, { user, token: createSessionToken(user) });
}
```

- [ ] **Step 4: Create current user endpoint**

Create `api/auth/me.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) return;
  const session = await requireUser(req, res);
  if (!session) return;
  const rows = await sql`SELECT * FROM users WHERE id = ${session.id} LIMIT 1`;
  if (!rows[0]) return sendJson(res, 401, { error: 'user_not_found' });
  sendJson(res, 200, { user: mapUser(rows[0]) });
}
```

- [ ] **Step 5: Create logout endpoint**

Create `api/auth/logout.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireMethod, sendJson } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;
  sendJson(res, 200, { ok: true });
}
```

- [ ] **Step 6: Run compile**

Run:

```bash
npm run lint
```

Expected: TypeScript passes for auth routes.

- [ ] **Step 7: Commit**

```bash
git add api/setup.ts api/auth
git commit -m "feat: add account authentication APIs"
```

---

### Task 4: Add Works, Blob Upload, Profile, Pricing, And Artist Ranking APIs

**Files:**
- Create: `api/blob/upload-token.ts`
- Create: `api/works/index.ts`
- Create: `api/works/[id].ts`
- Create: `api/profile.ts`
- Create: `api/pricing.ts`
- Create: `api/artists/index.ts`
- Create: `api/artists/[id].ts`

- [ ] **Step 1: Create Blob upload token endpoint**

Create `api/blob/upload-token.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBlobUploadResponse } from '../_lib/blob';
import { requireMethod, requireUser, sendJson } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const result = await createBlobUploadResponse(req.body, user.id, req);
  sendJson(res, 200, result);
}
```

- [ ] **Step 2: Create works collection endpoint**

Create `api/works/index.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapWork, sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    const userId = textValue(req.query.userId);
    const rows = userId
      ? await sql`SELECT * FROM works WHERE user_id = ${userId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM works ORDER BY created_at DESC LIMIT 80`;
    return sendJson(res, 200, { works: rows.map((row) => mapWork(row)) });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const title = textValue(req.body?.title);
  const description = textValue(req.body?.description);
  const imageUrl = textValue(req.body?.imageUrl);
  const imagePath = textValue(req.body?.imagePath);
  if (!title) return sendJson(res, 400, { error: 'invalid_work' });
  if (
    !imageUrl ||
    !imagePath ||
    (() => {
      try {
        const url = new URL(imageUrl);
        const host = url.hostname.toLowerCase();
        return (
          url.protocol !== 'https:' ||
          url.pathname === '/' ||
          (!host.endsWith('.public.blob.vercel-storage.com') &&
            host !== 'blob.vercel-storage.com' &&
            !host.endsWith('.blob.vercel-storage.com'))
        );
      } catch {
        return true;
      }
    })()
  ) {
    return sendJson(res, 400, { error: 'invalid_work_image' });
  }

  const rows = await sql`
    INSERT INTO works (user_id, title, description, image_url, image_path)
    VALUES (${user.id}, ${title}, ${description}, ${imageUrl}, ${imagePath})
    RETURNING *
  `;
  sendJson(res, 201, { work: mapWork(rows[0]) });
}
```

- [ ] **Step 3: Create work delete endpoint**

Create `api/works/[id].ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['DELETE'])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const id = textValue(req.query.id);
  if (!id) return sendJson(res, 400, { error: 'invalid_work_id' });
  const rows = await sql`DELETE FROM works WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
  if (!rows[0]) return sendJson(res, 404, { error: 'not_found' });
  sendJson(res, 200, { ok: true });
}
```

- [ ] **Step 4: Create profile endpoint**

Create `api/profile.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, sql } from './_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['PUT'])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const displayName = textValue(req.body?.displayName);
  const bio = textValue(req.body?.bio);
  const avatarUrl = textValue(req.body?.avatarUrl);
  if (!displayName) return sendJson(res, 400, { error: 'display_name_required' });

  const rows = await sql`
    UPDATE users
    SET display_name = ${displayName}, bio = ${bio}, avatar_url = ${avatarUrl}, updated_at = now()
    WHERE id = ${user.id}
    RETURNING *
  `;
  sendJson(res, 200, { user: mapUser(rows[0]) });
}
```

- [ ] **Step 5: Create pricing endpoint**

Create `api/pricing.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, requireRole, sendJson } from './_lib/http';

const ALLOWED_UNITS = new Set([
  'item',
  'piece',
  'set',
  'session',
  'hour',
  'day',
  '次',
  '张',
  '套',
  '起/张',
  '起/套',
  '起/次',
  '起/小时',
  '起/天',
]);

function mapPricing(row: any) {
  return {
    id: row.id,
    artistId: row.artist_id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price || 0),
    unit: row.unit || 'item',
    sortOrder: Number(row.sort_order || 0),
  };
}

function parsePricingItems(items: unknown) {
  if (!Array.isArray(items)) return null;

  const parsed: Array<{ name: string; description: string; price: number; unit: string }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') return null;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
    const price = Number(item.price);
    if (!name || !unit || !Number.isFinite(price) || price < 0 || !ALLOWED_UNITS.has(unit)) return null;
    parsed.push({ name, description, price, unit });
  }

  return parsed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'PUT'])) return;
  const artistId = typeof req.query.artistId === 'string' ? req.query.artistId : '';

  if (req.method === 'GET') {
    if (!artistId) return sendJson(res, 400, { error: 'artist_id_required' });
    const rows = await sql`SELECT * FROM pricing_items WHERE artist_id = ${artistId} ORDER BY sort_order ASC`;
    return sendJson(res, 200, { items: rows.map(mapPricing) });
  }

  const user = await requireRole(req, res, 'artist');
  if (!user) return;
  const items = parsePricingItems(req.body?.items);
  if (!items) return sendJson(res, 400, { error: 'invalid_pricing_items' });

  const transactionalSql = sql as typeof sql & { transaction?: (queries: unknown[]) => Promise<unknown> };
  if (typeof transactionalSql.transaction === 'function') {
    await transactionalSql.transaction([
      transactionalSql`DELETE FROM pricing_items WHERE artist_id = ${user.id}`,
      ...items.map(
        (item, i) => transactionalSql`
          INSERT INTO pricing_items (artist_id, name, description, price, unit, sort_order)
          VALUES (${user.id}, ${item.name}, ${item.description}, ${item.price}, ${item.unit}, ${i})
        `
      ),
    ]);
  } else {
    await sql`DELETE FROM pricing_items WHERE artist_id = ${user.id}`;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      await sql`
        INSERT INTO pricing_items (artist_id, name, description, price, unit, sort_order)
        VALUES (${user.id}, ${item.name}, ${item.description}, ${item.price}, ${item.unit}, ${i})
      `;
    }
  }
  const rows = await sql`SELECT * FROM pricing_items WHERE artist_id = ${user.id} ORDER BY sort_order ASC`;
  sendJson(res, 200, { items: rows.map(mapPricing) });
}
```

- [ ] **Step 6: Create artist ranking endpoint**

Create `api/artists/index.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { requireMethod, sendJson } from '../_lib/http';

function mapArtist(row: any) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    reviewCount: Number(row.review_count || 0),
    averageRating: Number(row.average_rating || 0),
    chickenLegTotal: Number(row.chicken_leg_total || 0),
    collaborationCount: Number(row.collaboration_count || 0),
    workCount: Number(row.work_count || 0),
    score: Number(row.score || 0),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) return;
  const rows = await sql`
    WITH review_stats AS (
      SELECT artist_id, COUNT(*)::int AS review_count, COALESCE(AVG(rating), 0) AS average_rating
      FROM reviews
      GROUP BY artist_id
    ),
    chicken_stats AS (
      SELECT artist_id, COALESCE(SUM(amount), 0) AS chicken_leg_total
      FROM chicken_legs
      GROUP BY artist_id
    ),
    collaboration_stats AS (
      SELECT artist_id, COUNT(*)::int AS collaboration_count
      FROM collaborations
      GROUP BY artist_id
    ),
    work_stats AS (
      SELECT user_id AS artist_id, COUNT(*)::int AS work_count
      FROM works
      GROUP BY user_id
    )
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.bio,
      COALESCE(rs.review_count, 0) AS review_count,
      COALESCE(rs.average_rating, 0) AS average_rating,
      COALESCE(cs.chicken_leg_total, 0) AS chicken_leg_total,
      COALESCE(collab.collaboration_count, 0) AS collaboration_count,
      COALESCE(ws.work_count, 0) AS work_count,
      (
        COALESCE(rs.review_count, 0) * 1000
        + COALESCE(rs.average_rating, 0) * 100
        + COALESCE(cs.chicken_leg_total, 0) * 10
        + COALESCE(collab.collaboration_count, 0) * 5
        + COALESCE(ws.work_count, 0)
      ) AS score
    FROM users u
    LEFT JOIN review_stats rs ON rs.artist_id = u.id
    LEFT JOIN chicken_stats cs ON cs.artist_id = u.id
    LEFT JOIN collaboration_stats collab ON collab.artist_id = u.id
    LEFT JOIN work_stats ws ON ws.artist_id = u.id
    WHERE u.role = 'artist'
    ORDER BY score DESC, u.created_at ASC
    LIMIT 100
  `;
  sendJson(res, 200, { artists: rows.map(mapArtist) });
}
```

- [ ] **Step 7: Create artist detail endpoint**

Create `api/artists/[id].ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, mapWork, sql } from '../_lib/db';
import { requireMethod, sendJson, textValue } from '../_lib/http';

function mapPricing(row: any) {
  return {
    id: row.id,
    artistId: row.artist_id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price || 0),
    unit: row.unit || 'item',
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapReview(row: any) {
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    designerId: row.designer_id,
    artistId: row.artist_id,
    designerName: row.designer_name || '',
    designerAvatarUrl: row.designer_avatar_url || '',
    rating: Number(row.rating || 0),
    content: row.content,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET'])) return;
  const id = textValue(req.query.id);
  if (!id) return sendJson(res, 400, { error: 'artist_id_required' });

  const users = await sql`SELECT * FROM users WHERE id = ${id} AND role = 'artist' LIMIT 1`;
  if (!users[0]) return sendJson(res, 404, { error: 'artist_not_found' });

  const works = await sql`SELECT * FROM works WHERE user_id = ${id} ORDER BY created_at DESC`;
  const pricing = await sql`SELECT * FROM pricing_items WHERE artist_id = ${id} ORDER BY sort_order ASC`;
  const reviews = await sql`
    SELECT r.*, u.display_name AS designer_name, u.avatar_url AS designer_avatar_url
    FROM reviews r
    JOIN users u ON u.id = r.designer_id
    WHERE r.artist_id = ${id}
    ORDER BY r.created_at DESC
  `;

  sendJson(res, 200, {
    artist: mapUser(users[0]),
    works: works.map((row) => mapWork(row)),
    pricing: pricing.map(mapPricing),
    reviews: reviews.map(mapReview),
  });
}
```

- [ ] **Step 8: Run compile and commit**

Run:

```bash
npm run lint
```

Expected: TypeScript passes.

Commit:### Task 5: Add Collaboration, Review, Chicken Leg, And Demo Balance APIs

**Files:**
- Create: `api/collaborations/index.ts`
- Create: `api/collaborations/[id].ts`
- Create: `api/reviews.ts`
- Create: `api/chicken-legs.ts`
- Create: `api/balance/top-up.ts`

- [ ] **Step 1: Create collaboration collection endpoint**

Create `api/collaborations/index.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from '../_lib/http';

function mapCollaboration(row: any) {
  return {
    id: row.id,
    designerId: row.designer_id,
    artistId: row.artist_id,
    status: row.status,
    title: row.title,
    note: row.note || '',
    artistName: row.artist_name || '',
    designerName: row.designer_name || '',
    createdAt: row.created_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['GET', 'POST'])) return;
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const rows = user.role === 'designer'
      ? await sql`
        SELECT c.*, a.display_name AS artist_name, d.display_name AS designer_name
        FROM collaborations c
        JOIN users a ON a.id = c.artist_id
        JOIN users d ON d.id = c.designer_id
        WHERE c.designer_id = ${user.id}
        ORDER BY c.created_at DESC
      `
      : await sql`
        SELECT c.*, a.display_name AS artist_name, d.display_name AS designer_name
        FROM collaborations c
        JOIN users a ON a.id = c.artist_id
        JOIN users d ON d.id = c.designer_id
        WHERE c.artist_id = ${user.id}
        ORDER BY c.created_at DESC
      `;
    return sendJson(res, 200, { collaborations: rows.map(mapCollaboration) });
  }

  if (user.role !== 'designer') return sendJson(res, 403, { error: 'designer_required' });
  const artistId = textValue(req.body?.artistId);
  const title = textValue(req.body?.title) || '鍚堜綔椤圭洰';
  const note = textValue(req.body?.note);
  const artists = await sql`SELECT id FROM users WHERE id = ${artistId} AND role = 'artist' LIMIT 1`;
  if (!artists[0]) return sendJson(res, 404, { error: 'artist_not_found' });

  const rows = await sql`
    INSERT INTO collaborations (designer_id, artist_id, title, note)
    VALUES (${user.id}, ${artistId}, ${title}, ${note})
    RETURNING *
  `;
  sendJson(res, 201, { collaboration: mapCollaboration(rows[0]) });
}
```

- [ ] **Step 2: Create collaboration status endpoint**

Create `api/collaborations/[id].ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db';
import { requireMethod, requireUser, sendJson, textValue } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['PUT'])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const id = textValue(req.query.id);
  const status = req.body?.status === 'completed' ? 'completed' : 'active';
  const rows = await sql`
    UPDATE collaborations
    SET status = ${status}, updated_at = now()
    WHERE id = ${id} AND (designer_id = ${user.id} OR artist_id = ${user.id})
    RETURNING *
  `;
  if (!rows[0]) return sendJson(res, 404, { error: 'not_found' });
  sendJson(res, 200, { collaboration: rows[0] });
}
```

- [ ] **Step 3: Create review endpoint**

Create `api/reviews.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, requireRole, sendJson, textValue } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;
  const user = await requireRole(req, res, 'designer');
  if (!user) return;

  const collaborationId = textValue(req.body?.collaborationId);
  const rating = Number(req.body?.rating);
  const content = textValue(req.body?.content);
  if (!collaborationId || rating < 1 || rating > 5 || !content) {
    return sendJson(res, 400, { error: 'invalid_review' });
  }

  const collaborations = await sql`
    SELECT * FROM collaborations
    WHERE id = ${collaborationId} AND designer_id = ${user.id}
    LIMIT 1
  `;
  const collaboration = collaborations[0];
  if (!collaboration) return sendJson(res, 403, { error: 'collaboration_required' });

  try {
    const rows = await sql`
      INSERT INTO reviews (collaboration_id, designer_id, artist_id, rating, content)
      VALUES (${collaborationId}, ${user.id}, ${collaboration.artist_id}, ${rating}, ${content})
      RETURNING *
    `;
    sendJson(res, 201, { review: rows[0] });
  } catch (err: any) {
    if (err?.code === '23505' || String(err?.message || '').includes('duplicate')) {
      return sendJson(res, 409, { error: 'review_exists' });
    }
    throw err;
  }
}
```

- [ ] **Step 4: Create chicken leg endpoint**

Create `api/chicken-legs.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db';
import { requireMethod, requireRole, sendJson, textValue } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;
  const user = await requireRole(req, res, 'designer');
  if (!user) return;

  const collaborationId = textValue(req.body?.collaborationId);
  const amount = Number(req.body?.amount || 0);
  const message = textValue(req.body?.message);
  if (!collaborationId || amount <= 0) return sendJson(res, 400, { error: 'invalid_chicken_leg' });

  const collaborations = await sql`
    SELECT * FROM collaborations
    WHERE id = ${collaborationId} AND designer_id = ${user.id}
    LIMIT 1
  `;
  const collaboration = collaborations[0];
  if (!collaboration) return sendJson(res, 403, { error: 'collaboration_required' });

  const balances = await sql`SELECT balance FROM users WHERE id = ${user.id} LIMIT 1`;
  if (Number(balances[0]?.balance || 0) < amount) return sendJson(res, 400, { error: 'insufficient_balance' });

  await sql`UPDATE users SET balance = balance - ${amount}, updated_at = now() WHERE id = ${user.id}`;
  const rows = await sql`
    INSERT INTO chicken_legs (collaboration_id, designer_id, artist_id, amount, message)
    VALUES (${collaborationId}, ${user.id}, ${collaboration.artist_id}, ${amount}, ${message})
    RETURNING *
  `;
  sendJson(res, 201, { chickenLeg: rows[0] });
}
```

- [ ] **Step 5: Create demo top-up endpoint**

Create `api/balance/top-up.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapUser, sql } from '../_lib/db';
import { requireMethod, requireRole, sendJson } from '../_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, ['POST'])) return;
  const user = await requireRole(req, res, 'designer');
  if (!user) return;
  const amount = Number(req.body?.amount || 0);
  if (amount <= 0 || amount > 100000) return sendJson(res, 400, { error: 'invalid_amount' });
  const rows = await sql`
    UPDATE users
    SET balance = balance + ${amount}, updated_at = now()
    WHERE id = ${user.id}
    RETURNING *
  `;
  sendJson(res, 200, { user: mapUser(rows[0]) });
}
```

- [ ] **Step 6: Run compile and commit**

Run:

```bash
npm run lint
```

Expected: TypeScript passes.

Commit:

```bash
git add api/collaborations api/reviews.ts api/chicken-legs.ts api/balance
git commit -m "feat: add collaboration and reward APIs"
```

---

### Task 6: Add Frontend Platform Types, API Client, And Auth Context

**Files:**
- Create: `src/types/platform.ts`
- Create: `src/lib/platformApi.ts`
- Create: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Create shared frontend types**

Create `src/types/platform.ts`:

```ts
export type UserRole = 'designer' | 'artist';

export type PlatformUser = {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  avatarUrl: string;
  bio: string;
  balance: number;
};

export type Work = {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePath: string;
  createdAt: string;
};

export type ArtistRank = PlatformUser & {
  reviewCount: number;
  averageRating: number;
  chickenLegTotal: number;
  collaborationCount: number;
  workCount: number;
  score: number;
};

export type PricingItem = {
  id?: string;
  artistId?: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  sortOrder?: number;
};

export type Collaboration = {
  id: string;
  designerId: string;
  artistId: string;
  status: 'active' | 'completed';
  title: string;
  note: string;
  artistName?: string;
  designerName?: string;
  createdAt: string;
};
```

- [ ] **Step 2: Create platform API client**

Create `src/lib/platformApi.ts`:

```ts
import type { PlatformUser, UserRole } from '../types/platform';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
const TOKEN_KEY = 'studio_aruo_session_token';

export function getSessionToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setSessionToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function platformRequest<T>(path: string, options: RequestInit & { json?: unknown } = {}) {
  const { json, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(getSessionToken() ? { Authorization: `Bearer ${getSessionToken()}` } : {}),
      ...(headers || {}),
    },
    body: json === undefined ? rest.body : JSON.stringify(json),
  });
  const data = await parseResponse(res);
  if (!res.ok) {
    const message = typeof data === 'object' && data && 'error' in data ? String((data as any).error) : `HTTP_${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export function registerAccount(input: { username: string; password: string; displayName: string; role: UserRole }) {
  return platformRequest<{ user: PlatformUser; token: string }>('/api/auth/register', { method: 'POST', json: input });
}

export function loginAccount(input: { username: string; password: string }) {
  return platformRequest<{ user: PlatformUser; token: string }>('/api/auth/login', { method: 'POST', json: input });
}

export function fetchMe() {
  return platformRequest<{ user: PlatformUser }>('/api/auth/me');
}
```

- [ ] **Step 3: Create auth context**

Create `src/contexts/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PlatformUser, UserRole } from '../types/platform';
import { clearSessionToken, fetchMe, loginAccount, registerAccount, setSessionToken } from '../lib/platformApi';

type AuthContextType = {
  user: PlatformUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: { username: string; password: string; displayName: string; role: UserRole }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const next = await fetchMe();
      setUser(next.user);
    } catch {
      clearSessionToken();
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    login: async (username, password) => {
      const result = await loginAccount({ username, password });
      setSessionToken(result.token);
      setUser(result.user);
    },
    register: async (input) => {
      const result = await registerAccount(input);
      setSessionToken(result.token);
      setUser(result.user);
    },
    logout: () => {
      clearSessionToken();
      setUser(null);
    },
    refreshUser,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
```

- [ ] **Step 4: Run compile and commit**

Run:

```bash
npm run lint
```

Expected: TypeScript passes.

Commit:

```bash
git add src/types/platform.ts src/lib/platformApi.ts src/contexts/AuthContext.tsx
git commit -m "feat: add frontend auth foundation"
```

---

### Task 7: Add Login, Register, Dashboard Routing, And Navigation Changes

**Files:**
- Create: `src/pages/Login.tsx`
- Create: `src/pages/Register.tsx`
- Create: `src/pages/Dashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create login page**

Create `src/pages/Login.tsx` with a compact form that calls `useAuth().login`, displays invalid credential errors, and redirects to `/dashboard` after success.

```tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch {
      setError('璐﹀彿鎴栧瘑鐮佷笉姝ｇ‘');
    }
  };

  return (
    <PageTransition>
      <section className="max-w-md mx-auto pt-16">
        <h2 className="text-4xl text-white mb-3">鐧诲綍</h2>
        <p className="text-text-secondary mb-8">杩涘叆浣犵殑 Studio Aruo 宸ヤ綔鍙?/p>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="璐﹀彿" />
          <input className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="瀵嗙爜" type="password" />
          {error && <p className="text-accent-orange text-sm">{error}</p>}
          <button className="w-full bg-white text-black rounded-lg py-3 font-medium">鐧诲綍</button>
        </form>
        <Link className="block mt-5 text-accent-blue text-sm" to="/register">杩樻病鏈夎处鍙凤紵鍘绘敞鍐?/Link>
      </section>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Create register page**

Create `src/pages/Register.tsx` with username, display name, password, and role selector.

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/platform';
import { cn } from '../lib/utils';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('designer');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register({ username, displayName, password, role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message === 'username_exists' ? '杩欎釜璐﹀彿宸茬粡琚敞鍐? : '娉ㄥ唽澶辫触锛岃妫€鏌ヤ俊鎭?);
    }
  };

  return (
    <PageTransition>
      <section className="max-w-2xl mx-auto pt-12">
        <h2 className="text-4xl text-white mb-3">鍒涘缓璐﹀彿</h2>
        <p className="text-text-secondary mb-8">閫夋嫨浣犲湪骞冲彴閲岀殑韬唤锛岀涓€鏈熸敞鍐屽悗涓嶅彲淇敼銆?/p>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { role: 'designer' as const, title: '璁捐甯?, desc: '鎸戦€夌粯鍥惧憳銆佽瘎浠枫€佸姞楦¤吙銆佷笂浼犲睍绀轰綔鍝? },
              { role: 'artist' as const, title: '缁樺浘鍛?, desc: '涓婁紶浣滃搧銆佺紪杈戝椁愪环鏍笺€佽幏寰楄瘎浠峰拰楦¤吙' },
            ].map((item) => (
              <button type="button" key={item.role} onClick={() => setRole(item.role)} className={cn('text-left border rounded-lg p-4', role === item.role ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-glass-border')}>
                <strong>{item.title}</strong>
                <span className="block text-sm opacity-70 mt-2">{item.desc}</span>
              </button>
            ))}
          </div>
          <input className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="璐﹀彿" />
          <input className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="鏄电О / 灞曠ず鍚? />
          <input className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="瀵嗙爜锛岃嚦灏?6 浣? type="password" />
          {error && <p className="text-accent-orange text-sm">{error}</p>}
          <button className="w-full bg-white text-black rounded-lg py-3 font-medium">娉ㄥ唽骞惰繘鍏ュ伐浣滃彴</button>
        </form>
      </section>
    </PageTransition>
  );
}
```

- [ ] **Step 3: Create dashboard redirect page**

Create `src/pages/Dashboard.tsx`:

```tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-white">鍔犺浇涓?..</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'designer' ? '/dashboard/designer' : '/dashboard/artist'} replace />;
}
```

- [ ] **Step 4: Modify `src/App.tsx` routes and nav**

Add imports:

```ts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DesignerDashboard } from './pages/DesignerDashboard';
import { ArtistDashboard } from './pages/ArtistDashboard';
import { ArtistRanking } from './pages/ArtistRanking';
import { ArtistProfile } from './pages/ArtistProfile';
import { Navigate } from 'react-router-dom';
```

Update navigation links:

```ts
const links = [
  { href: '/', label: '浣滃搧搴?, number: '01' },
  { href: '/pricing', label: '浠锋牸鍙傝€?, number: '02' },
  { href: '/artists', label: '缁樺浘鍛樻帓琛?, number: '03' },
  { href: '/guide', label: '鏈嶅姟涓庢墜鍐?, number: '04' },
  { href: '/dashboard', label: '鐧诲綍 / 宸ヤ綔鍙?, number: '05' },
];
```

Update routes:

```tsx
<Route path="/" element={<Gallery />} />
<Route path="/pricing" element={<Pricing />} />
<Route path="/artists" element={<ArtistRanking />} />
<Route path="/artists/:id" element={<ArtistProfile />} />
<Route path="/guide" element={<Guide />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/dashboard/designer" element={<DesignerDashboard />} />
<Route path="/dashboard/artist" element={<ArtistDashboard />} />
<Route path="/admin" element={<Navigate to="/dashboard" replace />} />
<Route path="/submit" element={<Navigate to="/dashboard" replace />} />
```

Wrap the router with `AuthProvider` inside `DataProvider`:

```tsx
<DataProvider>
  <AuthProvider>
    <Router>
      ...
    </Router>
  </AuthProvider>
</DataProvider>
```

- [ ] **Step 5: Run compile and commit**

Run:

```bash
npm run lint
```

Expected: It may fail because dashboard pages are imported but not created yet. If so, create temporary exports in Task 8 before committing, or complete Task 8 in the same checkpoint.

Commit after Task 8 if this step cannot compile independently.

---

### Task 8: Add Role Dashboards, Ranking, And Artist Profile UI

**Files:**
- Create: `src/pages/DesignerDashboard.tsx`
- Create: `src/pages/ArtistDashboard.tsx`
- Create: `src/pages/ArtistRanking.tsx`
- Create: `src/pages/ArtistProfile.tsx`
- Modify: `src/lib/platformApi.ts`

- [ ] **Step 1: Extend frontend API client**

Append these helpers to `src/lib/platformApi.ts`:

```ts
import type { ArtistRank, Collaboration, PricingItem, Work } from '../types/platform';

export function fetchArtists() {
  return platformRequest<{ artists: ArtistRank[] }>('/api/artists');
}

export function fetchArtist(id: string) {
  return platformRequest<{ artist: any; works: Work[]; pricing: PricingItem[]; reviews: any[] }>(`/api/artists/${id}`);
}

export function createWork(input: { title: string; description: string; imageUrl: string; imagePath?: string }) {
  return platformRequest<{ work: Work }>('/api/works', { method: 'POST', json: input });
}

export function fetchWorks(userId?: string) {
  return platformRequest<{ works: Work[] }>(userId ? `/api/works?userId=${encodeURIComponent(userId)}` : '/api/works');
}

export function fetchCollaborations() {
  return platformRequest<{ collaborations: Collaboration[] }>('/api/collaborations');
}

export function createCollaboration(input: { artistId: string; title: string; note: string }) {
  return platformRequest<{ collaboration: Collaboration }>('/api/collaborations', { method: 'POST', json: input });
}

export function createReview(input: { collaborationId: string; rating: number; content: string }) {
  return platformRequest<{ review: any }>('/api/reviews', { method: 'POST', json: input });
}

export function giveChickenLeg(input: { collaborationId: string; amount: number; message: string }) {
  return platformRequest<{ chickenLeg: any }>('/api/chicken-legs', { method: 'POST', json: input });
}

export function topUpBalance(amount: number) {
  return platformRequest<{ user: any }>('/api/balance/top-up', { method: 'POST', json: { amount } });
}

export function savePricing(items: PricingItem[]) {
  return platformRequest<{ items: PricingItem[] }>('/api/pricing', { method: 'PUT', json: { items } });
}
```

- [ ] **Step 2: Create artist ranking page**

Create `src/pages/ArtistRanking.tsx` with a `useEffect` that calls `fetchArtists()`, renders rank cards, and links each card to `/artists/:id`. Show review count, average rating, chicken leg total, collaboration count, and work count.

- [ ] **Step 3: Create artist profile page**

Create `src/pages/ArtistProfile.tsx` with:

- Artist summary.
- Works grid.
- Pricing list.
- Reviews list.
- Designer-only "鍙戣捣鍚堜綔" form using `createCollaboration`.

If the logged-in user is not a designer, hide the collaboration form and show a short note.

- [ ] **Step 4: Create designer dashboard**

Create `src/pages/DesignerDashboard.tsx` with:

- Current user card and balance.
- Demo top-up buttons calling `topUpBalance(100)` and `topUpBalance(500)`.
- Upload/display work form using `createWork`.
- Collaboration list using `fetchCollaborations`.
- For each collaboration, show review form and chicken leg form.
- Link to `/artists`.

Use a simple URL input for image upload first if Blob client upload wiring is not ready. Replace it with Blob upload in Task 9.

- [ ] **Step 5: Create artist dashboard**

Create `src/pages/ArtistDashboard.tsx` with:

- Current user card.
- Work upload form using `createWork`.
- Pricing editor with rows `{ name, description, price, unit }` and save button using `savePricing`.
- Collaboration list using `fetchCollaborations`.
- Link to `/artists`.

Use a simple URL input for image upload first if Blob client upload wiring is not ready. Replace it with Blob upload in Task 9.

- [ ] **Step 6: Run compile and commit**

Run:

```bash
npm run lint
```

Expected: TypeScript passes for new routes and dashboards.

Commit:

```bash
git add src/App.tsx src/pages/Login.tsx src/pages/Register.tsx src/pages/Dashboard.tsx src/pages/DesignerDashboard.tsx src/pages/ArtistDashboard.tsx src/pages/ArtistRanking.tsx src/pages/ArtistProfile.tsx src/lib/platformApi.ts src/types/platform.ts
git commit -m "feat: add role-based platform UI"
```

---

### Task 9: Wire Vercel Blob Client Upload Into Dashboards

**Files:**
- Modify: `src/lib/platformApi.ts`
- Create: `src/components/ImageUploadField.tsx`
- Modify: `src/pages/DesignerDashboard.tsx`
- Modify: `src/pages/ArtistDashboard.tsx`

- [ ] **Step 1: Add Blob upload dependency usage**

In `src/lib/platformApi.ts`, import the client helper:

```ts
import { upload } from '@vercel/blob/client';
```

Add:

```ts
export async function uploadImage(file: File) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload-token',
    clientPayload: JSON.stringify({ originalName: file.name }),
    headers: getSessionToken() ? { Authorization: `Bearer ${getSessionToken()}` } : {},
  });
  return { url: blob.url, pathname: blob.pathname };
}
```

- [ ] **Step 2: Create reusable upload field**

Create `src/components/ImageUploadField.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadImage } from '../lib/platformApi';

export function ImageUploadField({ value, onChange }: { value: string; onChange: (next: { url: string; path: string }) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const choose = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const next = await uploadImage(file);
      onChange({ url: next.url, path: next.pathname });
    } catch {
      setError('鍥剧墖涓婁紶澶辫触锛岃鎹竴寮犲浘鐗囬噸璇?);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      <button type="button" onClick={() => ref.current?.click()} className="inline-flex items-center gap-2 bg-white/10 border border-glass-border rounded-lg px-4 py-2 text-white">
        <Upload size={16} />
        {busy ? '涓婁紶涓?..' : '涓婁紶鍥剧墖'}
      </button>
      {value && <img src={value} alt="" className="w-32 h-24 object-cover rounded-lg border border-glass-border" />}
      {error && <p className="text-accent-orange text-sm">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Replace URL inputs**

In `DesignerDashboard.tsx` and `ArtistDashboard.tsx`, replace image URL text inputs with `ImageUploadField`. Store both `imageUrl` and `imagePath` in component state, then pass them to `createWork`.

- [ ] **Step 4: Run compile and commit**

Run:

```bash
npm run lint
```

Expected: TypeScript passes.

Commit:

```bash
git add src/components/ImageUploadField.tsx src/lib/platformApi.ts src/pages/DesignerDashboard.tsx src/pages/ArtistDashboard.tsx
git commit -m "feat: upload works to Vercel Blob"
```

---

### Task 10: Remove Canvas From Product Surface And Clean Legacy Admin Password Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Admin.tsx` or stop importing it
- Optional Delete: `src/pages/CanvasSubmission.tsx`
- Modify: `package.json`

- [ ] **Step 1: Confirm routes no longer expose canvas**

Check `src/App.tsx` and ensure no active route renders `CanvasSubmission`.

Expected active redirect:

```tsx
<Route path="/submit" element={<Navigate to="/dashboard" replace />} />
```

- [ ] **Step 2: Remove unused imports**

Remove `CanvasSubmission` and `Admin` imports from `src/App.tsx` if no route renders them.

- [ ] **Step 3: Remove Konva dependencies if canvas file is deleted**

If `src/pages/CanvasSubmission.tsx` and canvas viewer usage in `Admin.tsx` are deleted or no longer imported, remove these dependencies:

```bash
npm uninstall konva react-konva use-image
```

If `Admin.tsx` is retained as a legacy file for reference, do not uninstall these packages in this task.

- [ ] **Step 4: Run compile and commit**

Run:

```bash
npm run lint
```

Expected: TypeScript passes and no missing import errors remain.

Commit:

```bash
git add src/App.tsx src/pages package.json package-lock.json
git commit -m "refactor: remove canvas and shared admin password surface"
```

---

### Task 11: Vercel Setup, Smoke Test, And Deployment Checklist

**Files:**
- Create: `docs/vercel-demo-setup.md`
- Modify: `README.md`

- [ ] **Step 1: Create setup documentation**

Create `docs/vercel-demo-setup.md` with:

```md
# Vercel Demo Setup

## Required Vercel Environment Variables

- `DATABASE_URL`: Neon Postgres connection string.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token.
- `SESSION_SECRET`: long random string for session signing.
- `SETUP_SECRET`: long random string for schema setup.
- `VITE_API_BASE_URL`: empty for same-origin Vercel deployment.

## First Deployment

1. Import the GitHub repository into Vercel.
2. Add Neon Postgres from Vercel Marketplace or paste an existing Neon `DATABASE_URL`.
3. Add Vercel Blob storage and expose `BLOB_READ_WRITE_TOKEN`.
4. Add `SESSION_SECRET` and `SETUP_SECRET`.
5. Deploy.
6. Run schema setup:

```bash
curl -X POST https://YOUR-VERCEL-DOMAIN.vercel.app/api/setup \
  -H "x-setup-secret: YOUR_SETUP_SECRET"
```

7. Register one designer account and one render artist account.
8. Upload artist works, set pricing, start collaboration, review, top up balance, and give chicken legs.
```

- [ ] **Step 2: Update README**

Add a short "Vercel demo platform" section linking to `docs/vercel-demo-setup.md`.

- [ ] **Step 3: Run local build**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 4: Deploy via GitHub/Vercel**

Push the branch to GitHub and let Vercel build from `main` or a preview branch.

Expected: Vercel deployment succeeds.

- [ ] **Step 5: Smoke test on Vercel**

Manual checks:

1. `POST /api/setup` returns `{ "ok": true }`.
2. Register designer.
3. Register render artist.
4. Artist uploads a work through Blob.
5. Artist saves pricing.
6. Designer starts a collaboration.
7. Designer adds a review.
8. Designer top-ups demo balance.
9. Designer gives chicken legs.
10. Artist ranking reflects the review and chicken legs.

- [ ] **Step 6: Commit docs**

```bash
git add docs/vercel-demo-setup.md README.md
git commit -m "docs: add Vercel demo setup guide"
```

---

## Self-Review

- Spec coverage: This plan covers Vercel deployment, Neon Postgres, Vercel Blob, registration/login, role dashboards, canvas removal, collaboration-gated reviews, chicken legs, simulated top-up, and ranking.
- Placeholder scan: No `TBD`, `TODO`, "implement later", or unspecified test steps remain.
- Type consistency: Frontend types use `designer` and `artist`; API routes use the same role literals. Work fields use `imageUrl`/`imagePath` on the frontend and `image_url`/`image_path` in the database.


