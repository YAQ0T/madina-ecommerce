// server/utils/sms.js
const axios = require("axios");
const qs = require("querystring");

const HTD_BASE =
  process.env.SMS_HTD_BASE || process.env.SMS_BASE || "http://sms.htd.ps/API";
const HTD_API_STYLE = String(
  process.env.SMS_HTD_API_STYLE || "auto"
).toLowerCase();

const SMS_USERNAME = process.env.SMS_USERNAME || process.env.SMS_USER || "";
const SMS_PASSWORD =
  process.env.SMS_PASSWORD ||
  process.env.SMS_PASS ||
  process.env.SMS_HTD_PASSWORD ||
  process.env.SMS_HTD_PASS ||
  "";

const SMS_SENDER =
  process.env.SMS_SENDER || process.env.SMS_HTD_SENDER || "SENDER";

const SMS_HTD_ID = process.env.SMS_HTD_ID || process.env.SMS_ID || "";

const SEND_SMS_ENABLED =
  String(process.env.SEND_SMS_ENABLED || "false").toLowerCase() === "true";

const DEV_ECHO_SMS =
  String(
    process.env.DEV_ECHO_SMS ||
      process.env.DEV_ECHO_OTP ||
      process.env.DEV_ECHO_SMS_MESSAGES ||
      "true"
  ).toLowerCase() === "true";

const DEFAULT_RECIPIENT_FORMAT =
  HTD_API_STYLE === "simple"
    ? "INT"
    : (process.env.SMS_RECIPIENT_FORMAT || "E164").toUpperCase();

function normalizePhone(phone) {
  if (!phone) return null;
  let p = String(phone).trim().replace(/\s+/g, "");
  p = p.replace(/[^\d+]/g, "");
  if (!p) return null;
  if (!p.startsWith("+")) p = p.replace(/^0+/, "");
  if (!p) return null;
  if (!p.startsWith("+")) p = "+970" + p;
  if (!p.startsWith("+")) p = "+" + p;
  return p;
}

function formatForProvider(e164Phone, preferFormat = DEFAULT_RECIPIENT_FORMAT) {
  if (!e164Phone) return null;
  const digits = e164Phone.replace(/^\+/, "");
  if (!digits) return null;
  if (preferFormat === "E164") return e164Phone;
  if (preferFormat === "INT") return digits;
  if (preferFormat === "LOCAL") {
    if (digits.startsWith("970")) {
      const rest = digits.slice(3);
      return rest ? `0${rest}` : null;
    }
    return `0${digits}`;
  }
  return digits;
}

function resolveApiStyle() {
  if (HTD_API_STYLE === "simple" || HTD_API_STYLE === "classic") {
    return HTD_API_STYLE;
  }
  if (SMS_HTD_ID && !SMS_USERNAME) return "simple";
  if (SMS_USERNAME || SMS_PASSWORD) return "classic";
  return "simple";
}

async function sendSMSHTD(to, text, options = {}) {
  if (!to || !text) return { ok: false, reason: "missing_to_or_text" };

  const normalized = normalizePhone(to);
  if (!normalized) return { ok: false, reason: "invalid_phone" };

  const style = resolveApiStyle();
  const preferFormat =
    options.preferFormat || (style === "simple" ? "INT" : DEFAULT_RECIPIENT_FORMAT);
  const providerRecipient = formatForProvider(normalized, preferFormat);
  if (!providerRecipient) return { ok: false, reason: "invalid_recipient" };

  if (!SEND_SMS_ENABLED) {
    if (DEV_ECHO_SMS) {
      const label = options.label ? `[${options.label}] ` : "";
      console.log(
        `[DEV SMS] ${label}To: ${normalized} (provider:${providerRecipient}) | Message: ${text}`
      );
    }
    return { ok: true, dev: true, style };
  }

  try {
    const base = HTD_BASE.replace(/\/+$/, "");
    const url = `${base}/SendSMS.aspx`;

    let payload;
    if (style === "simple") {
      payload = {
        id: SMS_HTD_ID,
        sender: SMS_SENDER,
        to: providerRecipient,
        msg: text,
      };
      if (!payload.id) {
        return { ok: false, reason: "missing_SMS_HTD_ID_for_simple_mode" };
      }
    } else {
      payload = {
        SenderName: SMS_SENDER,
        Recipients: providerRecipient,
        Message: text,
      };
      if (SMS_USERNAME) payload.UserName = SMS_USERNAME;
      if (SMS_PASSWORD) payload.Password = SMS_PASSWORD;
    }

    const full = `${url}?${qs.stringify(payload)}`;
    const res = await axios.get(full, { timeout: options.timeoutMs || 15000 });

    console.log(
      `[HTD SMS] style=${style} status=${res.status} data=`,
      res.data
    );

    return { ok: true, style, status: res.status, data: res.data };
  } catch (err) {
    console.error(
      "[HTD SMS] Error:",
      err?.response?.status,
      err?.response?.data || err?.message
    );
    return { ok: false, reason: err?.message || "send_failed", error: err };
  }
}

async function getCredit() {
  if (!SMS_HTD_ID) throw new Error("Missing SMS_HTD_ID env");
  const base = HTD_BASE.replace(/\/+$/, "");
  const url = `${base}/GetCredit.aspx?id=${encodeURIComponent(SMS_HTD_ID)}`;
  const { data, status } = await axios.get(url, { timeout: 10000 });
  return { ok: status === 200, raw: data };
}

module.exports = {
  sendSMSHTD,
  getCredit,
  normalizePhone,
  formatForProvider,
};
