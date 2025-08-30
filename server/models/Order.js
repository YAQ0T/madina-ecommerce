// server/models/Order.js
const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, min: 1, required: true },
    price: { type: Number, min: 0, required: true }, // سعر الوحدة النهائي وقت الشراء
    color: { type: String },
    measure: { type: String },
    sku: { type: String },
    image: { type: String },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: String,
      phone: String,
      email: String,
    },

    items: { type: [OrderItemSchema], required: true },

    // إجمالي قبل الخصم
    subtotal: { type: Number, min: 0, required: true },

    // تفاصيل الخصم (إن وجد)
    discount: {
      applied: { type: Boolean, default: false },
      ruleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DiscountRule",
        default: null,
      },
      type: { type: String, enum: ["percent", "fixed", null], default: null },
      value: { type: Number, min: 0, default: 0 },
      amount: { type: Number, min: 0, default: 0 },
      threshold: { type: Number, min: 0, default: 0 },
      name: { type: String, default: "" },
    },

    // الإجمالي بعد الخصم
    total: { type: Number, min: 0, required: true },

    address: { type: String, required: true },

    // حالة الطلب التشغيلية
    status: {
      type: String,
      enum: [
        "pending",
        "waiting_confirmation",
        "on_the_way",
        "delivered",
        "cancelled",
      ],
      default: "waiting_confirmation",
      index: true,
    },

    // ✅ معلومات الدفع
    paymentMethod: {
      type: String,
      enum: ["card", "cod"],
      default: "cod",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed"],
      default: "unpaid",
      index: true,
    },

    // مرجع منصة الدفع (من لَهْزة) — نربط به الطلب
    reference: { type: String, index: true, default: null },

    // ملاحظات العميل
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
