import 'dotenv/config';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run restore:db -- <backup-file>');
  process.exit(1);
}

const dbPath = process.env.ARUO_DB_PATH
  ? path.resolve(process.env.ARUO_DB_PATH)
  : path.resolve(process.cwd(), 'data', 'db.json');
const sourcePath = path.resolve(source);

await stat(sourcePath);
await mkdir(path.dirname(dbPath), { recursive: true });
await copyFile(sourcePath, dbPath);

console.log(`Database restored from: ${sourcePath}`);
console.log(`Database written to: ${dbPath}`);
