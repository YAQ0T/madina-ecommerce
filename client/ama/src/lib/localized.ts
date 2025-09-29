import type { SupportedLocale } from "@/context/LanguageContext";

export type LocalizedText =
  | string
  | null
  | undefined
  | {
      ar?: string | null;
      he?: string | null;
    };

export type LocalizedObject = {
  ar: string;
  he: string;
};

export const emptyLocalized: LocalizedObject = { ar: "", he: "" };

const trimOrEmpty = (value: string | null | undefined) =>
  value ? value.toString().trim() : "";

export const ensureLocalizedObject = (
  value: LocalizedText
): LocalizedObject => {
  if (!value) {
    return { ...emptyLocalized };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return { ar: trimmed, he: "" };
  }

  return {
    ar: trimOrEmpty(value.ar),
    he: trimOrEmpty(value.he),
  };
};

export const getLocalizedText = (
  value: LocalizedText,
  locale: SupportedLocale,
  fallbackLocale: SupportedLocale = "ar"
): string => {
  const normalized = ensureLocalizedObject(value);
  const primary = normalized[locale]?.trim();
  if (primary) {
    return primary;
  }

  const fallback = normalized[fallbackLocale]?.trim();
  if (fallback) {
    return fallback;
  }

  const alternative = locale === "ar" ? normalized.he : normalized.ar;
  return alternative.trim();
};
