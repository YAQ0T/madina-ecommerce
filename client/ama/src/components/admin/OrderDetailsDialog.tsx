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
import OrderDetailsContent from "@/components/common/OrderDetailsContent";

interface OrderDetailsDialogProps {
  selectedOrder: any;
  setSelectedOrder: (order: any | null) => void;
  setOrders: (orders: any[]) => void;
  orders: any[];
  token: string;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  selectedOrder,
  setSelectedOrder,
  setOrders,
  orders,
  token,
}) => {
  if (!selectedOrder) return null;

  const handleDelete = async () => {
    const confirmDelete = confirm("هل أنت متأكد من حذف هذا الطلب نهائيًا؟");
    if (!confirmDelete) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/orders/${selectedOrder._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedOrders = orders.filter((o) => o._id !== selectedOrder._id);
      setOrders(updatedOrders);
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
          <DialogDescription>
            لمراجعة وتعديل تفاصيل الطلب رقم{" "}
            <span className="font-semibold">{selectedOrder?._id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* يعرض: المنتجات مع اللون/المقاس/الكمية/السعر بناءً على المكوّن المشترك */}
        <OrderDetailsContent order={selectedOrder} />

        <div className="flex items-center justify-between mt-4">
          <Button size="sm" variant="destructive" onClick={handleDelete}>
            🗑️ حذف نهائي
          </Button>
          <DialogFooter>
            <Button onClick={() => setSelectedOrder(null)}>إغلاق</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
