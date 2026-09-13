import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    api("/shop", { auth: false }).then((d) => setItems(d.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api("/auth/me")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username, password) => {
    const d = await api("/auth/login", { method: "POST", auth: false, body: { username, password } });
    setToken(d.token); setUser(d.user); return d.user;
  }, []);

  const register = useCallback(async (username, password) => {
    const d = await api("/auth/register", { method: "POST", auth: false, body: { username, password } });
    setToken(d.token); setUser(d.user); return d.user;
  }, []);

  const logout = useCallback(() => {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken(); setUser(null);
  }, []);

  const claimDaily = useCallback(async () => {
    const d = await api("/coins/daily", { method: "POST" });
    setUser(d.user);
    return d.awarded;
  }, []);

  const skin = useCallback((slot, fallback) => {
    const id = user?.equipped?.[slot];
    const item = items.find((i) => i.id === id);
    return item ? item.value : fallback;
  }, [user, items]);

  const skinItem = useCallback((slot, fallbackId) => {
    const id = user?.equipped?.[slot] || fallbackId;
    return items.find((i) => i.id === id) || items.find((i) => i.id === fallbackId) || null;
  }, [user, items]);

  const value = useMemo(() => ({
    user, ready, items, login, register, logout, claimDaily, setUser, skin, skinItem,
  }), [user, ready, items, login, register, logout, claimDaily, skin, skinItem]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
