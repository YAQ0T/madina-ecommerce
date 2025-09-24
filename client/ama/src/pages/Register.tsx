import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_URL?.toString().replace(/\/+$/, "") ||
  "http://localhost:3001/api";

const isEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
const normalizePhone = (raw: string) => {
  let to = String(raw || "").replace(/[^\d]/g, "");
  if (!to) return "";
  if (to.startsWith("0")) to = "970" + to.slice(1);
  if (!to.startsWith("970")) to = "970" + to;
  return to;
};

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // بريد أو جوال
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOkMsg("");

    if (!name.trim()) return setError("الاسم مطلوب");
    if (password.length < 6)
      return setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
    if (password !== password2) return setError("تأكيد كلمة المرور غير مطابق");

    const payload: Record<string, string> = { name: name.trim(), password };
    let phoneToUse = "";

    if (isEmail(identifier)) {
      payload.email = identifier.trim().toLowerCase();
    } else {
      const p = normalizePhone(identifier);
      if (!p) return setError("أدخل بريدًا صحيحًا أو رقم جوال صحيح");
      payload.phone = p;
      phoneToUse = p;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/auth/signup`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      const userId = res?.data?.userId;
      const phone = res?.data?.phone || phoneToUse;

      setOkMsg(
        res?.data?.message ||
          "تم إنشاء الحساب بنجاح. سيتم تحويلك لصفحة توثيق الجوال."
      );

      // مباشرةً أرسل كود التوثيق (إن توفر userId و phone) ثم وجّه للصفحة
      if (userId && phone) {
        try {
          await axios.post(`${API_BASE}/auth/send-sms-code`, { userId, phone });
        } catch {
          // حتى لو فشل الارسال هنا، الصفحة القادمة فيها زر إعادة إرسال
        }
        navigate(
          `/verify?userId=${encodeURIComponent(
            userId
          )}&phone=${encodeURIComponent(phone)}`
        );
      } else {
        // احتياط
        setTimeout(() => navigate("/verify"), 800);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "فشل إنشاء الحساب";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold mb-6 text-center">إنشاء حساب</h1>

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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block mb-1">الاسم</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              placeholder="name@example.com أو 059xxxxxxx"
              inputMode="email"
              required
            />
          </div>

          <div>
            <label className="block mb-1">كلمة المرور</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block mb-1">تأكيد كلمة المرور</label>
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
              {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Register;
