import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { api } from '../api/client.js';
import { getSocket } from '../api/socket.js';
import { useAuth } from './AuthContext.jsx';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    return api
      .get('/notifications')
      .then((res) => {
        setItems(res.data.items || []);
        setUnread(res.data.unread || 0);
      })
      .catch(() => {
        setItems([]);
        setUnread(0);
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnread(0);
      return undefined;
    }
    load();

    const socket = getSocket();
    const onNew = (n) => {
      setItems((prev) => [
        {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          isRead: n.is_read,
          createdAt: n.created_at,
        },
        ...prev,
      ]);
      setUnread((c) => c + 1);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [isAuthenticated, load]);

  const markRead = useCallback((id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnread((c) => Math.max(0, c - 1));
    api.patch(`/notifications/${id}/read`).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    api.patch('/notifications/read-all').catch(() => {});
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    api.delete(`/notifications/${id}`).catch(() => {});
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ items, unread, load, markRead, markAllRead, remove }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
};
