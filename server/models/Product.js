const mongoose = require("mongoose");
const { Schema } = mongoose;

const {
  ensureLocalizedObject,
  hasArabicTranslation,
  hasAnyTranslation,
} = require("../utils/localized");

const LocalizedStringSchema = new Schema(
  {
    ar: { type: String, trim: true, default: "" },
    he: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    name: { type: LocalizedStringSchema, required: true },
    description: { type: LocalizedStringSchema },
    category: { type: String, trim: true },
    mainCategory: { type: String, required: true, trim: true },
    subCategory: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },

    // فلتر الملكية
    ownershipType: {
      type: String,
      enum: ["ours", "local"],
      default: "ours",
    },

    // ✅ أولوية الظهور
    priority: {
      type: String,
      enum: ["A", "B", "C"],
      default: "C",
      index: true,
    },
  },
  { timestamps: true }
);

ProductSchema.path("name").set((value) => ensureLocalizedObject(value));
ProductSchema.path("description").set((value) => {
  if (value == null) return undefined;
  const normalized = ensureLocalizedObject(value);
  if (!normalized.ar && !normalized.he) return undefined;
  return normalized;
});

ProductSchema.path("name").validate(
  (value) => hasArabicTranslation(value),
  "الاسم العربي مطلوب"
);

ProductSchema.path("description").validate(
  (value) => value == null || hasAnyTranslation(value),
  "الوصف يجب أن يحتوي على نص واحد على الأقل"
);

const transformLocalizedFields = (_, ret) => {
  if (ret.name) {
    ret.name = ensureLocalizedObject(ret.name);
  }
  ret.description = ret.description
    ? ensureLocalizedObject(ret.description)
    : { ar: "", he: "" };
  return ret;
};

ProductSchema.set("toJSON", {
  virtuals: true,
  transform: transformLocalizedFields,
});

ProductSchema.set("toObject", {
  virtuals: true,
  transform: transformLocalizedFields,
});

// فهرس نصي للبحث العام
ProductSchema.index({
  "name.ar": "text",
  "name.he": "text",
  "description.ar": "text",
  "description.he": "text",
});

// فهرس مفيد للفرز الافتراضي
ProductSchema.index({ priority: 1, createdAt: -1 });

module.exports =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
