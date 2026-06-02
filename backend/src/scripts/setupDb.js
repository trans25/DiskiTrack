import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '..', 'db');

const readSql = (file) => fs.readFileSync(path.join(dbDir, file), 'utf8');

// Apply one SQL blob; log the full error but never throw. All schema and
// migration statements are idempotent, so a non-fatal error here must not be
// allowed to block application startup (the Start Command is
// `npm run setup-db && npm start`).
const applySql = async (label, sql) => {
  try {
    console.log(`[setup] Applying ${label} ...`);
    await pool.query(sql);
    console.log(`[setup] ${label} OK.`);
  } catch (err) {
    console.error(`[setup] ${label} FAILED: ${err.message}`);
    console.error(err.stack || err);
  }
};

const run = async () => {
  try {
    await applySql('schema.sql', readSql('schema.sql'));

    const migrationsDir = path.join(dbDir, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        await applySql(
          `migration ${file}`,
          fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        );
      }
    }

    if (process.env.SKIP_SEED === 'true') {
      console.log('[setup] SKIP_SEED=true — skipping demo seed.');
    } else {
      try {
        const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
        if (rows[0].c > 0) {
          console.log(`[setup] Users already present (${rows[0].c}) — skipping seed.`);
        } else {
          await applySql('seed.sql', readSql('seed.sql'));
        }
      } catch (err) {
        console.error(`[setup] Seed check failed: ${err.message}`);
      }
    }

    console.log('[setup] Database ready.');
  } catch (err) {
    // Last-resort guard: still allow the app to start so we can read logs.
    console.error('[setup] Unexpected error:', err.message);
    console.error(err.stack || err);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

run();
