// src/components/admin/OrderDetailsDialog.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axios from "axios";

interface OrderDetailsDialogProps {
  selectedOrder: any;
  setSelectedOrder: (order: any | null) => void;
  setOrders: (orders: any[]) => void;
  token: string;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  selectedOrder,
  setSelectedOrder,
  setOrders,
  token,
}) => {
  if (!selectedOrder) return null;

  const handleDelete = async () => {
    const confirmDelete = confirm("هل أنت متأكد من حذف هذا الطلب نهائيًا؟");
    if (!confirmDelete) return;

    try {
      await axios.delete(
        `http://localhost:3001/api/orders/${selectedOrder._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders((prev) => prev.filter((o) => o._id !== selectedOrder._id));
      setSelectedOrder(null);
    } catch (err) {
      console.error("❌ Error deleting order", err);
      alert("فشل في حذف الطلب");
    }
  };

  return (
    <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تفاصيل الطلب</DialogTitle>
          <DialogDescription>لتعديل تفاصيل الطلب رقم</DialogDescription>
        </DialogHeader>

        <div className="text-right space-y-2">
          <p>
            <strong>الاسم:</strong> {selectedOrder.user.name}
          </p>
          <p>
            <strong>الهاتف:</strong> {selectedOrder.user.phone}
          </p>
          <p>
            <strong>العنوان:</strong> {selectedOrder.address}
          </p>
          <p>
            <strong>الإجمالي:</strong> ₪{selectedOrder.total}
          </p>
          <p>
            <strong>الحالة:</strong> {selectedOrder.status}
          </p>
          <p>
            <strong>تاريخ الطلب:</strong>{" "}
            {new Date(selectedOrder.createdAt).toLocaleString("ar-EG")}
          </p>

          <div>
            <strong>المنتجات:</strong>
            <ul className="list-disc pr-5">
              {selectedOrder.items.map((item: any, i: number) => (
                <li key={i}>
                  {item.productId
                    ? `${item.productId.name} × ${item.quantity}`
                    : `منتج محذوف × ${item.quantity}`}
                </li>
              ))}
            </ul>
          </div>

          <Button size="sm" variant="destructive" onClick={handleDelete}>
            🗑️ حذف نهائي
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={() => setSelectedOrder(null)}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
