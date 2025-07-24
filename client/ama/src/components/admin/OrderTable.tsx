// src/components/admin/OrderTable.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import OrderStatusButtons from "./OrderStatusButtons";

interface OrderTableProps {
  orders: any[];
  filter: string;
  updateStatus: (orderId: string, newStatus: string) => void;
  setSelectedOrder: (order: any) => void;
}

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
              <td className="border px-4 py-2">{order.user.name}</td>
              <td className="border px-4 py-2">{order.user.phone}</td>
              <td className="border px-4 py-2">{order.address}</td>
              <td className="border px-4 py-2">₪{order.total}</td>
              <td className="border px-4 py-2">{order.status}</td>
              <td className="border px-4 py-2">{order.items.length}</td>
              <td className="border px-4 py-2">
                <OrderStatusButtons
                  orderId={order._id}
                  updateStatus={updateStatus}
                />
              </td>
              <td className="border px-4 py-2">
                {new Date(order.createdAt).toLocaleDateString("ar-EG")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
