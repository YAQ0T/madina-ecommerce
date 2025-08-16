// src/components/common/OrderDetailsContent.tsx
import React from "react";

const OrderDetailsContent: React.FC<{ order: any }> = ({ order }) => {
  if (!order) return null;

  return (
    <div className="text-right space-y-2">
      <p>
        <strong>الاسم:</strong> {order.user.name}
      </p>
      <p>
        <strong>الهاتف:</strong> {order.user.phone}
      </p>
      <p>
        <strong>العنوان:</strong> {order.address}
      </p>
      <p>
        <strong>الإجمالي:</strong> ₪{order.total}
      </p>
      <p>
        <strong>الحالة:</strong> {order.status}
      </p>
      <p>
        <strong>تاريخ الطلب:</strong>{" "}
        {new Date(order.createdAt).toLocaleString("ar-EG")}
      </p>

      <div>
        <strong className="block mb-2 text-lg">المنتجات:</strong>
        <ul className="space-y-3">
          {order.items.map((item: any, i: number) => (
            <li
              key={i}
              className="p-3 rounded-lg border border-gray-200 bg-gray-50 shadow-sm"
            >
              {item.productId ? (
                <div>
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    الكمية: <span className="font-medium">{item.quantity}</span>
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
                </div>
              ) : (
                <p className="text-sm text-red-500">
                  منتج محذوف × {item.quantity}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OrderDetailsContent;
