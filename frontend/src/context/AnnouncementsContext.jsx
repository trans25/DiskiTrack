import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client.js';
import { getSocket } from '../api/socket.js';
import { useAuth } from './AuthContext.jsx';

const AnnouncementsContext = createContext(null);

const LAST_SEEN_KEY = 'announcementsLastSeen';

export const AnnouncementsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [lastSeen, setLastSeen] = useState(
    () => localStorage.getItem(LAST_SEEN_KEY) || null
  );

  const load = useCallback(() => {
    return api
      .get('/announcements')
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, []);

  // Initial load + live updates while authenticated.
  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return undefined;
    }
    load();

    const socket = getSocket();
    const onNew = (a) => setItems((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
    const onUpdate = (a) =>
      setItems((prev) => prev.map((x) => (x.id === a.id ? a : x)));
    const onDelete = ({ id }) =>
      setItems((prev) => prev.filter((x) => x.id !== id));

    socket.on('announcement:new', onNew);
    socket.on('announcement:update', onUpdate);
    socket.on('announcement:delete', onDelete);
    return () => {
      socket.off('announcement:new', onNew);
      socket.off('announcement:update', onUpdate);
      socket.off('announcement:delete', onDelete);
    };
  }, [isAuthenticated, load]);

  // Mark the board as seen (called when the user opens the Announcements page).
  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, now);
    setLastSeen(now);
  }, []);

  const unreadCount = useMemo(() => {
    if (!lastSeen) return items.length;
    const seenTime = new Date(lastSeen).getTime();
    return items.filter((a) => new Date(a.createdAt).getTime() > seenTime).length;
  }, [items, lastSeen]);

  const value = useMemo(
    () => ({ items, unreadCount, markSeen, reload: load }),
    [items, unreadCount, markSeen, load]
  );

  return (
    <AnnouncementsContext.Provider value={value}>
      {children}
    </AnnouncementsContext.Provider>
  );
};

export const useAnnouncements = () => {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx)
    throw new Error('useAnnouncements must be used within AnnouncementsProvider');
  return ctx;
};
