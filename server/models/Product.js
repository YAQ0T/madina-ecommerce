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

    // فلتر الملكية
    ownershipType: {
      type: String,
      enum: ["ours", "local"], // ours = على اسمنا ، local = نشتريه محلي
      default: "ours",
    },
  },
  { timestamps: true }
);

// فهرس نصي للبحث العام
ProductSchema.index({ name: "text", description: "text" });

module.exports =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
