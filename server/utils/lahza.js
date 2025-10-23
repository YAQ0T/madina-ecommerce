// server/utils/lahza.js
const axios = require("axios");

const LAHZA_SECRET_KEY = process.env.LAHZA_SECRET_KEY || "";
// Minor-unit tolerance (e.g., 1 = allow 0.01 currency unit difference)
const ENV_MINOR_TOLERANCE = Number(process.env.PAYMENT_MINOR_TOLERANCE);
const MINOR_AMOUNT_TOLERANCE = Number.isFinite(ENV_MINOR_TOLERANCE)
  ? Math.max(0, Math.round(ENV_MINOR_TOLERANCE))
  : 1;

const CARD_TYPE_TRANSLATIONS = {
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

function toStringValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

function getNestedValue(source, path) {
  if (!source || typeof source !== "object") return undefined;
  const segments = Array.isArray(path)
    ? path
    : String(path)
        .split(".")
        .map((seg) => seg.trim())
        .filter(Boolean);
  let current = source;
  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    if (!(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function pickFirstNonEmptyString(sources = [], paths = []) {
  for (const source of sources) {
    if (!source) continue;
    for (const path of paths) {
      const value = getNestedValue(source, path);
      if (value == null) continue;
      const str = toStringValue(value).trim();
      if (str) {
        return str;
      }
    }
  }
  return "";
}

function normalizeCardType(value) {
  const str = toStringValue(value).trim();
  if (!str) return "";
  if (/[ء-ي]/.test(str)) return str; // Already localized
  const normalizedKey = str.toLowerCase().replace(/[^a-z]/g, "");
  if (normalizedKey && CARD_TYPE_TRANSLATIONS[normalizedKey]) {
    return CARD_TYPE_TRANSLATIONS[normalizedKey];
  }
  return str;
}

function normalizeCardLast4(value) {
  const digits = toStringValue(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-4);
}

function extractCardDetails(...rawSources) {
  const sources = [];
  for (const candidate of rawSources) {
    if (!candidate) continue;
    sources.push(candidate);
    if (candidate.card && typeof candidate.card === "object") {
      sources.push(candidate.card);
    }
    if (candidate.payment_method && typeof candidate.payment_method === "object") {
      sources.push(candidate.payment_method);
    }
    if (
      candidate.payment_method_details &&
      typeof candidate.payment_method_details === "object"
    ) {
      sources.push(candidate.payment_method_details);
    }
  }

  const typeRaw = pickFirstNonEmptyString(sources, [
    ["card", "type"],
    ["card", "brand"],
    "card_type",
    "cardType",
    "card_brand",
    "cardBrand",
    ["payment_method", "card", "type"],
    ["payment_method", "card", "brand"],
    ["payment_method_details", "card", "type"],
    ["payment_method_details", "card", "brand"],
    ["payment_method_details", "brand"],
    "cardScheme",
    "card_scheme",
  ]);

  const last4Raw = pickFirstNonEmptyString(sources, [
    ["card", "last4"],
    ["card", "last_digits"],
    "card_last4",
    "cardLast4",
    "card_last_digits",
    "cardLastDigits",
    "last4",
    ["payment_method", "card", "last4"],
    ["payment_method_details", "card", "last4"],
    ["payment_method_details", "card", "last_digits"],
  ]);

  return {
    cardType: normalizeCardType(typeRaw),
    cardLast4: normalizeCardLast4(last4Raw),
  };
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeMinorAmount(...candidates) {
  return resolveMinorAmount({ candidates });
}

function resolveMinorAmount({ candidates = [], expectedMinor = null } = {}) {
  const normalizedCandidates = [];
  for (const candidate of candidates) {
    const num = toNumber(candidate);
    if (num === null) continue;
    normalizedCandidates.push(num);
  }

  const expectedValue = toNumber(expectedMinor);
  const normalizedExpected =
    expectedValue !== null && Number.isFinite(expectedValue)
      ? Math.round(expectedValue)
      : null;

  if (normalizedExpected !== null) {
    for (const num of normalizedCandidates) {
      if (Math.round(num) === normalizedExpected) {
        return normalizedExpected;
      }
    }

    for (const num of normalizedCandidates) {
      const scaledUp = Math.round(num * 100);
      if (scaledUp === normalizedExpected) {
        return scaledUp;
      }
    }

    for (const num of normalizedCandidates) {
      const scaledDown = Math.round(num / 100);
      if (scaledDown === normalizedExpected) {
        return normalizedExpected;
      }
    }
  }

  if (normalizedCandidates.length) {
    return Math.round(normalizedCandidates[0]);
  }

  return normalizedExpected;
}

function parseMetadata(raw) {
  if (!raw) return {};
  if (typeof raw === "object") {
    return raw;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  }
  return {};
}

function extractCurrency(data = {}, metadata = {}) {
  const value =
    data.currency ||
    data.currency_code ||
    data.currencyCode ||
    metadata.currency ||
    metadata.expectedCurrency ||
    "";
  return typeof value === "string" ? value.trim() : "";
}

function extractTransactionId(data = {}) {
  return (
    data.id ||
    data.transaction_id ||
    data.transactionId ||
    data.txn_id ||
    data.reference ||
    data.ref ||
    null
  );
}

function mapVerificationPayload(raw = {}) {
  const metadata = parseMetadata(raw.metadata);
  const expectedMinor = resolveMinorAmount({
    candidates: [metadata.expectedAmountMinor, metadata.amountMinor],
  });
  const amountMinor = resolveMinorAmount({
    candidates: [
      raw.amount_minor,
      raw.amountMinor,
      raw.amount,
      metadata.amountMinor,
      metadata.expectedAmountMinor,
    ],
    expectedMinor,
  });

  const { cardType, cardLast4 } = extractCardDetails(
    raw,
    metadata,
    raw?.card,
    raw?.payment_method,
    raw?.payment_method_details
  );

  return {
    status: String(raw.status || "").toLowerCase(),
    amountMinor,
    currency: extractCurrency(raw, metadata),
    metadata,
    transactionId: extractTransactionId(raw),
    cardType,
    cardLast4,
  };
}

async function verifyLahzaTransaction(reference) {
  if (!LAHZA_SECRET_KEY) {
    const err = new Error("LAHZA_SECRET_KEY is not configured");
    err.code = "NO_SECRET";
    throw err;
  }

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

  const rawResponse = resp?.data || {};
  const raw = rawResponse?.data || {};
  const payload = mapVerificationPayload(raw);

  return { ...payload, raw, response: rawResponse };
}

function prepareLahzaPaymentUpdate({
  order = {},
  verification = {},
  eventPayload = null,
  tolerance = MINOR_AMOUNT_TOLERANCE,
} = {}) {
  const eventMetadata = parseMetadata(eventPayload?.metadata);
  const eventSnapshot = mapVerificationPayload({
    ...(eventPayload ? eventPayload : {}),
    metadata: eventMetadata,
  });

  const verificationExpected = resolveMinorAmount({
    candidates: [
      verification?.metadata?.expectedAmountMinor,
      verification?.metadata?.amountMinor,
    ],
  });
  const eventExpected = resolveMinorAmount({
    candidates: [
      eventSnapshot?.metadata?.expectedAmountMinor,
      eventSnapshot?.metadata?.amountMinor,
      eventMetadata?.expectedAmountMinor,
      eventMetadata?.amountMinor,
    ],
  });

  const orderExpectedMinor = Math.round(Number(order.total || 0) * 100);
  const expectedHint = Number.isFinite(verificationExpected)
    ? verificationExpected
    : Number.isFinite(eventExpected)
    ? eventExpected
    : orderExpectedMinor;

  const amountMinor = resolveMinorAmount({
    candidates: [
      verification?.amountMinor,
      eventSnapshot?.amountMinor,
      eventPayload?.amount_minor,
      eventPayload?.amountMinor,
      eventPayload?.amount,
      verification?.metadata?.amountMinor,
      verification?.metadata?.expectedAmountMinor,
      eventMetadata?.amountMinor,
      eventMetadata?.expectedAmountMinor,
    ],
    expectedMinor: expectedHint,
  });

  const verifiedCurrency = (
    verification?.currency || eventSnapshot?.currency || ""
  )
    .toString()
    .trim()
    .toUpperCase();

  const storedCurrency = (order.paymentCurrency || "").toString().trim().toUpperCase();
  const fallbackCurrency = (eventMetadata?.expectedCurrency || "")
    .toString()
    .trim()
    .toUpperCase();
  const expectedCurrency = storedCurrency || fallbackCurrency;

  const expectedMinor = orderExpectedMinor;
  const amountDelta =
    typeof amountMinor === "number" && Number.isFinite(amountMinor)
      ? Math.abs(amountMinor - expectedMinor)
      : null;
  const amountMatches =
    typeof amountMinor === "number" && Number.isFinite(amountMinor)
      ? amountDelta <= tolerance
      : false;
  const currencyMatches =
    !expectedCurrency || !verifiedCurrency
      ? true
      : verifiedCurrency === expectedCurrency;

  const amountForStorage =
    typeof amountMinor === "number" && Number.isFinite(amountMinor)
      ? Number((amountMinor / 100).toFixed(2))
      : null;
  const transactionId =
    verification?.transactionId || eventSnapshot?.transactionId || null;

  const successSet = {
    paymentStatus: "paid",
    status: "waiting_confirmation",
  };
  if (amountForStorage !== null) successSet.paymentVerifiedAmount = amountForStorage;
  if (verifiedCurrency) successSet.paymentVerifiedCurrency = verifiedCurrency;
  if (transactionId) successSet.paymentTransactionId = String(transactionId);
  if (!storedCurrency && verifiedCurrency) {
    successSet.paymentCurrency = verifiedCurrency;
  }

  const mismatchSet = {};
  if (amountForStorage !== null)
    mismatchSet.paymentVerifiedAmount = amountForStorage;
  if (verifiedCurrency) mismatchSet.paymentVerifiedCurrency = verifiedCurrency;
  if (transactionId) mismatchSet.paymentTransactionId = String(transactionId);

  const { cardType, cardLast4 } = extractCardDetails(
    verification,
    verification?.raw,
    verification?.metadata,
    eventSnapshot,
    eventMetadata,
    eventPayload
  );

  if (cardType) {
    successSet.paymentCardType = cardType;
    mismatchSet.paymentCardType = cardType;
  }
  if (cardLast4) {
    successSet.paymentCardLast4 = cardLast4;
    mismatchSet.paymentCardLast4 = cardLast4;
  }

  return {
    amountMatches,
    currencyMatches,
    amountMinor,
    expectedMinor,
    amountDelta,
    toleranceMinor: tolerance,
    verifiedCurrency,
    expectedCurrency,
    amountForStorage,
    transactionId,
    successSet,
    mismatchSet,
  };
}

module.exports = {
  normalizeMinorAmount,
  parseMetadata,
  mapVerificationPayload,
  resolveMinorAmount,
  verifyLahzaTransaction,
  prepareLahzaPaymentUpdate,
  MINOR_AMOUNT_TOLERANCE,
};
