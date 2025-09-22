import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function VerifyPhone() {
  const q = useQuery();
  const nav = useNavigate();
  const userId = q.get("userId") || "";
  const phone = q.get("phone") || "";
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!userId) nav("/register");
  }, [userId]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-sms`, {
        userId,
        code,
      });
      setMsg("تم التحقق! يمكنك الآن تسجيل الدخول.");
      setTimeout(() => nav("/login"), 1200);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "فشل التحقق");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/resend-sms`,
        { userId }
      );
      setMsg(r.data?.message || "تم الإرسال");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "تعذر إعادة الإرسال");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-right">تأكيد رقم الجوال</h1>
        <p className="text-sm text-gray-600 mb-4 text-right">
          أرسلنا رمزًا إلى: <b>{phone}</b>
        </p>

        <form onSubmit={verify} className="space-y-3 text-right">
          <Input
            placeholder="أدخل الرمز من 6 أرقام"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            className="tracking-widest text-center"
          />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          {msg && <div className="text-green-700 text-sm">{msg}</div>}
          <div className="text-left">
            <Button type="submit" disabled={loading}>
              {loading ? "جارٍ التحقق..." : "تحقق"}
            </Button>
          </div>
        </form>

        <button
          onClick={resend}
          disabled={resending}
          className="mt-4 text-sm underline"
        >
          {resending ? "جارٍ الإرسال..." : "إعادة إرسال الرمز"}
        </button>
      </main>
      <Footer />
    </>
  );
}
