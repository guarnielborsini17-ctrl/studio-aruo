import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20mb' }));

async function loadHandler(relativePath: string): Promise<Handler> {
  const module = await import(pathToFileURL(path.join(root, relativePath)).href);
  return module.default as Handler;
}

function route(method: 'get' | 'post' | 'put' | 'delete', url: string, handlerPath: string) {
  app[method](url, async (req, res, next) => {
    try {
      const handler = await loadHandler(handlerPath);
      req.query = { ...req.query, ...req.params };
      await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    } catch (error) {
      next(error);
    }
  });
}

route('post', '/api/setup', 'api/setup.ts');
route('post', '/api/auth/register', 'api/auth/register.ts');
route('post', '/api/auth/login', 'api/auth/login.ts');
route('get', '/api/auth/me', 'api/auth/me.ts');
route('post', '/api/auth/logout', 'api/auth/logout.ts');
route('get', '/api/artists', 'api/artists/index.ts');
route('get', '/api/artists/:id', 'api/artists/[id].ts');
route('get', '/api/works', 'api/works/index.ts');
route('post', '/api/works', 'api/works/index.ts');
route('delete', '/api/works/:id', 'api/works/[id].ts');
route('put', '/api/profile', 'api/profile.ts');
route('get', '/api/pricing', 'api/pricing.ts');
route('put', '/api/pricing', 'api/pricing.ts');
route('get', '/api/collaborations', 'api/collaborations/index.ts');
route('post', '/api/collaborations', 'api/collaborations/index.ts');
route('put', '/api/collaborations/:id', 'api/collaborations/[id].ts');
route('post', '/api/reviews', 'api/reviews.ts');
route('post', '/api/chicken-legs', 'api/chicken-legs.ts');
route('post', '/api/balance/top-up', 'api/balance/top-up.ts');
route('post', '/api/blob/upload-token', 'api/blob/upload-token.ts');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'local-api-dev' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'local_api_error' });
});

const port = Number(process.env.LOCAL_API_PORT || 3002);
app.listen(port, () => {
  console.log(`Local Vercel API adapter listening on http://127.0.0.1:${port}`);
});
