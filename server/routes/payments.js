// server/routes/payments.js
const express = require("express");
const axios = require("axios");
const { verifyToken } = require("../middleware/authMiddleware");
const Order = require("../models/Order");

const router = express.Router();

const LAHZA_SECRET_KEY = process.env.LAHZA_SECRET_KEY || "";

/** تقسيم الاسم الكامل */
function splitName(fullName = "") {
  const s = String(fullName || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return { first_name: "", last_name: "" };
  const parts = s.split(" ");
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.slice(-1)[0],
  };
}

/**
 * POST /api/payments/create
 * body: {
 *   orderId, amountMinor, currency, email, name, mobile, callback_url, metadata?
 * }
 * - يهيّئ معاملة على Lahza ويرجع authorization_url + reference
 * - يربط reference بالطلب orderId مباشرة بعد نجاح initialize
 */
router.post("/create", verifyToken, async (req, res) => {
  try {
    if (!LAHZA_SECRET_KEY) {
      return res.status(500).json({ error: "LAHZA secret key is missing" });
    }

    const {
      orderId,
      amountMinor,
      currency,
      email,
      name,
      mobile,
      callback_url,
      metadata = {},
    } = req.body || {};

    if (!amountMinor || !currency || !callback_url) {
      return res
        .status(400)
        .json({ error: "amountMinor, currency, callback_url are required" });
    }

    // (اختياري) تأكيد orderId مبدئيًا
    let orderDoc = null;
    if (orderId) {
      if (!orderId || !/^[a-f\d]{24}$/i.test(orderId)) {
        return res.status(400).json({ error: "orderId غير صالح" });
      }
      orderDoc = await Order.findById(orderId).lean();
      if (!orderDoc) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
    }

    const { first_name, last_name } = splitName(name);

    const payload = {
      amount: amountMinor,
      currency,
      email,
      mobile,
      first_name,
      last_name,
      callback_url,
      metadata: Object.keys(metadata || {}).length
        ? JSON.stringify(metadata)
        : undefined,
    };

    const resp = await axios.post(
      "https://api.lahza.io/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${LAHZA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const data = resp?.data?.data || {};
    const authorization_url = data?.authorization_url;
    const reference = data?.reference || data?.ref;

    if (!authorization_url || !reference) {
      return res.status(502).json({
        error: "Missing authorization_url/reference from Lahza",
        raw: resp?.data,
      });
    }

    // ✅ ربط reference بالطلب إن وُجد orderId
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          paymentStatus: "paid", // حالة الدفع تصبح "مدفوع"
          reference,
        },
      }).lean();
    }

    return res.json({ authorization_url, reference });
  } catch (err) {
    return res.status(500).json({
      error: "Could not create transaction",
      details: err?.response?.data || err.message,
    });
  }
});

/**
 * GET /api/payments/status/:reference
 * يتحقق من حالة معاملة عبر Verify API
 */
router.get("/status/:reference", async (req, res) => {
  try {
    if (!LAHZA_SECRET_KEY) {
      return res.status(500).json({ error: "LAHZA secret key is missing" });
    }
    const reference = req.params.reference;
    const url = `https://api.lahza.io/transaction/verify/${encodeURIComponent(
      reference
    )}`;

    const resp = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${LAHZA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    return res.json(resp.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || {
      error: err.message || "Verify failed",
    };
    return res.status(status).json(data);
  }
});

module.exports = router;
