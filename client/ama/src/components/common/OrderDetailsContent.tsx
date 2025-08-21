// src/components/common/OrderDetailsContent.tsx
import React from "react";

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
  user: { _id: string; name?: string; phone?: string; email?: string };
  items: OrderItem[];
  // الحقول الجديدة القادمة من السيرفر
  subtotal?: number; // إجمالي قبل الخصم
  discount?: OrderDiscount; // تفاصيل الخصم
  total: number; // إجمالي بعد الخصم
  address: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

const currency = (n: number | undefined | null) =>
  typeof n === "number" ? `₪${n.toFixed(2)}` : "₪0.00";

const OrderDetailsContent: React.FC<{ order: Order | any }> = ({ order }) => {
  if (!order) return null;

  const hasDiscount =
    !!order?.discount?.applied && Number(order?.discount?.amount || 0) > 0;

  return (
    <div className="text-right space-y-4">
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
                          style={{
                            backgroundColor: item.color || "#ccc",
                          }}
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

export default OrderDetailsContent;
