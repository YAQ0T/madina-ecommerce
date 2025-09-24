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

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(""); // بريد أو جوال
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOkMsg("");

    if (!identifier.trim()) return setError("أدخل البريد أو رقم الجوال");

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/password/request-reset`,
        {
          // نرسل كلاهما، والسيرفر يتعامل مع الموجود منهما
          email: identifier.includes("@")
            ? identifier.trim().toLowerCase()
            : undefined,
          phone: !identifier.includes("@") ? identifier.trim() : undefined,
        }
      );

      const userId = res?.data?.userId;
      setOkMsg("إن وُجد حساب سيتم إرسال كود إلى جوالك.");

      // التوجيه مع userId إن توفر
      setTimeout(() => {
        if (userId)
          navigate(`/reset-password?userId=${encodeURIComponent(userId)}`);
        else navigate(`/reset-password`);
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "حدث خطأ";
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
          استعادة كلمة المرور
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
          <div>
            <label className="block mb-1">
              البريد الإلكتروني أو رقم الجوال
            </label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@example.com أو 059xxxxxxx"
              required
            />
          </div>

          <div className="text-left">
            <Button type="submit" disabled={loading}>
              {loading ? "جارٍ الإرسال..." : "أرسل كود الاستعادة"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default ForgotPassword;
