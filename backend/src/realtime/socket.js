import { Server } from 'socket.io';
import { config } from '../config/index.js';
import { verifyAccessToken } from '../utils/tokens.js';

/** @type {Server | null} */
let io = null;

/** Room name for a given match. */
export const matchRoom = (matchId) => `match:${matchId}`;

/**
 * Initialize Socket.io on the given HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: config.clientOrigin, credentials: true },
  });

  // Authenticate sockets with the same JWT used for REST.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.user = {
        id: payload.sub,
        tenantId: payload.tenantId ?? null,
        role: payload.role,
      };
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Clients join/leave specific match rooms to receive live updates.
    socket.on('match:join', (matchId) => {
      if (matchId) socket.join(matchRoom(matchId));
    });

    socket.on('match:leave', (matchId) => {
      if (matchId) socket.leave(matchRoom(matchId));
    });
  });

  return io;
};

/**
 * Emit an event to everyone in a match room.
 * @param {string} matchId
 * @param {string} event
 * @param {unknown} payload
 */
export const emitToMatch = (matchId, event, payload) => {
  if (!io) return;
  io.to(matchRoom(matchId)).emit(event, payload);
};

export const getIo = () => io;
