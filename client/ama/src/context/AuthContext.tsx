import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

/** ✅ قاعدة الـ API (نضمن إضافة /api مرة واحدة) */
const RAW_BASE = (
  import.meta.env.VITE_API_BASE?.toString() ||
  import.meta.env.VITE_API_URL?.toString() ||
  "http://localhost:3001"
).replace(/\/+$/, "");
const API_BASE = `${RAW_BASE}/api`;

type TUser = {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  phoneVerified?: boolean;
};

type LoginPayload = { phone?: string; email?: string; password: string };

type AuthContextType = {
  user: TUser | null;
  token: string | null;
  loading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  logout: () => void;
  setSession: (token: string, user: TUser) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // تحميل الجلسة من التخزين
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t && u) {
      setToken(t);
      try {
        const parsed: TUser = JSON.parse(u);
        setUser(parsed);
      } catch {
        localStorage.removeItem("user");
      }
      axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
    setLoading(false);
  }, []);

  const setSession = useCallback((t: string, u: TUser) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  const login = useCallback(
    async (data: LoginPayload) => {
      try {
        const res = await axios.post(
          `${API_BASE}/auth/login`,
          {
            phone: data.phone?.trim() || undefined,
            email: data.email?.trim().toLowerCase() || undefined,
            password: data.password,
          },
          { headers: { "Content-Type": "application/json" } }
        );

        const { token: t, user: u } = res.data || {};
        if (t && u) {
          setSession(t, u);
          return;
        }
        // استجابة غير متوقعة
        throw { code: "LOGIN_ERROR", message: "استجابة غير متوقعة من الخادم" };
      } catch (err: any) {
        const status = err?.response?.status;
        const payload = err?.response?.data || {};
        const message =
          payload?.message ||
          payload?.error ||
          err?.message ||
          "فشل تسجيل الدخول";

        // ✅ حالة 403: الهاتف غير موثّق — نرمي كائن بسيط يمكن للصفحات التقاطه
        if (status === 403) {
          throw {
            code: "NEEDS_VERIFICATION",
            userId: payload?.userId,
            phone: payload?.phone,
            message,
          };
        }

        // أخطاء أخرى نرميها بشكل موحّد
        throw { code: "LOGIN_ERROR", message };
      }
    },
    [setSession]
  );

  const value = useMemo(
    () => ({ user, token, loading, login, logout, setSession }),
    [user, token, loading, login, logout, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
