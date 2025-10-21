export type VariantDiscount = {
  type?: "percent" | "amount";
  value?: number | null;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
} | null;

export type VariantLike = {
  finalAmount?: number | null;
  displayCompareAt?: number | null;
  isDiscountActive?: boolean | null;
  price?: {
    amount?: number | null;
    compareAt?: number | null;
    discount?: VariantDiscount;
  } | null;
};

export type VariantPricing = {
  finalPrice: number | null;
  comparePrice: number | null;
  hasActiveDiscount: boolean;
  discountPercent: number | null;
  discountAmount: number | null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const isDiscountWindowActive = (discount?: VariantDiscount): boolean => {
  if (!discount) return true;
  const { startAt, endAt } = discount as {
    startAt?: string | Date | null;
    endAt?: string | Date | null;
  };

  const startMs = startAt ? new Date(startAt).getTime() : null;
  const endMs = endAt ? new Date(endAt).getTime() : null;

  const now = Date.now();

  if (startMs !== null && Number.isFinite(startMs) && now < startMs) {
    return false;
  }

  if (endMs !== null && Number.isFinite(endMs) && now >= endMs) {
    return false;
  }

  return true;
};

export const resolveVariantPricing = (
  variant?: VariantLike | null
): VariantPricing => {
  const baseAmount = toNumberOrNull(variant?.price?.amount);
  const finalAmount =
    toNumberOrNull(variant?.finalAmount) ??
    (variant?.isDiscountActive ? baseAmount : null) ??
    baseAmount;

  const compareAt =
    toNumberOrNull(variant?.displayCompareAt) ??
    toNumberOrNull(variant?.price?.compareAt) ??
    baseAmount;

  const hasDiscountNumbers =
    finalAmount !== null &&
    compareAt !== null &&
    compareAt > 0 &&
    finalAmount < compareAt;

  const discountActiveFlag = variant?.isDiscountActive;
  const windowActive = isDiscountWindowActive(variant?.price?.discount ?? undefined);

  const hasActiveDiscount = Boolean(
    (discountActiveFlag == null ? hasDiscountNumbers : discountActiveFlag) &&
      hasDiscountNumbers &&
      windowActive
  );

  const discountAmount =
    hasDiscountNumbers && finalAmount !== null && compareAt !== null
      ? compareAt - finalAmount
      : null;

  const discountPercent =
    hasDiscountNumbers && compareAt !== null && discountAmount !== null && compareAt > 0
      ? Math.round((discountAmount / compareAt) * 100)
      : null;

  return {
    finalPrice: finalAmount,
    comparePrice: compareAt,
    hasActiveDiscount,
    discountPercent: hasActiveDiscount ? discountPercent : null,
    discountAmount: hasActiveDiscount ? discountAmount : null,
  };
};

export const compareVariantsByDiscount = <T extends VariantLike>(
  variants: T[]
): T | null => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  let bestVariant: T | null = null;
  let bestScore = -Infinity;

  variants.forEach((variant, index) => {
    const pricing = resolveVariantPricing(variant);

    const hasDiscount = pricing.hasActiveDiscount && pricing.discountAmount !== null;
    const percent = pricing.discountPercent ?? 0;
    const amount = pricing.discountAmount ?? 0;

    const score = hasDiscount ? percent * 1000 + amount : -index - 1;

    if (score > bestScore) {
      bestVariant = variant;
      bestScore = score;
    }
  });

  return bestVariant ?? variants[0] ?? null;
};
