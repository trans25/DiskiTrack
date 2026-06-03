import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { connectSocket, disconnectSocket } from '../api/socket.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on first load.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        connectSocket();
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  };

  // Guardian quick sign-in: the parent enters their child's ID number and we
  // validate it against the club database before issuing a guardian session.
  const guardianLogin = async (idNumber) => {
    const { data } = await api.post('/auth/guardian-login', { idNumber });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  };

  // Shared by registration and reset/invite flows: persist tokens + set user.
  const applySession = (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  };

  // Registration now creates a PENDING club that must be approved by a system
  // admin, so no session is established here — we just return the API response.
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const forgotPassword = (email) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data);

  const resetPassword = async (token, password, purpose = 'RESET') => {
    const { data } = await api.post('/auth/reset-password', {
      token,
      password,
      purpose,
    });
    return applySession(data);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tenantId');
    disconnectSocket();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      guardianLogin,
      register,
      forgotPassword,
      resetPassword,
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
