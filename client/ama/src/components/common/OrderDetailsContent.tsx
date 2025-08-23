// src/components/common/OrderDetailsContent.tsx
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

type OrderItem = {
  productId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number; // سعر الوحدة النهائي وقت الشراء
  color?: string | null;
  measure?: string | null;
  sku?: string | null;
  image?: string | null;
};

type OrderDiscount = {
  applied?: boolean;
  ruleId?: string | null;
  type?: "percent" | "fixed" | null;
  value?: number;
  amount?: number; // المبلغ المخصوم فعلياً بالشيكل
  threshold?: number;
  name?: string;
};

type Order = {
  _id: string;
  user: {
    _id: string;
    name?: string;
    phone?: string;
    email?: string;
    role?: string;
    type?: string;
    userType?: string;
    accountType?: string;
  };
  items: OrderItem[];
  // الحقول الجديدة القادمة من السيرفر
  subtotal?: number; // إجمالي قبل الخصم
  discount?: OrderDiscount; // تفاصيل الخصم
  total: number; // إجمالي بعد الخصم
  address: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  // حقول اختيارية محتملة لتصنيف الطلب
  tags?: string[];
};

const currency = (n: number | undefined | null) =>
  typeof n === "number" ? `₪${n.toFixed(2)}` : "₪0.00";

const OrderDetailsContent: React.FC<{ order: Order | any }> = ({ order }) => {
  const { user: authUser } = useAuth();

  if (!order) return null;

  const hasDiscount =
    !!order?.discount?.applied && Number(order?.discount?.amount || 0) > 0;

  // ✅ من هو الأدمن؟
  const isAdmin = useMemo(() => {
    const r = (authUser as any)?.role;

    return r === "admin";
  }, [authUser]);

  // ✅ هل هذا الطلب لتاجر؟
  const isDealerOrder = useMemo(() => {
    const u = order?.user || {};
    const uRole =
      (u as any)?.role ||
      (u as any)?.type ||
      (u as any)?.userType ||
      (u as any)?.accountType;
    const tagIsDealer =
      Array.isArray(order?.tags) &&
      order.tags.some((t: string) =>
        String(t).toLowerCase().includes("dealer")
      );
    return uRole === "dealer" || tagIsDealer;
  }, [order]);

  // ✅ طباعة نسخة للتاجر (عمود ملاحظات فارغ) عبر iframe
  const handlePrintDealer = () => {
    if (!isAdmin) return;
    const now = new Date();
    const arabicDate = now.toLocaleString("ar-EG", {
      dateStyle: "full",
      timeStyle: "short",
      hour12: false,
    });

    const itemsRows = (Array.isArray(order?.items) ? order.items : [])
      .map((item: OrderItem) => {
        const qty = item.quantity ?? 1;
        const unitPrice = item.price ?? 0;
        const line = qty * unitPrice;
        return `
          <tr>
            <td>${item.sku || ""}</td>
            <td>${escapeHtml(item.name || "منتج")}</td>
            <td>${item.color || "-"}</td>
            <td>${item.measure || "-"}</td>
            <td>${currency(unitPrice)}</td>
            <td>${qty}</td>
            <td>${currency(line)}</td>
            <td></td>
          </tr>
        `;
      })
      .join("");

    const discountRow = hasDiscount
      ? `<tr>
          <td colspan="6" class="ta-left">
            الخصم${
              order?.discount?.name
                ? ` (${escapeHtml(order.discount.name!)})`
                : ""
            }${
          order?.discount?.type === "percent"
            ? ` - ${order?.discount?.value}%`
            : ""
        }
          </td>
          <td>-${currency(order?.discount?.amount || 0)}</td>
          <td></td>
        </tr>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>طلب تاجر #${escapeHtml(order?._id || "")}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Naskh Arabic", "Noto Sans Arabic", "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
      direction: rtl;
      color: #111;
    }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #555; padding-bottom: 8px; margin-bottom: 16px; }
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
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">طلب تاجر — نسخة للطباعة</div>
      <div class="muted">التاريخ: ${arabicDate}</div>
      <div class="badge">يحتوي عمود "ملاحظات" فارغ للكتابة بالقلم</div>
    </div>
    <div class="muted">
      <div><strong>رقم الطلب:</strong> ${escapeHtml(order?._id || "-")}</div>
      <div><strong>الحالة:</strong> ${escapeHtml(order?.status || "-")}</div>
      <div><strong>تاريخ الإنشاء:</strong> ${
        order?.createdAt
          ? new Date(order.createdAt).toLocaleString("ar-EG")
          : "-"
      }</div>
    </div>
  </div>

  <div class="grid">
    <div class="muted">
      <div><strong>اسم الزبون (التاجر):</strong> ${escapeHtml(
        order?.user?.name || "-"
      )}</div>
      <div><strong>الهاتف:</strong> ${escapeHtml(
        order?.user?.phone || "-"
      )}</div>
      <div><strong>الإيميل:</strong> ${escapeHtml(
        order?.user?.email || "-"
      )}</div>
    </div>
    <div class="muted">
      <div><strong>العنوان:</strong> ${escapeHtml(order?.address || "-")}</div>
    </div>
  </div>

  <div class="title">تفاصيل العناصر</div>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>المنتج</th>
        <th>اللون</th>
        <th>المقاس</th>
        <th>سعر الوحدة</th>
        <th>الكمية</th>
        <th>الإجمالي الفرعي</th>
        <th>ملاحظات (فارغ)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      <tr>
        <td colspan="6" class="ta-left"><strong>المجموع قبل الخصم</strong></td>
        <td><strong>${currency(order?.subtotal)}</strong></td>
        <td></td>
      </tr>
      ${discountRow}
      <tr>
        <td colspan="6" class="ta-left"><strong>الإجمالي النهائي</strong></td>
        <td><strong>${currency(order?.total)}</strong></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="notes">
    <strong>ملاحظات إضافية:</strong><br/>
    <!-- اكتب بالقلم هنا بعد الطباعة -->
  </div>

  <div class="signatures">
    <div class="sign-box"><strong>توقيع العميل/التاجر:</strong></div>
    <div class="sign-box"><strong>توقيع المندوب/الأدمن:</strong></div>
  </div>

  <script>
    function readyToPrint() {
      setTimeout(function(){ window.print(); }, 150);
    }
    if (document.readyState === "complete") {
      readyToPrint();
    } else {
      window.onload = readyToPrint;
    }
  </script>
</body>
</html>`;

    // إنشاء iframe مخفي وحقن HTML
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
      alert("تعذّر تجهيز مستند الطباعة.");
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
      }, 400);
    };
    const iwin = iframe.contentWindow;
    if (iwin) iwin.onafterprint = cleanup;
    setTimeout(cleanup, 10000);
  };

  return (
    <div className="text-right space-y-4">
      {/* شريط علوي لزر الطباعة (يظهر فقط للأدمن وفي طلبات التجار) */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handlePrintDealer}>
            طباعة كـ PDF (للتاجر)
          </Button>
        </div>
      )}

      {/* معلومات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <p>
          <strong>الاسم:</strong> {order?.user?.name || "-"}
        </p>
        <p>
          <strong>الهاتف:</strong> {order?.user?.phone || "-"}
        </p>
        <p className="md:col-span-2">
          <strong>العنوان:</strong> {order?.address || "-"}
        </p>
        <p>
          <strong>الحالة:</strong> {order?.status || "-"}
        </p>
        <p>
          <strong>تاريخ الطلب:</strong>{" "}
          {order?.createdAt
            ? new Date(order.createdAt).toLocaleString("ar-EG")
            : "-"}
        </p>
      </div>

      {/* المنتجات */}
      <div>
        <strong className="block mb-2 text-lg">المنتجات:</strong>
        <ul className="space-y-3">
          {Array.isArray(order?.items) &&
            order.items.map((item: OrderItem, i: number) => (
              <li
                key={i}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50 shadow-sm"
              >
                {item?.productId ? (
                  <div className="flex gap-3">
                    {item?.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover border"
                      />
                    ) : null}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {item.name || "منتج"}
                      </p>
                      <p className="text-sm text-gray-600">
                        الكمية:{" "}
                        <span className="font-medium">
                          {item.quantity ?? 1}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        اللون:{" "}
                        <span
                          className="inline-block w-4 h-4 rounded-full border mr-1 align-middle"
                          style={{ backgroundColor: item.color || "#ccc" }}
                        ></span>
                        {item.color || "غير محدد"}
                      </p>
                      <p className="text-sm text-gray-600">
                        المقاس:{" "}
                        <span className="font-medium">
                          {item.measure || "غير محدد"}
                        </span>
                      </p>
                      <p className="text-sm">
                        سعر الوحدة:{" "}
                        <span className="font-medium">
                          {currency(item.price)}
                        </span>{" "}
                        | الإجمالي:{" "}
                        <strong>
                          {currency((item.quantity ?? 1) * (item.price ?? 0))}
                        </strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-500">
                    منتج محذوف × {item?.quantity ?? 1}
                  </p>
                )}
              </li>
            ))}
        </ul>
      </div>

      {/* الملخّص المالي */}
      <div className="border-t pt-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm">المجموع قبل الخصم</span>
          <span className="font-medium">{currency(order?.subtotal)}</span>
        </div>

        {hasDiscount ? (
          <>
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm">
                خصم
                {order?.discount?.name ? ` - ${order.discount.name}` : ""}{" "}
                {order?.discount?.type === "percent"
                  ? `(${order?.discount?.value}%)`
                  : ""}
              </span>
              <span className="font-medium">
                -{currency(order?.discount?.amount || 0)}
              </span>
            </div>
            {typeof order?.discount?.threshold === "number" &&
              (order.discount.threshold as number) > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    تم تطبيق شريحة عند ≥ {currency(order.discount.threshold)}
                  </span>
                  <span>
                    نوع:{" "}
                    {order.discount.type === "percent" ? "نسبة" : "قيمة ثابتة"}
                  </span>
                </div>
              )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            لم يتم تطبيق أي خصم على هذا الطلب.
          </div>
        )}

        <div className="flex items-center justify-between text-lg border-t pt-2">
          <span>الإجمالي المستحق</span>
          <span className="font-bold">{currency(order?.total)}</span>
        </div>
      </div>
    </div>
  );
};

// 🔒 دالة صغيرة لتأمين النص داخل HTML
function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default OrderDetailsContent;
