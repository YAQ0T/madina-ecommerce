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
        <strong>المنتجات:</strong>
        <ul className="list-disc pr-5">
          {order.items.map((item: any, i: number) => (
            <li key={i}>
              {item.productId
                ? `${item.productId.name} × ${item.quantity}`
                : `منتج محذوف × ${item.quantity}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OrderDetailsContent;
