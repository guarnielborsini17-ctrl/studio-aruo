import type { VercelRequest, VercelResponse } from '@vercel/node';
import artistById from './_handlers/artists/[id]';
import artists from './_handlers/artists/index';
import login from './_handlers/auth/login';
import logout from './_handlers/auth/logout';
import me from './_handlers/auth/me';
import register from './_handlers/auth/register';
import topUp from './_handlers/balance/top-up';
import uploadToken from './_handlers/blob/upload-token';
import chickenLegs from './_handlers/chicken-legs';
import collaborationById from './_handlers/collaborations/[id]';
import collaborations from './_handlers/collaborations/index';
import pricing from './_handlers/pricing';
import profile from './_handlers/profile';
import publicPortfolio from './_handlers/public-portfolio';
import registrationStatus from './_handlers/registration-status';
import reviews from './_handlers/reviews';
import setup from './_handlers/setup';
import shareLink from './_handlers/share-link';
import workById from './_handlers/works/[id]';
import works from './_handlers/works/index';
import { sendJson } from './_lib/http';
import { matchApiRoute } from './_lib/routeMatcher';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const routes: Array<{ method: string; path: string; handler: Handler }> = [
  { method: 'POST', path: 'setup', handler: setup },
  { method: 'GET', path: 'registration-status', handler: registrationStatus },
  { method: 'GET', path: 'share-link', handler: shareLink },
  { method: 'POST', path: 'share-link', handler: shareLink },
  { method: 'DELETE', path: 'share-link', handler: shareLink },
  { method: 'GET', path: 'public-portfolio', handler: publicPortfolio },
  { method: 'POST', path: 'auth/register', handler: register },
  { method: 'POST', path: 'auth/login', handler: login },
  { method: 'GET', path: 'auth/me', handler: me },
  { method: 'POST', path: 'auth/logout', handler: logout },
  { method: 'GET', path: 'artists', handler: artists },
  { method: 'GET', path: 'artists/:id', handler: artistById },
  { method: 'GET', path: 'works', handler: works },
  { method: 'POST', path: 'works', handler: works },
  { method: 'DELETE', path: 'works/:id', handler: workById },
  { method: 'PUT', path: 'profile', handler: profile },
  { method: 'GET', path: 'pricing', handler: pricing },
  { method: 'PUT', path: 'pricing', handler: pricing },
  { method: 'GET', path: 'collaborations', handler: collaborations },
  { method: 'POST', path: 'collaborations', handler: collaborations },
  { method: 'PUT', path: 'collaborations/:id', handler: collaborationById },
  { method: 'POST', path: 'reviews', handler: reviews },
  { method: 'POST', path: 'chicken-legs', handler: chickenLegs },
  { method: 'POST', path: 'balance/top-up', handler: topUp },
  { method: 'POST', path: 'blob/upload-token', handler: uploadToken },
];

function requestPath(req: VercelRequest) {
  const path = req.query.path;
  if (Array.isArray(path)) return path.join('/');
  if (typeof path === 'string') return path;

  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  return pathname.replace(/^\/api\/?/, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || '';
  const matched = matchApiRoute(routes, method, requestPath(req));

  if (!matched) {
    sendJson(res, 404, { error: 'api_route_not_found' });
    return;
  }

  req.query = { ...req.query, ...matched.params };
  await routes[matched.index].handler(req, res);
}
