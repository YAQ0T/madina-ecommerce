// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

type Role = "admin" | "user" | "dealer"; // ✅ أضفنا dealer

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role; // ✅ صار النوع يشمل dealer
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]));
        const exp = payload.exp * 1000;
        if (Date.now() >= exp) {
          logout();
        } else {
          // ✅ تأكد أن `role` المخزّن يطابق النوع Role (admin|user|dealer)
          const parsed: User = JSON.parse(storedUser);
          setUser(parsed);
          setToken(storedToken);
        }
      } catch {
        logout();
      }
    }

    setLoading(false);
  }, []);

  const login = (userData: User, jwtToken: string) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", jwtToken);
    setUser(userData);
    setToken(jwtToken);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
