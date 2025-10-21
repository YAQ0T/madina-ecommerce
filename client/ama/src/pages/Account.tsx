// src/pages/Account.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  target: "all" | "user";
  createdAt: string;
  isRead?: boolean;
};

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }

    if (user && token) {
      setNotificationsLoading(true);
      setNotificationsError(null);
      let cancelled = false;

      axios
        .get(`${import.meta.env.VITE_API_URL}/api/notifications/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          if (cancelled) return;
          const list = Array.isArray(res.data) ? res.data : [];
          setNotifications(list);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error("فشل في جلب الإشعارات", err);
          setNotificationsError("تعذّر جلب الإشعارات حاليًا");
        })
        .finally(() => {
          if (cancelled) return;
          setNotificationsLoading(false);
        });

      axios
        .get(`${import.meta.env.VITE_API_URL}/api/orders/user/${user._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setOrders(res.data))
        .catch((err) => console.error("فشل في جلب الطلبات", err));

      return () => {
        cancelled = true;
      };
    }
  }, [user, loading, navigate, token]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!token) return;
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error("تعذّر تحديث حالة الإشعار", err);
    }
  };

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
        <h1 className="text-3xl font-bold mb-6">حسابي</h1>

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

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">إشعاراتي</h2>
          {notificationsLoading ? (
            <p className="text-gray-500">جاري تحميل الإشعارات…</p>
          ) : notificationsError ? (
            <p className="text-destructive">{notificationsError}</p>
          ) : notifications.length === 0 ? (
            <p className="text-gray-500">لا يوجد إشعارات بعد.</p>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const createdAt = new Date(notification.createdAt).toLocaleString(
                  "ar-EG"
                );
                const isUnread = !notification.isRead;

                return (
                  <div
                    key={notification._id}
                    className={`rounded-lg border p-4 shadow-sm transition ${
                      isUnread
                        ? "bg-blue-50 dark:bg-blue-950/30"
                        : "bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{createdAt}</p>
                      </div>
                      {isUnread && (
                        <Button
                          variant="outline"
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="self-start md:self-auto"
                        >
                          تعليم كمقروء
                        </Button>
                      )}
                    </div>
                    <p className="mt-3 leading-relaxed">
                      {notification.message}
                    </p>
                    {!isUnread && (
                      <span className="mt-2 inline-block text-xs text-muted-foreground">
                        تمت قراءته
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
                  <th className="p-2 border">Subtotal</th>
                  <th className="p-2 border">الخصم</th>
                  <th className="p-2 border">الإجمالي</th>
                  <th className="p-2 border">الحالة</th>
                  <th className="p-2 border">التاريخ</th>
                  <th className="p-2 border">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const discountAmount =
                    Number(order?.discount?.amount || 0) > 0 &&
                    order?.discount?.applied
                      ? order.discount.amount
                      : 0;

                  return (
                    <tr key={order._id}>
                      <td className="p-2 border">{i + 1}</td>
                      <td className="p-2 border">
                        {order?.items?.length || 0}
                      </td>
                      <td className="p-2 border">
                        {currency(order?.subtotal ?? 0)}
                      </td>
                      <td className="p-2 border">
                        {discountAmount ? `-${currency(discountAmount)}` : "—"}
                      </td>
                      <td className="p-2 border">{currency(order.total)}</td>
                      <td className="p-2 border">
                        {statusLabel(order.status)}
                      </td>
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
                  );
                })}
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
