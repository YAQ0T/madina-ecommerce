// src/pages/Cart.tsx
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import QuantityInput from "@/components/common/QuantityInput";

type DiscountPreview = {
  items: Array<{
    productId: string;
    variantId: string;
    name: string;
    quantity: number;
    price: number;
    color?: string | null;
    measure?: string | null;
    sku?: string | null;
  }>;
  subtotal: number;
  discount: {
    applied: boolean;
    ruleId: string | null;
    type: "percent" | "fixed" | null;
    value: number;
    amount: number;
    threshold: number;
    name: string;
  };
  total: number;
};

const currency = (n: number) => `₪${Number(n || 0).toFixed(2)}`;

const Cart: React.FC = () => {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const { user, token } = useAuth();

  const [userData, setUserData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [preview, setPreview] = useState<DiscountPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ✅ تحديد ما إذا كان المستخدم تاجر
  const isAdmin = useMemo(() => {
    const u: any = user || {};
    return u?.role === "admin";
  }, [user]);

  useEffect(() => {
    if (user) {
      setUserData((prev) => ({
        ...prev,
        name: (user as any).name || "",
        phone: (user as any).phone || "",
      }));
    }
  }, [user]);

  // المجموع المحلي (fallback لو فشل استدعاء المعاينة)
  const localSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const localTotal = useMemo(() => localSubtotal, [localSubtotal]);

  // استدعاء معاينة الخصم الديناميكي من السيرفر عند تغيّر السلة
  useEffect(() => {
    const applyDiscountPreview = async () => {
      if (cart.length === 0) {
        setPreview(null);
        return;
      }
      try {
        setLoadingPreview(true);

        const payload = {
          items: cart.map((item) => ({
            productId: item._id,
            quantity: item.quantity,
            sku: (item as any).sku || undefined,
            color: (item as any).selectedColor || null,
            measure: (item as any).selectedMeasure || null,
            name: item.name,
          })),
        };

        const headers =
          token && token.length
            ? { Authorization: `Bearer ${token}` }
            : undefined;

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/discounts/apply`,
          payload,
          { headers }
        );

        setPreview(res.data as DiscountPreview);
      } catch (err) {
        console.error("فشل في معاينة الخصم:", err);
        setPreview(null); // نستخدم القيم المحلية بدلًا من ذلك
      } finally {
        setLoadingPreview(false);
      }
    };

    applyDiscountPreview();
  }, [cart, token]);

  // قيم العرض النهائية
  const summary = useMemo(() => {
    if (preview) {
      return {
        subtotal: preview.subtotal,
        discountAmount:
          preview.discount?.applied && preview.discount?.amount > 0
            ? preview.discount.amount
            : 0,
        total: preview.total,
        discountLabel:
          preview.discount?.applied && preview.discount?.amount > 0
            ? preview.discount?.type === "percent"
              ? `${preview.discount.value}%${
                  preview.discount.name ? ` - ${preview.discount.name}` : ""
                }`
              : `₪${preview.discount.value}${
                  preview.discount.name ? ` - ${preview.discount.name}` : ""
                }`
            : null,
        threshold: preview.discount?.threshold || 0,
      };
    }
    return {
      subtotal: localSubtotal,
      discountAmount: 0,
      total: localTotal,
      discountLabel: null as string | null,
      threshold: 0,
    };
  }, [preview, localSubtotal, localTotal]);

  // ✅ الطباعة عبر IFRAME مخفي (بدون نافذة منبثقة)
  const handlePrintForDealer = () => {
    if (!isAdmin) return;
    if (cart.length === 0) {
      alert("السلة فارغة، لا يوجد ما يُطبع.");
      return;
    }

    const now = new Date();
    const arabicDate = now.toLocaleString("ar-EG", {
      dateStyle: "full",
      timeStyle: "short",
      hour12: false,
    });

    const rowsHtml = cart
      .map((item) => {
        const lineTotal = item.price * item.quantity;
        return `
          <tr>
            <td>${(item as any).sku || ""}</td>
            <td>${item.name || ""}</td>
            <td>${(item as any).selectedColor || "-"}</td>
            <td>${(item as any).selectedMeasure || "-"}</td>
            <td>${currency(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${currency(lineTotal)}</td>
            <td></td>
          </tr>
        `;
      })
      .join("");

    const discountRow =
      summary.discountAmount > 0
        ? `<tr>
            <td colspan="6" class="ta-left">الخصم${
              summary.discountLabel ? ` (${summary.discountLabel})` : ""
            }</td>
            <td>${"-" + currency(summary.discountAmount)}</td>
            <td></td>
           </tr>`
        : "";

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>عرض أسعار / طلبية</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Naskh Arabic", "Noto Sans Arabic", "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
      direction: rtl; color: #111;
    }
    .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #555; padding-bottom: 8px; margin-bottom: 16px; }
    .brand { font-size: 20px; font-weight: 700; }
    .muted { color: #666; font-size: 12px; line-height: 1.6; }
    .title { font-size: 18px; font-weight: 700; margin: 8px 0 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; vertical-align: top; }
    th { background: #f3f3f3; }
    .ta-left { text-align: left; }
    .notes { border: 1px dashed #aaa; padding: 8px; margin-top: 14px; min-height: 40px; }
    .signatures { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .sign-box { border-top: 1px dashed #777; padding-top: 8px; min-height: 60px; font-size: 12px; }
    .badge { display: inline-block; border: 1px solid #999; padding: 2px 6px; border-radius: 6px; font-size: 11px; color: #333; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">فاتورة/عرض للتاجر</div>
      <div class="muted">التاريخ: ${arabicDate}</div>
      <div class="badge">نسخة للطباعة — عمود فارغ للكتابة بالقلم</div>
    </div>
    <div class="muted">
      <div><strong>العميل:</strong> ${userData.name || "-"}</div>
      <div><strong>الهاتف:</strong> ${userData.phone || "-"}</div>
      <div><strong>العنوان:</strong> ${userData.address || "-"}</div>
    </div>
  </div>

  <div class="title">تفاصيل العناصر المختارة</div>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>المنتج</th>
        <th>اللون</th>
        <th>المقاس</th>
        <th>السعر</th>
        <th>الكمية</th>
        <th>الإجمالي الفرعي</th>
        <th>.......جديد.......</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr>
        <td colspan="6" class="ta-left"><strong>المجموع الفرعي</strong></td>
        <td><strong>${currency(summary.subtotal)}</strong></td>
        <td></td>
      </tr>
      ${discountRow}
      <tr>
        <td colspan="6" class="ta-left"><strong>الإجمالي النهائي</strong></td>
        <td><strong>${currency(summary.total)}</strong></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="notes">
    <strong>ملاحظات إضافية:</strong><br/>
    <!-- اكتب بالقلم هنا بعد الطباعة -->
  </div>

  <div class="signatures">
    <div class="sign-box"><strong>توقيع العميل:</strong></div>
    <div class="sign-box"><strong>توقيع المندوب:</strong></div>
  </div>

  <script>
    // تأخير بسيط لضمان اكتمال الرسم قبل الطباعة
    window.onload = function() {
      setTimeout(function(){ window.print(); }, 150);
    };
  </script>
</body>
</html>`;

    // إنشاء iframe مخفي وحقن الـ HTML بداخله
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      alert("تعذر تجهيز مستند الطباعة.");
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // تنظيف iframe بعد الطباعة
    const cleanup = () => {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 300);
    };

    // بعض المتصفحات تطلق حدث afterprint داخل iframe
    const iwin = iframe.contentWindow;
    if (iwin) {
      iwin.onafterprint = cleanup;
    }
    // احتياط إضافي
    setTimeout(cleanup, 10000);
  };

  const handleOrder = async () => {
    if (!user) {
      alert("يجب تسجيل الدخول قبل تأكيد الطلب");
      return;
    }

    if (!userData.address.trim()) {
      alert("الرجاء تعبئة العنوان قبل تأكيد الطلب.");
      return;
    }

    if (cart.length === 0) {
      alert("سلة الشراء فارغة");
      return;
    }

    try {
      const orderData = {
        address: userData.address,
        total: summary.total,
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
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/orders`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 201) {
        alert("✅ تم إرسال الطلب بنجاح!");
        clearCart();
        setPreview(null);
      }
    } catch (err: any) {
      let message = "حدث خطأ أثناء تنفيذ الطلب.";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = err.response.data.message;
      }
      console.error(message, err);
      alert(message);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 text-right">
        <h1 className="text-3xl font-bold mb-6">سلة المشتريات</h1>

        {/* 🧾 نموذج بيانات المستخدم */}
        <div className="grid md:grid-cols-3 gap-4 my-6">
          <input
            className="border p-2 rounded"
            placeholder="اسمك"
            value={userData.name}
            readOnly={!!user}
            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="رقم الهاتف"
            value={userData.phone}
            readOnly={!!user}
            onChange={(e) =>
              setUserData({ ...userData, phone: e.target.value })
            }
          />
          <input
            className="border p-2 rounded"
            placeholder="العنوان"
            value={userData.address}
            onChange={(e) =>
              setUserData({ ...userData, address: e.target.value })
            }
          />
        </div>

        {/* 💻 لسطح المكتب */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border text-right">
            <thead className="bg-gray-100 dark:bg-black dark:text-white">
              <tr>
                <th className="py-2 px-4 border">المنتج</th>
                <th className="py-2 px-4 border">اللون</th>
                <th className="py-2 px-4 border">المقاس</th>
                <th className="py-2 px-4 border">السعر</th>
                <th className="py-2 px-4 border">الكمية</th>
                <th className="py-2 px-4 border">الاجمالي الفرعي</th>
                <th className="py-2 px-4 border">إزالة</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr
                  key={`${item._id}-${(item as any).selectedColor}-${
                    (item as any).selectedMeasure
                  }`}
                >
                  <td className="py-2 px-4 border">{item.name}</td>
                  <td className="py-2 px-4 border">
                    {(item as any).selectedColor || "-"}
                  </td>
                  <td className="py-2 px-4 border">
                    {(item as any).selectedMeasure || "-"}
                  </td>
                  <td className="py-2 px-4 border">{currency(item.price)}</td>
                  <td className="py-2 px-4 border">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 border rounded"
                        onClick={() =>
                          updateQuantity(
                            item._id,
                            item.quantity - 1,
                            (item as any).selectedColor,
                            (item as any).selectedMeasure
                          )
                        }
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>

                      <QuantityInput
                        quantity={item.quantity}
                        onChange={(newQty) =>
                          updateQuantity(
                            item._id,
                            newQty,
                            (item as any).selectedColor,
                            (item as any).selectedMeasure
                          )
                        }
                      />

                      <button
                        className="px-2 py-1 border rounded"
                        onClick={() =>
                          updateQuantity(
                            item._id,
                            item.quantity + 1,
                            (item as any).selectedColor,
                            (item as any).selectedMeasure
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-4 border">
                    {currency(item.price * item.quantity)}
                  </td>
                  <td className="py-2 px-4 border">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        removeFromCart(
                          item._id,
                          (item as any).selectedColor,
                          (item as any).selectedMeasure
                        )
                      }
                    >
                      إزالة
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 📱 للموبايل */}
        <div className="grid gap-4 md:hidden">
          {cart.map((item) => (
            <div
              key={`${item._id}-${(item as any).selectedColor}-${
                (item as any).selectedMeasure
              }`}
              className="border rounded-lg p-4 text-right"
            >
              <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500">
                اللون: {(item as any).selectedColor || "-"} | المقاس:{" "}
                {(item as any).selectedMeasure || "-"}
              </p>
              <p className="text-gray-600 mb-1">
                السعر: {currency(item.price)}
              </p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-600">الكمية:</span>
                <QuantityInput
                  quantity={item.quantity}
                  onChange={(newQty) =>
                    updateQuantity(
                      item._id,
                      newQty,
                      (item as any).selectedColor,
                      (item as any).selectedMeasure
                    )
                  }
                />
              </div>
              <p className="text-gray-700 font-semibold mb-3">
                الإجمالي: {currency(item.price * item.quantity)}
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  removeFromCart(
                    item._id,
                    (item as any).selectedColor,
                    (item as any).selectedMeasure
                  )
                }
              >
                إزالة
              </Button>
            </div>
          ))}
        </div>

        {/* 💳 الملخص + أزرار الإرسال/الطباعة */}
        <div className="mt-6 flex justify-between items-start flex-col md:flex-row gap-4">
          <div className="space-y-1 text-right w-full md:w-auto">
            <p className="text-base">
              المجموع الفرعي:{" "}
              <span className="font-medium">{currency(summary.subtotal)}</span>
            </p>

            {loadingPreview ? (
              <p className="text-sm text-muted-foreground">
                جارٍ احتساب الخصم…
              </p>
            ) : (
              summary.discountAmount > 0 && (
                <>
                  <p className="text-base text-green-700">
                    الخصم
                    {summary.discountLabel ? ` (${summary.discountLabel})` : ""}
                    :{" "}
                    <span className="font-medium">
                      -{currency(summary.discountAmount)}
                    </span>
                  </p>
                  {summary.threshold > 0 && (
                    <p className="text-xs text-muted-foreground">
                      تم تطبيق شريحة عند ≥ {currency(summary.threshold)}
                    </p>
                  )}
                </>
              )
            )}

            <p className="text-xl font-bold border-t pt-2">
              الإجمالي: <span>{currency(summary.total)}</span>
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {/* زر طباعة للتاجر فقط */}
            {isAdmin && (
              <Button
                variant="outline"
                onClick={handlePrintForDealer}
                disabled={cart.length === 0}
              >
                طباعة كـ PDF (للتاجر)
              </Button>
            )}

            <Button onClick={handleOrder} disabled={cart.length === 0}>
              تأكيد الطلب
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Cart;
