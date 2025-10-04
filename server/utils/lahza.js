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
  resolveMinorAmount,
};
