import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

/**
 * One-shot database setup for deployment (e.g. Render).
 *
 * Applies the canonical schema and, unless SKIP_SEED=true, the demo seed data.
 * The canonical schema.sql already contains every column/table that the
 * incremental migrations introduced, so a fresh database only needs schema.sql.
 *
 * Safe to run more than once: schema.sql uses IF NOT EXISTS / guarded enum
 * creation, and the seed is skipped automatically if data already exists.
 *
 * Usage:  node src/scripts/setupDb.js
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '..', 'db');

const readSql = (file) => fs.readFileSync(path.join(dbDir, file), 'utf8');

const run = async () => {
  try {
    console.log('[setup] Applying schema.sql ...');
    await pool.query(readSql('schema.sql'));
    console.log('[setup] Schema applied.');

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
