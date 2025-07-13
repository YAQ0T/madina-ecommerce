import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Register: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("تم إنشاء الحساب (تمثيلي) 🎉");
    // هنا مستقبلاً يتم ربط API أو LocalStorage
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-right">تسجيل حساب جديد</h1>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">
              الاسم الكامل
            </label>
            <input
              type="text"
              id="name"
              placeholder="اسمك"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
            />
          </div>
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
            <Button type="submit">تسجيل</Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
};

export default Register;
