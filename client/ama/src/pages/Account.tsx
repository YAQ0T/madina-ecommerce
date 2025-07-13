import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Account: React.FC = () => {
  // مؤقتًا، نحكي إنه المستخدم مش مسجّل
  const isLoggedIn = false;

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-right">حسابي</h1>

        {isLoggedIn ? (
          <div className="text-right space-y-4">
            <p className="text-lg">الاسم: أحمد سالوس</p>
            <p className="text-lg">البريد الإلكتروني: ahmad@example.com</p>
            <Button variant="destructive">تسجيل الخروج</Button>
          </div>
        ) : (
          <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 rounded p-4 text-right">
            لم تقم بتسجيل الدخول بعد. الرجاء تسجيل الدخول للوصول إلى معلومات
            حسابك.
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default Account;
