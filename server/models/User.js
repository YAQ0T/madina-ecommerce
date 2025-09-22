const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * ملاحظات مهمة:
 * - لا تحفظ email=null أو email="" إطلاقًا. سنحولها إلى undefined في hook قبل الحفظ.
 * - نستخدم Partial Unique Index على email ليكون unique فقط عندما تكون email من نوع String.
 * - phone فريد وإجباري.
 */

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },

    // ✅ الجوال إجباري + فريد
    phone: { type: String, required: true, unique: true, index: true },

    // ✅ البريد اختياري (لا نضع unique هنا لتجنب بناء index مكرر)
    email: { type: String, trim: true, lowercase: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["user", "admin", "dealer"],
      default: "user",
    },

    // ✅ توثيق الجوال بالـ OTP
    phoneVerified: { type: Boolean, default: false },
    phoneVerificationCodeHash: { type: String },
    phoneVerificationExpires: { type: Date },
    phoneVerificationAttempts: { type: Number, default: 0 },
    phoneVerificationResends: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* =========================
   Hooks للتنظيف قبل الحفظ
========================= */
UserSchema.pre("save", function (next) {
  // لا نسمح بـ null/"" في email، نحولها إلى undefined لتُزال من الوثيقة
  if (!this.email || this.email === "null" || this.email === "undefined") {
    this.email = undefined;
  }
  next();
});

/* =========================
   فهارس (Indexes)
========================= */

/**
 * ✅ فريد جزئي على email:
 *  - يطبّق الفريد فقط عندما تكون email من نوع String
 *  - يسمح بتعدد المستندات التي لا تحتوي على الحقل أصلًا
 */
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
    name: "uniq_email_when_string",
  }
);

// phone فريد (موجود أيضًا على مستوى الحقل، نضيف اسم للمؤشر للوضوح)
UserSchema.index({ phone: 1 }, { unique: true, name: "uniq_phone" });

/* =========================
   OTP Helpers
========================= */
UserSchema.methods.setPhoneOTP = function setPhoneOTP(code, ttlMinutes = 10) {
  const hash = crypto.createHash("sha256").update(String(code)).digest("hex");
  this.phoneVerificationCodeHash = hash;
  this.phoneVerificationExpires = new Date(Date.now() + ttlMinutes * 60 * 1000);
  this.phoneVerificationAttempts = 0;
};

UserSchema.methods.checkPhoneOTP = function checkPhoneOTP(code) {
  if (!this.phoneVerificationCodeHash || !this.phoneVerificationExpires)
    return false;
  if (this.phoneVerificationExpires < new Date()) return false;
  const incoming = crypto
    .createHash("sha256")
    .update(String(code))
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incoming),
      Buffer.from(this.phoneVerificationCodeHash)
    );
  } catch {
    return false;
  }
};

module.exports = mongoose.model("User", UserSchema);
