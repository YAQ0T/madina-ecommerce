import React, { useState } from "react";
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

  const [markingPaid, setMarkingPaid] = useState(false);

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

  const handleMarkPaid = async () => {
    if (!selectedOrder?.reference) {
      alert("لا يوجد مرجع دفع مرتبط بهذا الطلب");
      return;
    }
    if (!token) {
      alert("رمز الأدمن غير متوفر، أعد تسجيل الدخول");
      return;
    }

    try {
      setMarkingPaid(true);
      const base = import.meta.env.VITE_API_URL;
      const { data } = await axios.patch(
        `${base}/api/orders/by-reference/${encodeURIComponent(
          selectedOrder.reference
        )}/pay`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const patched = data?.order || data;
      if (patched && patched._id) {
        const merged = orders.map((o) =>
          o._id === patched._id ? { ...o, ...patched } : o
        );
        setOrders(merged);
        setSelectedOrder(patched);
      }

      alert(data?.message || "تم وسم الطلب كمدفوع بنجاح");
    } catch (err: any) {
      const status = err?.response?.status;
      const resp = err?.response?.data;
      console.error("❌ Error marking order paid", status, resp || err);
      alert(
        resp?.message
          ? `فشل وسم الطلب كمدفوع: ${resp.message}`
          : "تعذر وسم الطلب كمدفوع، حاول لاحقًا"
      );
    } finally {
      setMarkingPaid(false);
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
          <DialogFooter className="flex gap-2">
            {selectedOrder?.reference &&
              selectedOrder?.paymentStatus !== "paid" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                >
                  {markingPaid ? "جاري التحقق…" : "وسم كمدفوع (لحظة)"}
                </Button>
              )}
            <Button onClick={() => setSelectedOrder(null)}>إغلاق</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
