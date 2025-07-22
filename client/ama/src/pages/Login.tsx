import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {} from "react";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("http://localhost:3001/api/auth/login", {
        email,
        password,
      });
      login(res.data.user, res.data.token); // ⬅️ تحديث الـ context
      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
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
            <Button type="submit">تسجيل الدخول</Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Login;
