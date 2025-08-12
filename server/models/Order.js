const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: String,
    phone: String,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      name: String, // ممكن تحب تخزن الاسم عشان ما تضطر تعمل populate
      quantity: Number,
      price: Number,
      color: String, // ✅ اللون المختار
      measure: String, // ✅ المقاس المختار
    },
  ],
  total: Number,
  address: String,
  status: {
    type: String,
    default: "pending", // or "delivered", "cancelled"
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", orderSchema);
