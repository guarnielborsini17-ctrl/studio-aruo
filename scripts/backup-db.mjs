import 'dotenv/config';
import { copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const keep = Number(process.env.ARUO_BACKUP_KEEP || 30);
const dbPath = process.env.ARUO_DB_PATH
  ? path.resolve(process.env.ARUO_DB_PATH)
  : path.resolve(process.cwd(), 'data', 'db.json');
const backupDir = process.env.ARUO_BACKUP_DIR
  ? path.resolve(process.env.ARUO_BACKUP_DIR)
  : path.resolve(process.cwd(), 'backups');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

await stat(dbPath);
await mkdir(backupDir, { recursive: true });

const backupPath = path.join(backupDir, `db-${timestamp()}.json`);
await copyFile(dbPath, backupPath);

const entries = await readdir(backupDir, { withFileTypes: true });
const backups = await Promise.all(
  entries
    .filter((entry) => entry.isFile() && /^db-.+\.json$/.test(entry.name))
    .map(async (entry) => {
      const fullPath = path.join(backupDir, entry.name);
      const info = await stat(fullPath);
      return { fullPath, mtimeMs: info.mtimeMs };
    })
);

backups
  .sort((a, b) => b.mtimeMs - a.mtimeMs)
  .slice(Math.max(keep, 0))
  .forEach(({ fullPath }) => {
    unlink(fullPath).catch(() => {});
  });

console.log(`Backup created: ${backupPath}`);
