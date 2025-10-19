const PRIVILEGED_STOCK_ROLES = new Set(["admin", "dealer"]);

function normalizeFlag(value) {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

function parseBooleanFlag(value, defaultValue) {
  if (value == null) return defaultValue;
  const normalized = normalizeFlag(value);
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "on", "enable", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "disable", "disabled"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

const STOCK_TRACKING_ENABLED = parseBooleanFlag(
  process.env.STOCK_TRACKING_ENABLED,
  false
);

function isStockTrackingEnabled() {
  return STOCK_TRACKING_ENABLED;
}

function canRoleViewStock(role) {
  if (!role) return false;
  const normalized = normalizeFlag(role);
  return PRIVILEGED_STOCK_ROLES.has(normalized);
}

function sanitizeVariantForRole(variant, role) {
  if (!variant) return variant;
  if (canRoleViewStock(role)) return variant;

  const sanitized = { ...variant };

  if (sanitized.stock && typeof sanitized.stock === "object") {
    const stock = { ...sanitized.stock };
    if (Object.prototype.hasOwnProperty.call(stock, "inStock")) {
      delete stock.inStock;
    }
    sanitized.stock = stock;
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, "totalStock")) {
    delete sanitized.totalStock;
  }

  return sanitized;
}

function sanitizeVariantListForRole(list, role) {
  if (!Array.isArray(list)) return [];
  return list.map((variant) => sanitizeVariantForRole(variant, role));
}

function sanitizeProductForRole(product, role) {
  if (!product) return product;
  if (canRoleViewStock(role)) return product;

  if (!Object.prototype.hasOwnProperty.call(product, "totalStock")) {
    return product;
  }

  const { totalStock, ...rest } = product;
  return rest;
}

function sanitizeProductListForRole(list, role) {
  if (!Array.isArray(list)) return [];
  return list.map((product) => sanitizeProductForRole(product, role));
}

module.exports = {
  isStockTrackingEnabled,
  canRoleViewStock,
  sanitizeVariantForRole,
  sanitizeVariantListForRole,
  sanitizeProductForRole,
  sanitizeProductListForRole,
};
