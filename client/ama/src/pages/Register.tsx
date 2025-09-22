import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Register: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // اختياري
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/signup`,
        {
          name,
          phone,
          email: email || undefined,
          password,
          role: "user",
        }
      );

      // الانتقال لصفحة التحقق
      const { userId, phone: normalized } = res.data;
      navigate(
        `/verify-phone?userId=${encodeURIComponent(
          userId
        )}&phone=${encodeURIComponent(normalized)}`
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل في إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-right">تسجيل حساب جديد</h1>
        {error && <p className="text-red-500 text-right">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">
              الاسم الكامل
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block mb-1 font-medium">
              رقم الهاتف (مطلوب)
            </label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="059XXXXXXX"
            />
          </div>

          <div>
            <label htmlFor="email" className="block mb-1 font-medium">
              البريد الإلكتروني (اختياري)
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1 font-medium">
              كلمة المرور
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="text-left">
            <Button type="submit" disabled={loading}>
              {loading ? "جاري..." : "تسجيل"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Register;
