import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '..', 'db');

const readSql = (file) => fs.readFileSync(path.join(dbDir, file), 'utf8');

const run = async () => {
  try {
    console.log('[setup] Applying schema.sql ...');
    await pool.query(readSql('schema.sql'));
    console.log('[setup] Schema applied.');

    const migrationsDir = path.join(dbDir, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      for (const file of files) {
        console.log(`[setup] Applying migration ${file} ...`);
        await pool.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      }
      console.log('[setup] Migrations applied.');
    }

    if (process.env.SKIP_SEED === 'true') {
      console.log('[setup] SKIP_SEED=true — skipping demo seed.');
    } else {
      const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
      if (rows[0].c > 0) {
        console.log(`[setup] Users already present (${rows[0].c}) — skipping seed.`);
      } else {
        console.log('[setup] Seeding demo data ...');
        await pool.query(readSql('seed.sql'));
        console.log('[setup] Seed complete.');
      }
    }

    console.log('[setup] Database ready.');
    process.exit(0);
  } catch (err) {
    console.error('[setup] Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
