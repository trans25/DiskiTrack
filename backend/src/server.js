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
