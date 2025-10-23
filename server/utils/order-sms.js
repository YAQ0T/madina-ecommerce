const { ensureLocalizedObject } = require("./localized");
const { sendSMSHTD, normalizePhone } = require("./sms");

const DEFAULT_PAY_CURRENCY = process.env.PAY_CURRENCY || "ILS";
const MAX_SMS_ITEMS = 4;
const ADDRESS_SMS_MAX_LENGTH = 70;

const CARD_TYPE_LABELS = {
  visa: "فيزا",
  mastercard: "ماستركارد",
  master: "ماستركارد",
  maestro: "مايسترو",
  amex: "أمريكان إكسبريس",
  americanexpress: "أمريكان إكسبريس",
  diners: "داينرز كلوب",
  dinersclub: "داينرز كلوب",
  discover: "ديسكفر",
  jcb: "جي سي بي",
  mada: "مدى",
  unionpay: "يونيون باي",
};

const CARD_METHOD_KEYWORDS = [
  "card",
  "credit",
  "debit",
  "visa",
  "master",
  "mada",
  "amex",
  "americanexpress",
  "diners",
  "discover",
  "jcb",
  "unionpay",
];

function normalizePaymentMethod(method) {
  if (method == null) return "";
  return String(method).trim().toLowerCase();
}

function simplifyPaymentMethod(method) {
  if (method == null) return "";
  return String(method).replace(/[^a-z]/gi, "").toLowerCase();
}

function isCardPaymentMethod(method) {
  const normalized = normalizePaymentMethod(method);
  if (!normalized) return false;

  const simplified = simplifyPaymentMethod(method);
  if (!simplified) return false;

  if (simplified === "card") return true;
  if (simplified === "creditcard" || simplified === "debitcard") return true;

  return CARD_METHOD_KEYWORDS.some((keyword) =>
    normalized.includes(keyword) || simplified.includes(keyword)
  );
}

function isCodPaymentMethod(method) {
  const normalized = normalizePaymentMethod(method);
  if (!normalized) return false;

  const simplified = simplifyPaymentMethod(normalized);
  if (simplified === "cod") return true;

  if (normalized.includes("cash") && normalized.includes("delivery")) {
    return true;
  }

  return false;
}

const toDisplayName = (raw) => {
  const normalized = ensureLocalizedObject(raw);
  return normalized.ar || normalized.he || "منتج";
};

function truncateText(text, maxLength) {
  if (!text) return "";
  const value = String(text);
  if (value.length <= maxLength) return value;
  const sliceEnd = Math.max(0, maxLength - 1);
  return `${value.slice(0, sliceEnd).trimEnd()}…`;
}

function formatOrderTotal(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "0";
  const rounded = Math.round(numeric * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2);
}

function formatOrderItemsForSms(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, MAX_SMS_ITEMS).map((item) => {
    const name = truncateText(toDisplayName(item?.name), 32);
    const qty = Math.max(1, parseInt(item?.quantity, 10) || 1);
    const suffix = qty > 1 ? ` x${qty}` : "";
    return `• ${name}${suffix}`;
  });
}

function describePaymentMethod(method) {
  if (!method) return "";
  const normalized = normalizePaymentMethod(method);
  if (!normalized) return "";

  if (isCardPaymentMethod(normalized)) {
    return "الدفع بالبطاقة";
  }

  if (isCodPaymentMethod(normalized)) {
    return "الدفع عند التوصيل";
  }

  return String(method);
}

function translateCardTypeForSms(cardType) {
  if (cardType == null) return "";
  const raw = String(cardType).trim();
  if (!raw) return "";
  if (/[ء-ي]/.test(raw)) return raw;
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  return CARD_TYPE_LABELS[key] || raw;
}

function formatCardLast4ForSms(last4) {
  if (last4 == null) return "";
  const digits = String(last4).replace(/\D/g, "").slice(-4);
  if (!digits) return "";
  return `****${digits}`;
}

function formatOrderDateForSms(createdAt) {
  if (!createdAt) return "";
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hrs = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${y}-${m}-${d} ${hrs}:${mins}`;
}

function buildOrderSmsMessage({
  orderId,
  items,
  total,
  currency,
  address,
  paymentMethod,
  paymentCardType,
  paymentCardLast4,
  orderCreatedAt,
}) {
  if (!orderId) return "";
  const lines = [`شكراً لطلبك من ديكوري!`, `رقم الطلب: ${orderId}`];

  const itemLines = formatOrderItemsForSms(items);
  if (itemLines.length) {
    lines.push("المنتجات:");
    lines.push(...itemLines);
    if (Array.isArray(items) && items.length > MAX_SMS_ITEMS) {
      const remaining = items.length - MAX_SMS_ITEMS;
      if (remaining === 1) {
        lines.push("و1 منتج إضافي...");
      } else if (remaining > 1) {
        lines.push(`و${remaining} منتجات إضافية...`);
      }
    }
  }

  const safeCurrency = currency || DEFAULT_PAY_CURRENCY;
  lines.push(`الإجمالي: ${formatOrderTotal(total)} ${safeCurrency}`);

  const trimmedAddress = truncateText(String(address || "").trim(), ADDRESS_SMS_MAX_LENGTH);
  if (trimmedAddress) {
    lines.push(`العنوان: ${trimmedAddress}`);
  }

  const methodDescription = describePaymentMethod(paymentMethod);
  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  const cardTypeText = translateCardTypeForSms(paymentCardType);
  const last4Text = formatCardLast4ForSms(paymentCardLast4);
  const shouldIncludeCardDetails =
    isCardPaymentMethod(normalizedMethod) || cardTypeText || last4Text;

  if (methodDescription) {
    lines.push(`طريقة الدفع: ${methodDescription}`);
  }

  if (shouldIncludeCardDetails) {
    if (cardTypeText) {
      lines.push(`نوع البطاقة: ${cardTypeText}`);
    }
    if (last4Text) {
      lines.push(`آخر 4 أرقام من البطاقة: ${last4Text}`);
    }
  }

  const orderDateText = formatOrderDateForSms(orderCreatedAt);
  if (orderDateText) {
    lines.push(`تاريخ الطلب: ${orderDateText}`);
  }

  lines.push("سنتواصل معك لتأكيد الطلب.");
  return lines.join("\n");
}

function pickOrderPhone(userObj, guestObj) {
  if (userObj?.phone) return userObj.phone;
  if (guestObj?.phone) return guestObj.phone;
  return null;
}

function isLikelySmsPhone(phone) {
  if (typeof phone !== "string") return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9;
}

async function sendOrderConfirmationSMS({
  order,
  items,
  user,
  guest,
  overrides = {},
}) {
  if (!order || !order._id) return;

  const paymentMethod = overrides.paymentMethod || order.paymentMethod;
  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  const paymentStatus = (overrides.paymentStatus || order.paymentStatus || "")
    .toString()
    .trim()
    .toLowerCase();
  const paymentCardType =
    overrides.paymentCardType ?? order.paymentCardType ?? null;
  const paymentCardLast4 =
    overrides.paymentCardLast4 ?? order.paymentCardLast4 ?? null;

  if (isCardPaymentMethod(normalizedMethod) && paymentStatus !== "paid") {
    return;
  }

  const candidatePhone = pickOrderPhone(user, guest);
  const normalizedPhone = normalizePhone(candidatePhone);
  if (!normalizedPhone || !isLikelySmsPhone(normalizedPhone)) {
    return;
  }

  const message = buildOrderSmsMessage({
    orderId: order._id,
    items: items || order.items,
    total: order.total,
    currency: order.paymentCurrency,
    address: order.address,
    paymentMethod,
    paymentCardType,
    paymentCardLast4,
    orderCreatedAt: order.createdAt,
  });

  if (!message) return;

  try {
    await sendSMSHTD(normalizedPhone, message, { label: "order_confirmation" });
  } catch (err) {
    console.error("Failed to send order confirmation SMS:", err?.message || err);
  }
}

module.exports = {
  toDisplayName,
  buildOrderSmsMessage,
  sendOrderConfirmationSMS,
};
