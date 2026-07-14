import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../services/api';
import { tokenStorage, userStorage, clearSession } from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => userStorage.get());
  const [token, setToken] = useState(() => tokenStorage.get());

  const requestOtp = useCallback((phone) => api.requestOtp(phone), []);

  const verifyOtp = useCallback(async (phone, code, name) => {
    const data = await api.verifyOtp(phone, code, name);
    tokenStorage.set(data.token);
    userStorage.set(data.user);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: !!token, requestOtp, verifyOtp, logout }),
    [user, token, requestOtp, verifyOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth يجب استخدامه داخل AuthProvider');
  return ctx;
}
