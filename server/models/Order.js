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

    // ✅ إجمالي قبل الخصم (نحسبه من عناصر الطلب)
    subtotal: { type: Number, min: 0, required: true },

    // ✅ تفاصيل الخصم المطبّق (إن وُجد)
    discount: {
      applied: { type: Boolean, default: false },
      ruleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DiscountRule",
        default: null,
      },
      type: { type: String, enum: ["percent", "fixed", null], default: null },
      value: { type: Number, min: 0, default: 0 }, // القيمة المعلنة في القاعدة (مثلاً 5 أو 10 أو 50 شيكل)
      amount: { type: Number, min: 0, default: 0 }, // المبلغ المخصوم فعلياً بالشيكل
      threshold: { type: Number, min: 0, default: 0 }, // العتبة التي طابقت
      name: { type: String, default: "" }, // اسم القاعدة لسهولة القراءة
    },

    // ✅ الإجمالي بعد الخصم
    total: { type: Number, min: 0, required: true },

    address: { type: String, required: true },
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
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
