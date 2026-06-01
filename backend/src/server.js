import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { initSocket } from './realtime/socket.js';
import { pool } from './db/pool.js';

const app = createApp();
const server = http.createServer(app);

// Attach Socket.io to the same HTTP server.
initSocket(server);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`DiskiTrack API listening on http://localhost:${config.port}`);
});

const shutdown = async (signal) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
