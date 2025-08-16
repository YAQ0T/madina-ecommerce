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
    total: { type: Number, min: 0, required: true },
    address: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "on_the_way", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
