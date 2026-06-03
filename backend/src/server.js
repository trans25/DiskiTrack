import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { initSocket } from './realtime/socket.js';
import { pool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';

const app = createApp();
const server = http.createServer(app);

// Attach Socket.io to the same HTTP server.
initSocket(server);

// Ensure the database schema (including the club-approval columns) is applied
// before we start serving requests. This runs against the app's own pool, so it
// is immune to issues with the separate setup-db step on the host. All
// statements are idempotent, so this is cheap and safe on every boot.
const start = async () => {
  try {
    await runMigrations();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[startup] Migration step failed:', err.message);
  }

  // Warn loudly when uploaded videos live on an ephemeral filesystem in
  // production: they will be lost on the next restart/redeploy. Set UPLOAD_DIR
  // to a mounted persistent disk to make them durable.
  if (config.env === 'production' && !config.uploadDir) {
    // eslint-disable-next-line no-console
    console.warn(
      '[startup] WARNING: UPLOAD_DIR is not set. Uploaded match videos are stored on an ephemeral filesystem and will NOT survive restarts/redeploys. Mount a persistent disk and set UPLOAD_DIR for durable storage.'
    );
  }

  server.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`DiskiTrack API listening on http://localhost:${config.port}`);
  });
};

start();

const shutdown = async (signal) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
