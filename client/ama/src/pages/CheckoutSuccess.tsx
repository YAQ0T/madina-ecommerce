// src/pages/CheckoutSuccess.tsx
import React, { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
type OrderSummary = {
  id?: string;
  reference?: string;
  total?: number;
  status?: string;
};

const CheckoutSuccess: React.FC = () => {
  const { clearCart } = useCart();

  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState<"checking" | "ok" | "fail">("checking");
  const [message, setMessage] = useState<string>("جاري التحقق من الدفع...");
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  // استخراج reference من الـ query string
  function getReference() {
    const params = new URLSearchParams(location.search);
    return params.get("reference") || params.get("ref") || "";
  }
  function getPaymentMethod() {
    const params = new URLSearchParams(location.search);
    return (params.get("method") || "").toLowerCase();
  }

  useEffect(() => {
    const run = async () => {
      try {
        const method = getPaymentMethod();

        if (method === "cod") {
          setState("ok");
          setMessage(
            "✅ تم تأكيد طلب الدفع عند الاستلام. سنتواصل لتأكيد التوصيل."
          );
          clearCart();
          return;
        }

        const ref = getReference();
        if (!ref) {
          setState("fail");
          setMessage("لا يوجد مرجع معاملة للبطاقة في الرابط.");
          return;
        }

        // 1) تحقق من السيرفر
        const base = import.meta.env.VITE_API_URL || "";
        const verifyResp = await fetch(`${base}/api/payments/status/${ref}`);
        if (!verifyResp.ok) {
          setState("fail");
          setMessage("تعذر التحقق من الدفع من السيرفر.");
          return;
        }

        const verifyJson = await verifyResp.json();
        const status = String(verifyJson?.data?.status || "").toLowerCase();

        if (status !== "success") {
          setState("fail");
          setMessage("فشل تأكيد الدفع من السيرفر.");
          return;
        }
        let summary: OrderSummary | null = null;

        // محاولة جلب بيانات الطلب من الخادم بالمرجع لضمان عرض معلومات دقيقة
        if (user && token) {
          try {
            const orderResp = await fetch(
              `${base}/api/orders/by-reference/${ref}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (orderResp.ok) {
              const orderData = await orderResp.json();
              summary = {
                id: orderData?._id,
                reference: orderData?.reference || ref,
                total:
                  typeof orderData?.total === "number"
                    ? orderData.total
                    : undefined,
                status: orderData?.status,
              };
            }
          } catch (err) {
            console.error("failed to fetch order by reference", err);
          }
        }
        // fallback على معلومات metadata القادمة من لحظة إن وُجدت
        if (!summary) {
          const metadataRaw = verifyJson?.data?.metadata;
          let metadata: any = undefined;
          if (metadataRaw && typeof metadataRaw === "string") {
            try {
              metadata = JSON.parse(metadataRaw);
            } catch (err) {
              metadata = undefined;
            }
          } else if (metadataRaw && typeof metadataRaw === "object") {
            metadata = metadataRaw;
          }

          if (metadata && typeof metadata === "object") {
            const amountMinor =
              metadata.expectedAmountMinor ??
              metadata.amountMinor ??
              metadata.amount_minor;
            summary = {
              id: metadata.orderId || metadata.order_id || undefined,
              reference: ref,
              total:
                typeof amountMinor !== "undefined"
                  ? Number(amountMinor) / 100
                  : typeof metadata.total === "number"
                  ? metadata.total
                  : undefined,
              status: metadata.status,
            };
          } else {
            summary = { reference: ref };
          }
        }

        clearCart();
        setOrderSummary(summary);
        setState("ok");

        if (summary?.id) {
          setMessage(
            `✅ تم تأكيد الدفع لطلبك رقم ${summary.id}. المرجع: ${
              summary.reference || ref
            }.`
          );
        } else {
          setMessage(
            `✅ تم تأكيد الدفع لطلبك. المرجع: ${summary?.reference || ref}.`
          );
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
      {state === "ok" && orderSummary && (
        <div className="mb-6 rounded border p-4 text-sm leading-7">
          <h2 className="mb-2 text-lg font-semibold">تفاصيل الطلب المؤكد</h2>
          <ul className="space-y-1">
            {orderSummary.id && (
              <li>
                <span className="font-medium">رقم الطلب:</span>{" "}
                {orderSummary.id}
              </li>
            )}
            {orderSummary.reference && (
              <li>
                <span className="font-medium">مرجع لحظة:</span>{" "}
                {orderSummary.reference}
              </li>
            )}
            {typeof orderSummary.total === "number" && (
              <li>
                <span className="font-medium">الإجمالي المدفوع:</span>{" "}
                {orderSummary.total.toFixed(2)}
              </li>
            )}
            {orderSummary.status && (
              <li>
                <span className="font-medium">حالة الطلب:</span>{" "}
                {orderSummary.status}
              </li>
            )}
          </ul>
        </div>
      )}

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
