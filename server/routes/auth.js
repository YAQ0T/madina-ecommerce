// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const qs = require("querystring");
const User = require("../models/User");

const router = express.Router();

/* =========================
   ضبط بيئة/إعدادات
========================= */
const JWT_SECRET = process.env.JWT_SECRET || "changeme_dev_secret";
const HTD_BASE = "http://sms.htd.ps/API";
const SMS_HTD_ID = process.env.SMS_HTD_ID || "";
const SMS_SENDER = process.env.SMS_HTD_SENDER || "Madina";

/* ============== أدوات مساعدة للـ SMS ============== */
function normalizePhone(msisdn) {
  let to = String(msisdn || "").replace(/[^\d]/g, "");
  if (!to) return "";
  if (to.startsWith("0")) to = "970" + to.slice(1);
  if (!to.startsWith("970")) to = "970" + to;
  return to;
}

async function sendSMS({ to, msg }) {
  if (!SMS_HTD_ID) throw new Error("SMS_HTD_ID غير معرّف في .env");
  const url = `${HTD_BASE}/SendSMS.aspx`;
  const query = {
    id: SMS_HTD_ID,
    sender: SMS_SENDER,
    to: normalizePhone(to),
    msg,
  };
  const full = `${url}?${qs.stringify(query)}`;
  const { status, data } = await axios.get(full, { timeout: 15000 });
  return { ok: status === 200, raw: data };
}

async function getCredit() {
  if (!SMS_HTD_ID) throw new Error("SMS_HTD_ID غير معرّف في .env");
  const url = `${HTD_BASE}/GetCredit.aspx?id=${encodeURIComponent(SMS_HTD_ID)}`;
  const { status, data } = await axios.get(url, { timeout: 10000 });
  return { ok: status === 200, raw: data };
}

/* ============== أكواد/حقول OTP ============== */
// NOTE: نفترض وجود حقول في نموذج المستخدم:
// phoneVerificationCodeHash, phoneVerificationExpires, phoneVerificationAttempts
// ويمكنك إضافة مشابه:
// resetPasswordCodeHash, resetPasswordExpires, resetPasswordAttempts
// لو ما عندك دوال setPhoneOTP/checkPhoneOTP، نستخدم بديل داخلي هنا:
async function setPhoneOTPOnUser(user, code) {
  const hash = await bcrypt.hash(String(code), 10);
  user.phoneVerificationCodeHash = hash;
  user.phoneVerificationExpires = new Date(Date.now() + 5 * 60 * 1000);
  user.phoneVerificationAttempts = 0;
}

async function checkPhoneOTPOnUser(user, code) {
  if (!user.phoneVerificationCodeHash || !user.phoneVerificationExpires)
    return false;
  if (user.phoneVerificationExpires.getTime() < Date.now()) return false;
  return bcrypt.compare(String(code), user.phoneVerificationCodeHash);
}

async function setResetOTPOnUser(user, code) {
  const hash = await bcrypt.hash(String(code), 10);
  user.resetPasswordCodeHash = hash;
  user.resetPasswordExpires = new Date(Date.now() + 5 * 60 * 1000);
  user.resetPasswordAttempts = 0;
}

async function checkResetOTPOnUser(user, code) {
  if (!user.resetPasswordCodeHash || !user.resetPasswordExpires) return false;
  if (user.resetPasswordExpires.getTime() < Date.now()) return false;
  return bcrypt.compare(String(code), user.resetPasswordCodeHash);
}

/* =========================
   ✅ تسجيل مستخدم جديد: /signup
========================= */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({
        message: "الاسم وكلمة المرور ومُعرّف واحد (بريد أو جوال) مطلوبة",
      });
    }

    const normEmail = email ? String(email).toLowerCase().trim() : null;
    const normPhone = phone ? normalizePhone(phone) : null;

    const existing = await User.findOne({
      $or: [
        ...(normEmail ? [{ email: normEmail }] : []),
        ...(normPhone ? [{ phone: normPhone }] : []),
      ],
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "المستخدم موجود مسبقًا بالبريد أو الجوال" });
    }

    const hash = await bcrypt.hash(String(password), 10);

    const user = new User({
      name: String(name).trim(),
      email: normEmail || undefined,
      phone: normPhone || undefined,
      password: hash,
      role: "user",
      phoneVerified: false,
      phoneVerificationAttempts: 0,
    });

    // لو عندك methods user.setPhoneOTP فاستعملها؛ وإلّا استخدم البديل:
    if (typeof user.setPhoneOTP === "function") {
      const code = Math.floor(100000 + Math.random() * 900000);
      user.setPhoneOTP(code);
      // إرسال SMS سيتم من الواجهة عبر /send-sms-code
    }

    await user.save();

    return res.json({
      ok: true,
      message: "تم إنشاء الحساب بنجاح. يرجى توثيق رقم الجوال قبل تسجيل الدخول.",
      userId: user._id,
      phone: user.phone || null,
      needsPhoneVerification: true,
    });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ error: err.message || "خطأ غير متوقع" });
  }
});

/* =========================
   إرسال كود SMS للتوثيق
========================= */
router.post("/send-sms-code", async (req, res) => {
  try {
    const { userId, phone } = req.body || {};
    if (!userId || !phone) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const normalized = normalizePhone(phone);
    user.phone = normalized;
    user.phoneVerified = false;

    const code = Math.floor(100000 + Math.random() * 900000);
    if (typeof user.setPhoneOTP === "function") {
      user.setPhoneOTP(code);
    } else {
      await setPhoneOTPOnUser(user, code);
    }
    await user.save();

    const sms = await sendSMS({
      to: normalized,
      msg: `رمز التوثيق: ${code} - صالح لـ 5 دقائق`,
    });
    if (!sms.ok) {
      return res
        .status(502)
        .json({ message: "فشل إرسال الرسالة", raw: sms.raw });
    }

    return res.json({ ok: true, message: "تم إرسال الرمز بنجاح" });
  } catch (err) {
    console.error("send-sms-code error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   التحقق من كود SMS للتوثيق
========================= */
router.post("/verify-sms", async (req, res) => {
  try {
    const { userId, code } = req.body || {};
    if (!userId || !code)
      return res.status(400).json({ message: "بيانات ناقصة" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (user.phoneVerified)
      return res.json({ ok: true, message: "الهاتف موثق مسبقًا" });

    if (user.phoneVerificationAttempts >= 6) {
      return res
        .status(429)
        .json({ message: "تجاوزت حد المحاولات. اطلب رمزًا جديدًا" });
    }

    user.phoneVerificationAttempts += 1;

    let ok = false;
    if (typeof user.checkPhoneOTP === "function") {
      ok = user.checkPhoneOTP(code);
    } else {
      ok = await checkPhoneOTPOnUser(user, code);
    }

    if (!ok) {
      await user.save();
      return res.status(400).json({ message: "رمز غير صحيح أو منتهي" });
    }

    user.phoneVerified = true;
    user.phoneVerificationCodeHash = undefined;
    user.phoneVerificationExpires = undefined;
    user.phoneVerificationAttempts = 0;

    await user.save();

    return res.json({ ok: true, message: "تم توثيق رقم الهاتف بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   تسجيل الدخول
========================= */
router.post("/login", async (req, res) => {
  try {
    const { phone, email, password } = req.body || {};
    if ((!phone && !email) || !password) {
      return res
        .status(400)
        .json({ message: "أدخل رقم الجوال أو البريد مع كلمة المرور" });
    }

    const query = phone
      ? { phone: normalizePhone(phone) }
      : { email: String(email).toLowerCase() };
    const user = await User.findOne(query);
    if (!user)
      return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "كلمة المرور خاطئة" });

    if (!user.phoneVerified) {
      // 🔴 مهم: نرجع userId و phone لتسهيل تحويل الواجهة لصفحة التوثيق
      return res.status(403).json({
        message: "يجب توثيق رقم الجوال قبل تسجيل الدخول",
        userId: user._id,
        phone: user.phone || null,
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email || null,
        role: user.role,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   نسيت كلمة المرور — طلب كود
========================= */
router.post("/password/request-reset", async (req, res) => {
  try {
    const { phone, email } = req.body || {};
    if (!phone && !email) {
      return res.status(400).json({ message: "أدخل البريد أو رقم الجوال" });
    }

    const query = phone
      ? { phone: normalizePhone(phone) }
      : { email: String(email).toLowerCase() };
    const user = await User.findOne(query);
    if (!user) {
      // لأسباب أمنية: لا نفصح إن كان المستخدم موجودًا أو لا
      return res.json({
        ok: true,
        message: "إن وُجد حساب سيتم إرسال كود إليه",
      });
    }

    if (!user.phone) {
      return res.json({
        ok: true,
        message: "إن وُجد حساب سيتم إرسال كود إليه",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000);
    await setResetOTPOnUser(user, code);
    await user.save();

    const sms = await sendSMS({
      to: user.phone,
      msg: `إعادة تعيين كلمة المرور: ${code} - صالح لـ 5 دقائق`,
    });
    if (!sms.ok) {
      return res.json({ ok: true, message: "تم الإجراء، تحقق من هاتفك" });
    }

    return res.json({
      ok: true,
      message: "تم إرسال كود إعادة التعيين إن كان الحساب موجودًا",
      userId: user._id, // لمساعدة الواجهة في تعبئة الحقل
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   نسيت كلمة المرور — تعيين كلمة جديدة
========================= */
router.post("/password/reset", async (req, res) => {
  try {
    const { userId, code, newPassword } = req.body || {};
    if (!userId || !code || !newPassword) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    if (user.resetPasswordAttempts > 6) {
      return res.status(429).json({ message: "تجاوزت حد المحاولات" });
    }

    const valid = await checkResetOTPOnUser(user, code);
    if (!valid) {
      await user.save();
      return res.status(400).json({ message: "رمز غير صحيح أو منتهي" });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.resetPasswordCodeHash = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;

    await user.save();
    return res.json({ ok: true, message: "تم تحديث كلمة المرور بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
