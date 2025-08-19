import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

const statusLabel = (s: string) => {
  switch (s) {
    case "waiting_confirmation":
      return "⏱️ بانتظار التأكيد";
    case "pending":
      return "⏳ قيد الانتظار";
    case "on_the_way":
      return "🚚 في الطريق";
    case "delivered":
      return "✅ تم التوصيل";
    case "cancelled":
      return "❌ مُلغى";
    default:
      return s || "-";
  }
};

const currency = (n: number) => `₪${Number(n || 0).toFixed(2)}`;

const Account: React.FC = () => {
  const { user, logout, loading, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  // console.log("orders:", orders);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }

    if (user && token) {
      axios
        .get(`${import.meta.env.VITE_API_URL}/api/orders/user/${user._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setOrders(res.data))
        .catch((err) => console.error("فشل في جلب الطلبات", err));
    }
  }, [user, loading, navigate, token]);

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
      <main className="container mx-auto p-6 text-right">
        <h1 className="text-3س font-bold mb-6">حسابي</h1>

        <div className="text-right space-y-4 mb-6">
          <p className="text-lg">👤 الاسم: {user.name}</p>
          <p className="text-lg">📧 البريد الإلكتروني: {user.email}</p>
          <p className="text-lg">
            🛡️ الصلاحية:{" "}
            {user.role === "admin"
              ? "أدمن"
              : user.role === "dealer"
              ? "تاجر"
              : "مستخدم عادي"}
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

        <h2 className="text-2xl font-bold mb-4">طلباتي</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">لا يوجد طلبات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-right">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">عدد المنتجات</th>
                  <th className="p-2 border">الإجمالي</th>
                  <th className="p-2 border">الحالة</th>
                  <th className="p-2 border">التاريخ</th>
                  <th className="p-2 border">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr key={order._id}>
                    <td className="p-2 border">{i + 1}</td>
                    <td className="p-2 border">{order?.items?.length || 0}</td>
                    <td className="p-2 border">{currency(order.total)}</td>
                    <td className="p-2 border">{statusLabel(order.status)}</td>
                    <td className="p-2 border">
                      {new Date(order.createdAt).toLocaleString("ar-EG")}
                    </td>
                    <td className="p-2 border">
                      <Link
                        to={`/my-orders/${order._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        عرض التفاصيل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default Account;
