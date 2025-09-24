import React, { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE?.toString().replace(/\/+$/, "") ||
  "http://localhost:3001/api";

const VerifyPhone: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const userId = useMemo(() => params.get("userId") || "", [params]);
  const [phone, setPhone] = useState(params.get("phone") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError("");
    setOkMsg("");
  }, [userId, phone]);

  const resend = async () => {
    setError("");
    setOkMsg("");
    if (!userId || !phone) return setError("معلومات ناقصة لإرسال الرمز");
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/auth/send-sms-code`, { userId, phone });
      setOkMsg("تم إرسال الرمز إلى جوالك");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "تعذر إرسال الرمز";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOkMsg("");
    if (!userId || !code) return setError("الرجاء إدخال الرمز");
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/auth/verify-sms`, { userId, code });
      setOkMsg("تم التوثيق بنجاح! يمكنك الآن تسجيل الدخول.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "فشل التحقق من الرمز";
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
          توثيق رقم الجوال
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

        <div className="space-y-4">
          <div>
            <label className="block mb-1">رقم الجوال</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="97059xxxxxxx"
              disabled={!!params.get("phone")}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={resend} disabled={loading || !userId || !phone}>
              {loading ? "جارٍ الإرسال..." : "إرسال / إعادة إرسال الرمز"}
            </Button>
          </div>

          <form onSubmit={verify} className="space-y-3" noValidate>
            <div>
              <label className="block mb-1">الرمز المكون من 6 أرقام</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="123456"
                required
              />
            </div>
            <div className="text-left">
              <Button type="submit" disabled={loading}>
                تحقق
              </Button>
            </div>
          </form>

          <div className="pt-4 text-center">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              الانتقال إلى تسجيل الدخول
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VerifyPhone;
