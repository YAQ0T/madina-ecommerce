const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    category: String, // ممكن نخليه اختياري أو تستخدمه زي ما بدك
    mainCategory: { type: String, required: true },
    subCategory: { type: String, required: true },
    description: String,
    image: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
