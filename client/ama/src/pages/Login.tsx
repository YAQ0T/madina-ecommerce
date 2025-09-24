import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE?.toString().replace(/\/+$/, "") ||
  "http://localhost:3001/api";

const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(""); // هاتف أو بريد
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifyInfo, setVerifyInfo] = useState<{
    userId?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/admin");
      else navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifyInfo({});
    try {
      await login(identifier.trim(), password);
      // التوجيه سيتم عبر useEffect
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data || {};
      const msg = data?.message || err?.message || "تعذر تسجيل الدخول";
      setError(String(msg));

      if (status === 403 && (data?.userId || data?.phone)) {
        setVerifyInfo({ userId: data.userId, phone: data.phone });
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold mb-6 text-center">تسجيل الدخول</h1>

        {error && (
          <div className="mb-4 rounded-xl border p-3 text-red-600 bg-red-50">
            {error}
          </div>
        )}

        {verifyInfo.userId && (
          <div className="mb-4 rounded-xl border p-3 bg-yellow-50 text-yellow-800">
            لم يتم توثيق رقم جوالك بعد.
            <div className="mt-2">
              <Button
                onClick={() =>
                  navigate(
                    `/verify?userId=${encodeURIComponent(
                      String(verifyInfo.userId)
                    )}${
                      verifyInfo.phone
                        ? `&phone=${encodeURIComponent(verifyInfo.phone)}`
                        : ""
                    }`
                  )
                }
              >
                توثيق الحساب الآن
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block mb-1">رقم الجوال أو البريد</label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="059xxxxxxx أو name@example.com"
              inputMode="email"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block mb-1">كلمة المرور</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <Button type="submit">دخول</Button>
            <Button variant="link" onClick={() => navigate("/forgot-password")}>
              نسيت كلمة المرور؟
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Login;
