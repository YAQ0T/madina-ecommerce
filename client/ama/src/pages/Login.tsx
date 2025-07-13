import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Login: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("تسجيل الدخول تم (تمثيلي) 😄");
    // هنا ممكن تضيف logic حقيقي لتسجيل الدخول
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-right">تسجيل الدخول</h1>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              id="email"
              placeholder="example@example.com"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 font-medium">
              كلمة المرور
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
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
