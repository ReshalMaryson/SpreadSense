import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { registerSessionExpiredHandler } from "../api/axios";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);

  // get auth user
  async function getAuthUser() {
    try {
      const res = await api.get(`/users/me`);
      if (res.status == 200) {
        login(res.data.user);
      }
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      logout();
      navigate("/login", { replace: true });
    });

    getAuthUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
