import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(""); // هاتف أو بريد
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const body = /^\d+$/.test(identifier.replace(/[^\d]/g, "")) // إذا أرقام فقط نتعامل معه كجوّال
        ? { phone: identifier, password }
        : { email: identifier, password };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        body
      );
      login(res.data.user, res.data.token);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تسجيل الدخول");
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-right">تسجيل الدخول</h1>
        {error && <p className="text-red-500 text-right">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block mb-1 font-medium">
              رقم الهاتف أو البريد
            </label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="059XXXXXXX أو email@example.com"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">كلمة المرور</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="text-left">
            <Button type="submit">دخول</Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Login;
