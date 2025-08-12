const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    mainCategory: { type: String, required: true, trim: true },
    subCategory: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
  },
  { timestamps: true }
);

// 👇 هذا السطر يمنع إعادة التعريف إذا الملف استُورد أكثر من مرة
module.exports =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
