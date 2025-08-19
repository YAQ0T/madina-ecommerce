import React from "react";
import { Button } from "@/components/ui/button";
import OrderStatusButtons from "./OrderStatusButtons";

type OrderStatus =
  | "waiting_confirmation"
  | "pending"
  | "on_the_way"
  | "delivered"
  | "cancelled";

interface OrderTableProps {
  orders: any[];
  filter: string;
  updateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  setSelectedOrder: (order: any) => void;
}

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

const renderItemsSummary = (items: any[] = []) => {
  if (!items.length) return "-";
  return (
    <div className="space-y-1">
      {items.map((it, i) => {
        const name = it?.name || it?.productName || "منتج";
        const color = it?.color || it?.selectedColor;
        const measure = it?.measure || it?.selectedMeasure;
        const qty = it?.quantity ?? 1;
        return (
          <div key={i} className="text-sm">
            <span className="font-medium">{name}</span>{" "}
            <span className="text-gray-500">
              {color ? `| اللون: ${color} ` : ""}
              {measure ? `| المقاس: ${measure} ` : ""}| الكمية: {qty}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  filter,
  updateStatus,
  setSelectedOrder,
}) => {
  const filteredOrders = orders.filter((order) =>
    filter === "all" ? true : order.status === filter
  );

  if (orders.length === 0) {
    return <p className="text-gray-600">لا توجد طلبات حالياً.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">#</th>
            <th className="border px-4 py-2">الاسم</th>
            <th className="border px-4 py-2">الهاتف</th>
            <th className="border px-4 py-2">العنوان</th>
            <th className="border px-4 py-2">المنتجات</th>
            <th className="border px-4 py-2">الإجمالي</th>
            <th className="border px-4 py-2">الحالة</th>
            <th className="border px-4 py-2">عدد المنتجات</th>
            <th className="border px-4 py-2">تحديث الحالة</th>
            <th className="border px-4 py-2">تاريخ الطلب</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order, idx) => (
            <tr key={order._id}>
              <td className="border px-4 py-2">
                <Button
                  variant="link"
                  onClick={() => setSelectedOrder(order)}
                  className="text-blue-600 underline p-0"
                >
                  {idx + 1}
                </Button>
              </td>
              <td className="border px-4 py-2">{order?.user?.name || "-"}</td>
              <td className="border px-4 py-2">{order?.user?.phone || "-"}</td>
              <td className="border px-4 py-2">{order?.address || "-"}</td>
              <td className="border px-4 py-2">
                {renderItemsSummary(order?.items)}
              </td>
              <td className="border px-4 py-2">{currency(order?.total)}</td>
              <td className="border px-4 py-2">{statusLabel(order?.status)}</td>
              <td className="border px-4 py-2">{order?.items?.length || 0}</td>
              <td className="border px-4 py-2">
                <OrderStatusButtons
                  orderId={order._id}
                  updateStatus={updateStatus}
                />
              </td>
              <td className="border px-4 py-2">
                {order?.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("ar-EG")
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
