import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession, PlatformUser, RegisterInput } from '../types/platform';
import {
  clearSessionToken,
  fetchMe,
  loginAccount,
  logoutAccount,
  getSessionToken,
  registerAccount,
  setSessionToken,
} from '../lib/platformApi';

type RegisterPayload = Omit<RegisterInput, 'username' | 'password'> & {
  username: string;
  password: string;
};

type AuthContextValue = {
  user: PlatformUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<PlatformUser>;
  register: (input: RegisterPayload) => Promise<PlatformUser>;
  logout: () => void;
  refreshUser: () => Promise<PlatformUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function syncSession(session: AuthSession) {
  setSessionToken(session.token);
  return session.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const nextUser = await fetchMe();
      setUser(nextUser);
      return nextUser;
    } catch {
      clearSessionToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getSessionToken()) {
      setLoading(false);
      return;
    }

    void refreshUser();
  }, []);

  const login = async (username: string, password: string) => {
    const nextUser = syncSession(await loginAccount({ username, password }));
    setUser(nextUser);
    return nextUser;
  };

  const register = async (input: RegisterPayload) => {
    const nextUser = syncSession(await registerAccount(input));
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    void logoutAccount();
    clearSessionToken();
    setUser(null);
    setLoading(false);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
