// src/lib/discounts.ts
export type DiscountRule = {
  threshold: number;
  type: "percent" | "fixed";
  value: number;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  priority?: number;
};

const isRuleActiveNow = (r: DiscountRule) => {
  const now = Date.now();
  const startOK = !r.startAt || new Date(r.startAt).getTime() <= now;
  const endOK = !r.endAt || new Date(r.endAt).getTime() >= now;
  return (r.isActive ?? true) && startOK && endOK;
};

/**
 * تقدير الخصم محليًا قبل إنشاء الطلب (اختياري).
 * يُفضّل الاعتماد على قيمة السيرفر النهائية بعد إنشاء الطلب.
 */
export const estimateDiscount = (subtotal: number, rules: DiscountRule[]) => {
  const valid = rules.filter(
    (r) => isRuleActiveNow(r) && r.threshold <= subtotal
  );
  if (valid.length === 0)
    return { amount: 0, rule: null as DiscountRule | null };

  valid.sort(
    (a, b) => b.threshold - a.threshold || (b.priority || 0) - (a.priority || 0)
  );
  const rule = valid[0];
  const amount =
    rule.type === "percent"
      ? Math.max(0, (subtotal * rule.value) / 100)
      : Math.max(0, Math.min(rule.value, subtotal));

  return { amount, rule };
};
