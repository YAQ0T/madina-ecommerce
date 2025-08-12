const mongoose = require("mongoose");
const { Schema } = mongoose;

const DiscountSchema = new Schema(
  {
    type: { type: String, enum: ["percent", "amount"], default: "percent" },
    value: { type: Number, min: 0, default: 0 },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { _id: false }
);

const VariantSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // filterable dimensions
    measure: { type: String, required: true, trim: true }, // e.g., "M" or "42"
    measureSlug: { type: String, index: true }, // e.g., "m" or "42"
    color: {
      name: { type: String, required: true, trim: true }, // e.g., "Black"
      code: { type: String, trim: true }, // e.g., "#000000"
      images: { type: [String], default: [] },
    },
    colorSlug: { type: String, index: true }, // e.g., "black"

    // pricing
    price: {
      currency: { type: String, default: "USD" },
      amount: { type: Number, required: true, min: 0 },
      compareAt: { type: Number, min: 0 },
      discount: { type: DiscountSchema, default: () => ({}) },
    },

    // stock
    stock: {
      inStock: { type: Number, min: 0, default: 0 },
      sku: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
      },
    },

    // flexible filter tags (dimension:value)
    tags: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

// unique per product + measure + color
VariantSchema.index(
  { product: 1, measureSlug: 1, colorSlug: 1 },
  { unique: true }
);
VariantSchema.index({ "price.amount": 1 });
VariantSchema.index({ "stock.inStock": 1 });

const slugify = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, "-");

// ensure slugs & tags on create/save
VariantSchema.pre("save", function (next) {
  this.measureSlug = slugify(this.measure);
  this.colorSlug = slugify(this.color?.name);

  const tagSet = new Set(this.tags || []);
  if (this.measureSlug) tagSet.add(`measure:${this.measureSlug}`);
  if (this.colorSlug) tagSet.add(`color:${this.colorSlug}`);
  if (this.color?.code)
    tagSet.add(`color_code:${String(this.color.code).toLowerCase()}`);
  this.tags = Array.from(tagSet);

  next();
});

// ensure slugs & tags on update (findOneAndUpdate / findByIdAndUpdate)
VariantSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update; // support both styles

  // if measure or color.name changed, rebuild slugs
  if ($set.measure != null) {
    $set.measureSlug = slugify($set.measure);
  }
  if ($set.color?.name != null) {
    $set.colorSlug = slugify($set.color.name);
  }

  // rebuild tags
  const tags = new Set($set.tags || update.tags || []);
  if ($set.measureSlug) tags.add(`measure:${$set.measureSlug}`);
  if ($set.colorSlug) tags.add(`color:${$set.colorSlug}`);
  if ($set.color?.code)
    tags.add(`color_code:${String($set.color.code).toLowerCase()}`);

  // persist back
  if (update.$set) update.$set = { ...$set, tags: Array.from(tags) };
  else this.setUpdate({ ...$set, tags: Array.from(tags) });

  next();
});

// final price helper
VariantSchema.methods.finalAmount = function () {
  const { amount, discount } = this.price || {};
  if (!amount || !discount?.value) return amount || 0;

  const now = new Date();
  if (discount.startAt && now < discount.startAt) return amount;
  if (discount.endAt && now > discount.endAt) return amount;

  return discount.type === "percent"
    ? Math.max(0, amount - (amount * discount.value) / 100)
    : Math.max(0, amount - discount.value);
};

module.exports =
  mongoose.models.Variant || mongoose.model("Variant", VariantSchema);
