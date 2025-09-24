// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";

/** الأدوار */
type Role = "admin" | "user" | "dealer";

/** نموذج المستخدم */
interface User {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  phoneVerified?: boolean;
}

/** واجهة السياق */
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

/** إعدادات API */
const API_BASE =
  import.meta.env.VITE_API_BASE?.toString().replace(/\/+$/, "") ||
  "http://localhost:3001/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** أدوات مساعدة */
const isEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
const normalizePhone = (raw: string) => {
  // يزيل غير الأرقام ويحوّل 059.. إلى 97059..
  let to = String(raw || "").replace(/[^\d]/g, "");
  if (!to) return "";
  if (to.startsWith("0")) to = "970" + to.slice(1);
  if (!to.startsWith("970")) to = "970" + to;
  return to;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // تحميل الحالة من التخزين
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t && u) {
      setToken(t);
      try {
        setUser(JSON.parse(u));
      } catch {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // دالة الدخول — هنا الإصلاح الأهم
  const login = async (identifier: string, password: string) => {
    // نبني الجسم كما يتوقعه السيرفر: { email,password } أو { phone,password }
    const payload: Record<string, string> = { password };
    if (isEmail(identifier)) {
      payload.email = identifier.trim().toLowerCase();
    } else {
      const phone = normalizePhone(identifier);
      if (!phone) {
        throw new Error("الرجاء إدخال رقم جوال صحيح أو بريد إلكتروني صالح");
      }
      payload.phone = phone;
    }

    const res = await axios.post(`${API_BASE}/auth/login`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const { token: t, user: u } = res.data;
    if (!t || !u) throw new Error("استجابة غير متوقعة من الخادم");

    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
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
