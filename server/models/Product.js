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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
