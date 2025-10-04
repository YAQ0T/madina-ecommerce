// src/pages/CheckoutSuccess.tsx
import React, { useEffect, useMemo, useState } from "react";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

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
  const [message, setMessage] = useState<string>(
    "جارٍ التحقق من حالة الطلب الخاصة بك."
  );

  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "card" | "unknown"
  >("unknown");
  const [reference, setReference] = useState<string>("");

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

        const normalizedMethod =
          method === "cod" ? "cod" : method ? "card" : "unknown";
        setPaymentMethod(normalizedMethod);
        const ref = getReference();
        setReference(ref);

        if (normalizedMethod === "cod") {
          setState("ok");
          setMessage(
            "تم استقبال طلبك بنجاح وسنتواصل معك لتأكيد التوصيل والدفع عند الاستلام."
          );
          clearCart();
          return;
        }

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

        const confirmResp = await fetch(
          `${base}/api/payments/status/${ref}/confirm`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!confirmResp.ok) {
          setState("fail");
          setMessage("تعذر تثبيت حالة الدفع على الطلب.");
          return;
        }

        const confirmJson = await confirmResp.json();
        const confirmStatus = String(confirmJson?.status || "").toLowerCase();
        if (confirmStatus !== "success" || confirmJson?.mismatch) {
          setState("fail");
          setMessage("حدث خلل أثناء تثبيت الدفع على الطلب.");
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
            } else if (confirmJson?.orderId) {
              summary = {
                id: confirmJson.orderId,
                reference: ref,
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
              id:
                metadata.orderId ||
                metadata.order_id ||
                confirmJson?.orderId ||
                undefined,
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

        if (!summary && confirmJson?.orderId) {
          summary = { reference: ref, id: confirmJson.orderId };
        }

        clearCart();
        setOrderSummary(summary);
        setState("ok");

        if (summary?.id) {
          setMessage(
            `تم تأكيد الدفع لطلبك رقم ${summary.id}. المرجع: ${
              summary.reference || ref
            }.`
          );
        } else {
          setMessage(
            `تم تأكيد الدفع لطلبك. المرجع: ${summary?.reference || ref}.`
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
  const statusHeadline = useMemo(() => {
    if (state === "checking") {
      return "جارٍ التحقق من عملية الدفع";
    }
    if (state === "ok") {
      return paymentMethod === "cod"
        ? "تم تأكيد طلب الدفع عند الاستلام"
        : "تم تأكيد الدفع بنجاح";
    }
    return "تعذر تأكيد الدفع";
  }, [paymentMethod, state]);

  const metadataEntries = useMemo(
    () =>
      [
        orderSummary?.id
          ? { label: "رقم الطلب", value: orderSummary.id }
          : null,
        orderSummary?.reference || reference
          ? {
              label: "مرجع المعاملة",
              value: orderSummary?.reference || reference,
            }
          : null,
        typeof orderSummary?.total === "number"
          ? {
              label: "الإجمالي المدفوع",
              value: `${orderSummary.total.toFixed(2)} شيقل`,
            }
          : null,
        orderSummary?.status
          ? { label: "حالة الطلب", value: orderSummary.status }
          : null,
      ].filter(Boolean) as { label: string; value: string }[],
    [orderSummary, reference]
  );

  const statusIcon = useMemo(() => {
    if (state === "checking") {
      return (
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-7 animate-spin" />
        </span>
      );
    }
    if (state === "ok") {
      return (
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="size-8" />
        </span>
      );
    }
    return (
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="size-8" />
      </span>
    );
  }, [state]);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 text-right sm:py-16">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">نتيجة الدفع</h1>
          <p className="text-muted-foreground">
            تابع حالة طلبك وتفاصيله بعد إكمال عملية الدفع.
          </p>
        </div>

        <section className="rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col-reverse items-start gap-4 sm:flex-row-reverse sm:items-center sm:justify-between sm:gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold sm:text-2xl">
                  {statusHeadline}
                </h2>
                <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                  {message}
                </p>
              </div>
              {statusIcon}
            </div>

            {metadataEntries.length > 0 && (
              <dl className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2 sm:text-base">
                {metadataEntries.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-lg border border-border/50 bg-background p-3 shadow-xs"
                  >
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="mt-1 font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {state !== "checking" && (
              <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row-reverse sm:items-center sm:justify-start sm:gap-3">
                {state === "ok" ? (
                  <>
                    {orderSummary?.id ? (
                      <Button asChild className="w-full sm:w-auto">
                        <Link to={`/my-orders/${orderSummary.id}`}>
                          عرض تفاصيل الطلب
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full sm:w-auto">
                        <Link to="/account">عرض طلباتي</Link>
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Link to="/products">متابعة التسوق</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => navigate("/cart")}
                    >
                      إعادة المحاولة
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Link to="/contact">التواصل مع الدعم</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {state === "fail" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm leading-7 text-destructive">
            <p className="font-semibold">بحاجة إلى مساعدة إضافية؟</p>
            <p>
              يرجى التواصل مع فريق الدعم على الرقم
              <span className="px-1 font-bold">0599-XXXXXX</span>
              أو عبر البريد الإلكتروني
              <a
                href="mailto:support@dekori.store"
                className="font-semibold underline decoration-destructive/60 underline-offset-4"
              >
                support@dekori.store
              </a>
              ، مع ذكر مرجع المعاملة لتسريع تقديم المساعدة.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default CheckoutSuccess;
