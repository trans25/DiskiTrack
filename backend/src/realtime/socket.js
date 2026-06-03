import { Server } from 'socket.io';
import { config } from '../config/index.js';
import { verifyAccessToken } from '../utils/tokens.js';

/** @type {Server | null} */
let io = null;

/** Room name for a given match. */
export const matchRoom = (matchId) => `match:${matchId}`;

/** Room name for a club tenant (used for club-wide pushes like notices). */
export const tenantRoom = (tenantId) => `tenant:${tenantId}`;

/** Room name for a single user (used for personal pushes like notifications). */
export const userRoom = (userId) => `user:${userId}`;

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
    // Auto-join the caller's club room so they receive club-wide pushes
    // (e.g. announcements) without an explicit subscribe step.
    const { tenantId, id } = socket.data.user || {};
    if (tenantId) socket.join(tenantRoom(tenantId));
    // Personal room for user-targeted pushes (in-app notifications).
    if (id) socket.join(userRoom(id));

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

/**
 * Emit an event to everyone connected for a given club (tenant).
 * @param {string} tenantId
 * @param {string} event
 * @param {unknown} payload
 */
export const emitToTenant = (tenantId, event, payload) => {
  if (!io || !tenantId) return;
  io.to(tenantRoom(tenantId)).emit(event, payload);
};

/**
 * Emit an event to a single user across all of their connected devices.
 * @param {string} userId
 * @param {string} event
 * @param {unknown} payload
 */
export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
};

export const getIo = () => io;
