import { useState, useEffect } from 'react';
import { api, setUnauthorizedHandler } from '../services/api';
import { queryClient } from '../lib/queryClient';
import { stateLabelFor } from '../lib/roles';
import { AuthContext } from './authContextDef';

const TOKEN_KEY = 'caregiver_access_token';

function persistSelectedState(user) {
  if (!user) return;
  if (user.role === 'super_admin') {
    localStorage.setItem('selected_state', 'ALL');
    return;
  }
  const label = stateLabelFor(user);
  if (label && label !== 'All States' && label !== 'Unassigned') {
    localStorage.setItem('selected_state', String(label).toUpperCase());
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.clear();
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('refresh');
      setUser(null);
      setToken(null);
    });

    const handleTokenRefreshed = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
      }
    };
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);

    return () => {
      setUnauthorizedHandler(null);
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
    };
  }, []);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api.get('/auth/me/', storedToken).catch(() => api.get('/auth/me', storedToken));
        const restored = {
          ...profile,
          role: profile.role || profile.roles?.name || 'public',
        };
        setUser(restored);
        persistSelectedState(restored);
        setToken(storedToken);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(email, password) {
    queryClient.clear();
    let data;
    try {
      data = await api.post('/auth/token/', { email, password });
    } catch {
      data = await api.post('/auth/login', { email, password });
    }
    const accessToken = data.access || data.access_token;
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (data.refresh) localStorage.setItem('refresh', data.refresh);
    setToken(accessToken);

    try {
      const profile = await api.get('/auth/me/', accessToken).catch(() => api.get('/auth/me', accessToken));
      const fullUser = {
        ...profile,
        role: profile.role || profile.roles?.name || data.role,
      };
      setUser(fullUser);
      persistSelectedState(fullUser);
      return fullUser;
    } catch {
      const basicUser = {
        id: data.user_id,
        role: data.role,
        state_id: data.state_id,
      };
      setUser(basicUser);
      persistSelectedState(basicUser);
      return basicUser;
    }
  }

  async function register(email, password, role = 'caregiver', state_id = null, profile = {}) {
    return await api.post('/auth/register', {
      email,
      password,
      role,
      state_id,
      ...profile,
    });
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refresh');
    try {
      if (token && refreshToken) {
        await api.post('/auth/logout/', { refresh: refreshToken }, token);
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      queryClient.clear();
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('refresh');
      setUser(null);
      setToken(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
