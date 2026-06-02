import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = __dirname;

const readSql = (file) => fs.readFileSync(path.join(dbDir, file), 'utf8');

// Apply one SQL blob; log the full error but never throw. Every schema and
// migration statement is idempotent, so a non-fatal error here must not block
// application startup.
const applySql = async (label, sql) => {
  try {
    await pool.query(sql);
    console.log(`[migrate] ${label} OK.`);
  } catch (err) {
    console.error(`[migrate] ${label} FAILED: ${err.message}`);
  }
};

// Applies schema.sql then every migration in src/db/migrations in order.
// Safe to call on every boot because all statements are idempotent. Does NOT
// close the pool or exit the process — it is meant to run inline before the
// HTTP server starts listening.
export const runMigrations = async () => {
  console.log('[migrate] Ensuring database schema is up to date ...');
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

  console.log('[migrate] Database schema is ready.');
};
