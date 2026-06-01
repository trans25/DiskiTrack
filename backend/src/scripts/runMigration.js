import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const file = process.argv[2];
if (!file) {
  console.error('Usage: node src/scripts/runMigration.js <migrationFile.sql>');
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, '..', 'db', 'migrations', file);

const run = async () => {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log(`[migrate] Applied ${file}`);
  await pool.end();
};

run().catch((err) => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
