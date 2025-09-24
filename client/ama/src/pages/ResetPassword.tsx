import React, { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_URL?.toString().replace(/\/+$/, "") ||
  "http://localhost:3001/api";

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const userIdFromQuery = useMemo(() => params.get("userId") || "", [params]);

  const [userId, setUserId] = useState(userIdFromQuery);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOkMsg("");

    if (!userId) return setError("معرّف المستخدم غير موجود");
    if (!code) return setError("الرجاء إدخال كود الاستعادة");
    if (password.length < 6)
      return setError("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف");
    if (password !== password2) return setError("تأكيد كلمة المرور غير مطابق");

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/auth/password/reset`, {
        userId,
        code,
        newPassword: password,
      });

      setOkMsg("تم تحديث كلمة المرور بنجاح! سيتم تحويلك لتسجيل الدخول.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "فشل تحديث كلمة المرور";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold mb-6 text-center">
          تعيين كلمة مرور جديدة
        </h1>

        {error && (
          <div className="mb-4 rounded-xl border p-3 text-red-600 bg-red-50">
            {error}
          </div>
        )}

        {okMsg && (
          <div className="mb-4 rounded-xl border p-3 text-green-700 bg-green-50">
            {okMsg}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          {!userIdFromQuery && (
            <div>
              <label className="block mb-1">معرّف المستخدم (User ID)</label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="أدخل معرف المستخدم الذي وصلك"
                required
              />
            </div>
          )}

          <div>
            <label className="block mb-1">كود الاستعادة</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              required
            />
          </div>

          <div>
            <label className="block mb-1">كلمة المرور الجديدة</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block mb-1">تأكيد كلمة المرور الجديدة</label>
            <Input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="text-left">
            <Button type="submit" disabled={loading}>
              {loading ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default ResetPassword;
