import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import { readDb, writeDb, defaultDb, getDbPath } from './db';
import { ChatMessage, PricingItem, Submission } from './types';

type SseClient = {
  id: string;
  res: express.Response;
};

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'change-me';
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || `${ADMIN_PASSWORD}:studio-aruo`;
const ADMIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

app.disable('x-powered-by');
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const clients = new Map<string, SseClient>();

function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients.values()) {
    c.res.write(payload);
  }
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

function sign(payload: string) {
  return crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
}

function createAdminToken() {
  const payload = toBase64Url(JSON.stringify({ role: 'admin', exp: Date.now() + ADMIN_TOKEN_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

function isValidAdminToken(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { role?: string; exp?: number };
    return data.role === 'admin' && typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, dbPath: getDbPath() });
});

app.post('/api/admin/login', async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'invalid_password' });
  }
  res.json({ token: createAdminToken() });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const id = `sse-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  clients.set(id, { id, res });
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  req.on('close', () => {
    clients.delete(id);
  });
});

app.get('/api/submissions', async (_req, res) => {
  const db = await readDb();
  res.json(db.submissions);
});

app.post('/api/submissions', async (req, res) => {
  const input = req.body as Partial<Submission>;
  if (!input?.image || !input?.state) return res.status(400).json({ error: 'invalid_submission' });

  const db = await readDb();
  const id = input.id && typeof input.id === 'string' ? input.id : `SUB-${Date.now()}`;
  const existingIdx = db.submissions.findIndex((s) => s.id === id);

  const saved: Submission = {
    id,
    date: typeof input.date === 'string' ? input.date : new Date().toISOString().split('T')[0],
    client: typeof input.client === 'string' ? input.client : '当前访客',
    desc: typeof input.desc === 'string' ? input.desc : '未命名需求',
    image: input.image,
    state: input.state,
  };

  if (existingIdx >= 0) {
    db.submissions[existingIdx] = saved;
  } else {
    db.submissions.unshift(saved);
  }

  await writeDb(db);
  broadcast('submissions_updated', { id: saved.id });
  res.json(saved);
});

app.put('/api/submissions/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const input = req.body as Partial<Submission>;
  if (!id) return res.status(400).json({ error: 'missing_id' });

  const db = await readDb();
  const idx = db.submissions.findIndex((s) => s.id === id);
  if (idx < 0) return res.status(404).json({ error: 'not_found' });

  const updated: Submission = {
    ...db.submissions[idx],
    ...input,
    id,
  };
  db.submissions[idx] = updated;
  await writeDb(db);
  broadcast('submissions_updated', { id });
  res.json(updated);
});

app.delete('/api/submissions/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const db = await readDb();
  const before = db.submissions.length;
  db.submissions = db.submissions.filter((s) => s.id !== id);
  if (db.submissions.length === before) return res.status(404).json({ error: 'not_found' });
  await writeDb(db);
  broadcast('submissions_updated', { id });
  res.json({ ok: true });
});

app.get('/api/pricing', async (_req, res) => {
  const db = await readDb();
  res.json(db.pricing);
});

app.put('/api/pricing', requireAdmin, async (req, res) => {
  const input = req.body as PricingItem[];
  if (!Array.isArray(input)) return res.status(400).json({ error: 'invalid_pricing' });
  const db = await readDb();
  db.pricing = input as any;
  await writeDb(db);
  broadcast('pricing_updated', { ok: true });
  res.json({ ok: true });
});

app.get('/api/chat/messages', async (_req, res) => {
  const db = await readDb();
  res.json(db.chat.messages);
});

app.post('/api/chat/messages', async (req, res) => {
  const input = req.body as Partial<ChatMessage>;
  const sender = input.sender === 'admin' ? 'admin' : 'client';
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'empty_message' });
  if (sender === 'admin') {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const db = await readDb();
  const msg: ChatMessage = {
    id: typeof input.id === 'string' ? input.id : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sender,
    text,
    timestamp: typeof input.timestamp === 'number' ? input.timestamp : Date.now(),
  };
  db.chat.messages.push(msg);
  await writeDb(db);
  broadcast('chat_message', msg);
  res.json(msg);
});

app.post('/api/reset', requireAdmin, async (_req, res) => {
  await writeDb(defaultDb);
  broadcast('submissions_updated', { ok: true });
  broadcast('pricing_updated', { ok: true });
  broadcast('chat_message', { reset: true });
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  process.stdout.write(`API listening on http://localhost:${port}\n`);
});
