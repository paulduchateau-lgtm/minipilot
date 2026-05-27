import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const API = "/api/auth";

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not auth'd

  useEffect(() => {
    fetchJson(`${API}/me`)
      .then(d => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await fetchJson(`${API}/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const data = await fetchJson(`${API}/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetchJson(`${API}/logout`, { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
