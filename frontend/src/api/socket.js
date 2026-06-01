import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket = null;

/** Lazily create (or return) the authenticated socket connection. */
export const getSocket = () => {
  if (!socket) {
    socket = io(URL, {
      autoConnect: false,
      auth: { token: localStorage.getItem('accessToken') },
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  s.auth = { token: localStorage.getItem('accessToken') };
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
