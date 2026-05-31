import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Db } from './types';

const DB_PATH = process.env.ARUO_DB_PATH
  ? path.resolve(process.env.ARUO_DB_PATH)
  : path.resolve(process.cwd(), 'data', 'db.json');

export const defaultDb: Db = {
  version: 1,
  submissions: [],
  pricing: [],
  chat: { messages: [] },
};

async function ensureDir() {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
}

export async function readDb(): Promise<Db> {
  await ensureDir();
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      version: 1,
      submissions: Array.isArray(parsed.submissions) ? (parsed.submissions as any[]) : [],
      pricing: Array.isArray(parsed.pricing) ? (parsed.pricing as any[]) : [],
      chat: {
        messages: Array.isArray(parsed.chat?.messages) ? (parsed.chat?.messages as any[]) : [],
      },
    };
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      await writeDb(defaultDb);
      return defaultDb;
    }
    await writeDb(defaultDb);
    return defaultDb;
  }
}

export async function writeDb(db: Db): Promise<void> {
  await ensureDir();
  const json = JSON.stringify(db, null, 2);
  await fs.writeFile(DB_PATH, json, 'utf-8');
}

export function getDbPath() {
  return DB_PATH;
}
