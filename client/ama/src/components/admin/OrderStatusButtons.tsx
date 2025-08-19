import React from "react";
import { Button } from "@/components/ui/button";

type OrderStatus =
  | "waiting_confirmation"
  | "pending"
  | "on_the_way"
  | "delivered"
  | "cancelled";

interface OrderStatusButtonsProps {
  orderId: string;
  updateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
}

const OrderStatusButtons: React.FC<OrderStatusButtonsProps> = ({
  orderId,
  updateStatus,
}) => {
  return (
    <div className="space-x-4 space-x-reverse space-y-2">
      <Button
        size="sm"
        onClick={() => updateStatus(orderId, "waiting_confirmation")}
        variant="outline"
      >
        ⏱️ بانتظار التأكيد
      </Button>

      <Button
        size="sm"
        onClick={() => updateStatus(orderId, "on_the_way")}
        variant="outline"
      >
        🚚 في الطريق
      </Button>
      <Button
        size="sm"
        onClick={() => updateStatus(orderId, "pending")}
        variant="outline"
      >
        ⏳ قيد الانتظار
      </Button>
      <Button
        size="sm"
        onClick={() => updateStatus(orderId, "cancelled")}
        variant="destructive"
        className="me-2"
      >
        ❌ إلغاء
      </Button>
      <Button
        size="sm"
        onClick={() => updateStatus(orderId, "delivered")}
        variant="outline"
      >
        ✅ تم التوصيل
      </Button>
    </div>
  );
};

export default OrderStatusButtons;
