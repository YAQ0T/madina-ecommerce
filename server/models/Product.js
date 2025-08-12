const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    category: String,
    mainCategory: { type: String, required: true },
    subCategory: { type: String, required: true },
    description: String,
    images: {
      type: [String],
      required: true,
      default: [],
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    discount: {
      type: Number,
      default: 0, // خصم بنسبة مئوية أو قيمة
    },
    tags: {
      type: [String],
      default: [], // مصفوفة وسوم
    },
    measures: {
      type: [String],
      default: [], // مقاسات المنتج
    },
    colors: {
      type: [String],
      default: [], // ألوان المنتج
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
