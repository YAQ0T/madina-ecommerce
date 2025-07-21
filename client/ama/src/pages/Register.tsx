import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Register: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // منع الوصول إذا المستخدم مسجّل بالفعل
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // نسجل المستخدم كـ role: "user"
      await axios.post("http://localhost:3001/api/auth/signup", {
        name,
        phone,
        email,
        password,
        role: "user",
      });

      // بعد النجاح، نعمل تسجيل دخول مباشر
      const res = await axios.post("http://localhost:3001/api/auth/login", {
        email,
        password,
      });

      login(res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل في إنشاء الحساب");
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
              type="text"
              id="name"
              placeholder="اسمك"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block mb-1 font-medium">
              رقم الهاتف
            </label>
            <Input
              type="text"
              id="phone"
              placeholder="0599999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="email" className="block mb-1 font-medium">
              البريد الإلكتروني
            </label>
            <Input
              type="email"
              id="email"
              placeholder="example@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1 font-medium">
              كلمة المرور
            </label>
            <Input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="text-left">
            <Button type="submit">تسجيل</Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Register;
