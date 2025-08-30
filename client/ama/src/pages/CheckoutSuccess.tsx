// src/pages/CheckoutSuccess.tsx
import React, { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

const CheckoutSuccess: React.FC = () => {
  const { cart, clearCart } = useCart();
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState<"checking" | "ok" | "fail">("checking");
  const [message, setMessage] = useState<string>("جاري التحقق من الدفع...");

  // استخراج reference من الـ query string
  function getReference() {
    const params = new URLSearchParams(location.search);
    return params.get("reference") || params.get("ref") || "";
  }

  useEffect(() => {
    const run = async () => {
      try {
        const ref = getReference();
        if (!ref) {
          setState("fail");
          setMessage("لا يوجد مرجع معاملة في الرابط.");
          return;
        }

        // 1) تحقق من السيرفر
        const base = import.meta.env.VITE_API_URL || "";
        const verifyResp = await fetch(`${base}/api/payments/status/${ref}`);
        const verifyJson = await verifyResp.json();
        const status = verifyJson?.data?.status;

        if (status !== "success") {
          setState("fail");
          setMessage("فشل تأكيد الدفع من السيرفر.");
          return;
        }

        // 2) أنشئ الطلب في السيرفر (لو بدك تعمل Create بعد الدفع)
        if (!user) {
          setState("ok");
          setMessage("تم الدفع بنجاح. الرجاء تسجيل الدخول للاطلاع على طلبك.");
          clearCart();
          return;
        }

        // يمكنك حفظ عناصر السلة في localStorage قبل التحويل، أو الاعتماد على سياق السلة إن كان لا يُمسح أثناء التحويل.
        const totalLocal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

        const orderData = {
          address: (user as any)?.address || "—",
          total: totalLocal,
          items: cart.map((item) => ({
            productId: item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            color: (item as any).selectedColor || null,
            measure: (item as any).selectedMeasure || null,
            sku: (item as any).sku || undefined,
            image: (item as any).image || item.image || undefined,
          })),
          payment: {
            provider: "lahza",
            reference: ref,
            status: "success",
          },
        };

        const orderResp = await axios.post(`${base}/api/orders`, orderData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (orderResp.status === 201) {
          setState("ok");
          setMessage("✅ تم الدفع وإنشاء الطلب بنجاح!");
          clearCart();
        } else {
          setState("ok");
          setMessage("تم الدفع، لكن تعذر إنشاء الطلب تلقائيًا. راجع حسابك.");
        }
      } catch (e: any) {
        console.error(e);
        setState("fail");
        setMessage("حدث خطأ أثناء معالجة نتيجة الدفع.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="container mx-auto p-6 text-right">
      <h1 className="text-2xl font-bold mb-4">نتيجة الدفع</h1>
      <p className="mb-6">{message}</p>

      {state !== "checking" && (
        <div className="flex gap-3">
          <button
            className="border px-4 py-2 rounded"
            onClick={() => navigate("/")}
          >
            الرئيسية
          </button>
          <Link to="/cart" className="border px-4 py-2 rounded">
            السلة
          </Link>
          <Link to="/account" className="border px-4 py-2 rounded">
            طلباتي
          </Link>
        </div>
      )}
    </main>
  );
};

export default CheckoutSuccess;
