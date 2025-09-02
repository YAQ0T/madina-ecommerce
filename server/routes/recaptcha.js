// server/routes/recaptcha.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * POST /api/recaptcha/verify
 * Body: { token: string, expectedAction?: string, minScore?: number }
 * Response: { success: boolean, score?: number, action?: string, error?: string, errorCodes?: string[] }
 */
router.post("/verify", async (req, res) => {
  try {
    const token = req.body?.token;
    const expectedAction = req.body?.expectedAction; // مثال: "checkout"
    const minScore = Number(req.body?.minScore ?? 0.5); // افتراضي 0.5

    if (!token) {
      return res.status(400).json({ success: false, error: "MISSING_TOKEN" });
    }

    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ success: false, error: "SERVER_SECRET_NOT_CONFIGURED" });
    }

    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const { data } = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    if (!data?.success) {
      return res.status(400).json({
        success: false,
        error: "GOOGLE_VERIFICATION_FAILED",
        errorCodes: data?.["error-codes"] || [],
      });
    }

    // التحقق من الحد الأدنى للسكور (v3)
    if (typeof data?.score === "number" && data.score < minScore) {
      return res.status(400).json({
        success: false,
        error: "LOW_SCORE",
        score: data.score,
        action: data.action,
      });
    }

    // التحقق من الaction لو تم تمريره
    if (expectedAction && data?.action && data.action !== expectedAction) {
      return res.status(400).json({
        success: false,
        error: "UNEXPECTED_ACTION",
        score: data.score,
        action: data.action,
      });
    }

    return res.json({
      success: true,
      score: data?.score,
      action: data?.action,
    });
  } catch (err) {
    console.error("reCAPTCHA verify error:", err?.message || err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
