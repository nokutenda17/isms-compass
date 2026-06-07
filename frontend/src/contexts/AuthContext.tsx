import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { User } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SESSION_IDLE_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES || 15);
const SESSION_IDLE_TIMEOUT_MS = Math.max(1, SESSION_IDLE_TIMEOUT_MINUTES) * 60 * 1000;
const LAST_ACTIVITY_KEY = 'isms_last_activity_at';
const LOGOUT_REASON_KEY = 'isms_logout_reason';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ onboarding_required?: boolean }>;
  logout: (reason?: 'manual' | 'inactive') => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('isms_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const idleTimerRef = useRef<number | null>(null);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid email or password');
    }

    const data = await res.json();

    // Store tokens
    localStorage.setItem('isms_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('isms_refresh_token', data.refresh_token);
    }

    const userData: User = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      orgId: data.user.orgId,
      orgName: data.user.orgName,
      orgSector: data.user.orgSector,
      orgSize: data.user.orgSize,
      city: data.user.city,
      status: 'active',
      lastLogin: new Date().toISOString(),
    };

    setUser(userData);
    localStorage.setItem('isms_user', JSON.stringify(userData));
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    localStorage.removeItem(LOGOUT_REASON_KEY);

    return { onboarding_required: data.onboarding_required };
  };

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(async (reason: 'manual' | 'inactive' = 'manual') => {
    clearIdleTimer();
    const token = localStorage.getItem('isms_access_token');
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setUser(null);
    localStorage.removeItem('isms_user');
    localStorage.removeItem('isms_access_token');
    localStorage.removeItem('isms_refresh_token');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (reason === 'inactive') {
      localStorage.setItem(LOGOUT_REASON_KEY, reason);
    } else {
      localStorage.removeItem(LOGOUT_REASON_KEY);
    }
  }, [clearIdleTimer]);

  const scheduleIdleLogout = useCallback((lastActivityMs: number) => {
    clearIdleTimer();
    const elapsed = Date.now() - lastActivityMs;
    const remaining = Math.max(0, SESSION_IDLE_TIMEOUT_MS - elapsed);
    idleTimerRef.current = window.setTimeout(() => {
      void logout('inactive');
    }, remaining);
  }, [clearIdleTimer, logout]);

  useEffect(() => {
    if (!user) {
      clearIdleTimer();
      return;
    }

    const updateActivity = () => {
      const now = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      scheduleIdleLogout(now);
    };

    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (last > 0) {
      scheduleIdleLogout(last);
    } else {
      updateActivity();
    }

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const eventName of events) {
      window.addEventListener(eventName, updateActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') updateActivity();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        const parsed = Number(event.newValue);
        if (!Number.isNaN(parsed)) scheduleIdleLogout(parsed);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, updateActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      clearIdleTimer();
    };
  }, [user, clearIdleTimer, scheduleIdleLogout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
