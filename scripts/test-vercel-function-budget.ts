import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { matchApiRoute } from '../api/_lib/routeMatcher';

async function collectEntrypoints(directory: string, relative = ''): Promise<string[]> {
  const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;

    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectEntrypoints(directory, next)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(next.replaceAll('\\', '/'));
    }
  }

  return files;
}

const entrypoints = await collectEntrypoints('api');

assert.deepEqual(entrypoints, ['[...path].ts']);

assert.deepEqual(
  matchApiRoute(
    [
      { method: 'GET', path: 'works' },
      { method: 'DELETE', path: 'works/:id' },
    ],
    'DELETE',
    'works/work-123'
  ),
  {
    index: 1,
    params: { id: 'work-123' },
  }
);
assert.equal(
  matchApiRoute([{ method: 'GET', path: 'works' }], 'POST', 'works'),
  null
);

console.log('Vercel function budget assertions passed');
