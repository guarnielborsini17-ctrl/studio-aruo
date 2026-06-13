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

route('post', '/api/setup', 'api/_handlers/setup.ts');
route('get', '/api/registration-status', 'api/_handlers/registration-status.ts');
route('get', '/api/share-link', 'api/_handlers/share-link.ts');
route('post', '/api/share-link', 'api/_handlers/share-link.ts');
route('delete', '/api/share-link', 'api/_handlers/share-link.ts');
route('get', '/api/public-portfolio', 'api/_handlers/public-portfolio.ts');
route('post', '/api/auth/register', 'api/_handlers/auth/register.ts');
route('post', '/api/auth/login', 'api/_handlers/auth/login.ts');
route('get', '/api/auth/me', 'api/_handlers/auth/me.ts');
route('post', '/api/auth/logout', 'api/_handlers/auth/logout.ts');
route('get', '/api/artists', 'api/_handlers/artists/index.ts');
route('get', '/api/artists/:id', 'api/_handlers/artists/[id].ts');
route('get', '/api/works', 'api/_handlers/works/index.ts');
route('post', '/api/works', 'api/_handlers/works/index.ts');
route('delete', '/api/works/:id', 'api/_handlers/works/[id].ts');
route('put', '/api/profile', 'api/_handlers/profile.ts');
route('get', '/api/pricing', 'api/_handlers/pricing.ts');
route('put', '/api/pricing', 'api/_handlers/pricing.ts');
route('get', '/api/collaborations', 'api/_handlers/collaborations/index.ts');
route('post', '/api/collaborations', 'api/_handlers/collaborations/index.ts');
route('put', '/api/collaborations/:id', 'api/_handlers/collaborations/[id].ts');
route('post', '/api/reviews', 'api/_handlers/reviews.ts');
route('post', '/api/chicken-legs', 'api/_handlers/chicken-legs.ts');
route('post', '/api/balance/top-up', 'api/_handlers/balance/top-up.ts');
route('post', '/api/blob/upload-token', 'api/_handlers/blob/upload-token.ts');

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
