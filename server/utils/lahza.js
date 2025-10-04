// server/utils/lahza.js
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
  for (const candidate of candidates) {
    const num = toNumber(candidate);
    if (num === null) continue;
    // Lahza amounts are returned in the smallest currency unit.
    return Math.round(num);
  }
  return null;
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
  const amountMinor = normalizeMinorAmount(
    raw.amount_minor,
    raw.amountMinor,
    raw.amount,
    metadata.amountMinor,
    metadata.expectedAmountMinor
  );

  return {
    status: String(raw.status || "").toLowerCase(),
    amountMinor,
    currency: extractCurrency(raw, metadata),
    metadata,
    transactionId: extractTransactionId(raw),
  };
}

module.exports = {
  normalizeMinorAmount,
  parseMetadata,
  mapVerificationPayload,
};
