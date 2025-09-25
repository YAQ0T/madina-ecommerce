import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/** ✅ قاعدة API موحّدة (تعمل مع VITE_API_BASE أو VITE_API_URL) */
const RAW_BASE = (
  import.meta.env.VITE_API_BASE?.toString() ||
  import.meta.env.VITE_API_URL?.toString() ||
  "http://localhost:3001"
).replace(/\/+$/, "");
const API_BASE = `${RAW_BASE}/api`;

function normalizePhone(p: string) {
  if (!p) return "";
  let s = p.trim().replace(/\s+/g, "");
  // إزالة أصفار البداية
  s = s.replace(/^0+/, "");
  // إضافة +970 إذا لم يبدأ بـ +
  if (!s.startsWith("+")) s = "+970" + s;
  return s;
}

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // بريد أو جوال
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    const trimmedName = name.trim();
    const id = identifier.trim();

    if (!trimmedName) return setError("الاسم مطلوب.");
    if (!id) return setError("الرجاء إدخال البريد أو رقم الجوال.");
    if (password.length < 6)
      return setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    if (password !== confirm) return setError("تأكيد كلمة المرور غير مطابق.");

    const isEmail = id.includes("@");
    const payload: any = {
      name: trimmedName,
      password,
    };
    if (isEmail) {
      payload.email = id.toLowerCase();
    } else {
      payload.phone = normalizePhone(id);
    }

    try {
      setLoading(true);

      // ✅ التصحيح هنا: نستخدم /auth/signup بدل /auth/register
      const res = await axios.post(`${API_BASE}/auth/signup`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      const { userId, message } = res.data || {};
      // نخزّن userId لصفحة التوثيق
      if (userId) sessionStorage.setItem("pendingUserId", String(userId));

      setInfo(
        message ||
          "تم إنشاء الحساب. إن كان الجوال مضافًا فسيتم إرسال رمز تحقق (OTP)."
      );

      // توجيه لصفحة التحقق إن كان التسجيل بالجوال
      setTimeout(() => {
        if (userId) {
          navigate(`/verify?userId=${encodeURIComponent(userId)}`);
        } else {
          navigate("/verify");
        }
      }, 700);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "تعذر إنشاء الحساب.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-4 max-w-xl">
        <h1 className="text-2xl font-bold mb-2">إنشاء حساب</h1>
        <p className="text-sm text-muted-foreground mb-4">
          يمكنك التسجيل بالبريد الإلكتروني أو برقم الجوال.
        </p>

        {info && (
          <div className="p-3 mb-3 rounded bg-blue-50 text-blue-700">
            {info}
          </div>
        )}
        {error && (
          <div className="p-3 mb-3 rounded bg-red-50 text-red-700">{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">الاسم الكامل</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم كما سيظهر في حسابك"
              required
            />
          </div>

          <div>
            <label className="block mb-1">
              البريد الإلكتروني أو رقم الجوال
            </label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="example@mail.com أو 059XXXXXXX"
              required
            />
          </div>

          <div>
            <label className="block mb-1">كلمة المرور</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block mb-1">تأكيد كلمة المرور</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" className="min-w-32" disabled={loading}>
              {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => navigate("/login")}
            >
              لديك حساب؟ تسجيل الدخول
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Register;
