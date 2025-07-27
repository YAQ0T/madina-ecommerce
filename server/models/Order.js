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
      quantity: Number,
      price: Number,
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
