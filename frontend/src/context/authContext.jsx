import { createContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { registerSessionExpiredHandler } from "../api/axios";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Keeps the latest user available to callbacks
  const userRef = useRef(null);

  const login = (userData) => {
    userRef.current = userData;
    setUser(userData);
  };

  const logout = () => {
    userRef.current = null;
    setUser(null);
  };

  // Get currently authenticated user
  async function getAuthUser() {
    try {
      const res = await api.get("/users/me", {
        skipAuthRefresh: true,
      });

      if (res.status === 200) {
        login(res.data.user);
      }
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Register what should happen if refresh fails
    registerSessionExpiredHandler(() => {
      // Someone was already authenticated
      if (userRef.current !== null) {
        console.log("Session expired. Logging out.");

        logout();

        navigate("/login", {
          replace: true,
        });
      } else {
        // Nobody is currently known to be logged in
        console.log("No authenticated session. Staying on current page.");
      }
    });

    // Check session when application starts
    getAuthUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
