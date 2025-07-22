import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const Account: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">جارٍ التحقق من الحساب...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-right">حسابي</h1>

        <div className="text-right space-y-4">
          <p className="text-lg">👤 الاسم: {user.name}</p>
          <p className="text-lg">📧 البريد الإلكتروني: {user.email}</p>
          <p className="text-lg">
            🛡️ الصلاحية: {user.role === "admin" ? "أدمن" : "مستخدم عادي"}
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            تسجيل الخروج
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Account;
