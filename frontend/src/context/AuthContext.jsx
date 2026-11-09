import { createContext, useCallback, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // After the user edits their profile, keep the saved copy in step
  const updateUser = useCallback((next) => {
    localStorage.setItem("user", JSON.stringify(next));
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, updateUser }),
    [user, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Where each role lands after signing in
// eslint-disable-next-line react-refresh/only-export-components
export const HOME_BY_ROLE = {
  ADMIN: "/admin",
  FACULTY: "/faculty",
  STUDENT: "/student",
};
