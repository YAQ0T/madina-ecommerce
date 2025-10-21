import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import QuantityInput from "@/components/common/QuantityInput";
import { useCart } from "@/context/CartContext";
import { useFavorites, type FavoriteProduct } from "@/context/FavoritesContext";
import { getLocalizedText, type LocalizedObject } from "@/lib/localized";
import { getColorLabel } from "@/lib/colors";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/i18n";
import clsx from "clsx";
import { Heart } from "lucide-react";

type Variant = {
  _id: string;
  product: string;
  measure: string;
  measureUnit?: string; // ✅ جديد
  measureSlug: string;
  color: { name: string; code?: string; images?: string[] };
  colorSlug: string;
  price: {
    amount: number;
    compareAt?: number;
    discount?: {
      type?: "percent" | "amount";
      value?: number;
      startAt?: string;
      endAt?: string;
    };
  };
  stock: { inStock: number; sku: string };
  tags: string[];
  finalAmount?: number;
  isDiscountActive?: boolean;
  displayCompareAt?: number | null;
};

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

type TimeUnit = "days" | "hours" | "minutes" | "seconds";

const formatTimeLeft = (
  ms: number
): { expired: boolean; parts: { unit: TimeUnit; value: number }[] } => {
  if (ms <= 0) return { expired: true, parts: [] };

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return {
      expired: false,
      parts: [
        { unit: "days", value: days },
        { unit: "hours", value: hours },
        { unit: "minutes", value: minutes },
      ],
    };
  }

  if (hours > 0) {
    return {
      expired: false,
      parts: [
        { unit: "hours", value: hours },
        { unit: "minutes", value: minutes },
        { unit: "seconds", value: seconds },
      ],
    };
  }

  return {
    expired: false,
    parts: [
      { unit: "minutes", value: minutes },
      { unit: "seconds", value: seconds },
    ],
  };
};

const normalize = (s?: string) =>
  (s || "").trim().replace(/\s+/g, "").toLowerCase();
const isUnified = (s?: string) => normalize(s) === normalize("موحد");

/** ✅ يُرجع دائمًا مصفوفة المتغيّرات سواء كانت الاستجابة {items:[]} أو [] مباشرة */
function normalizeVariantsResponse(data: any): Variant[] {
  if (data && Array.isArray(data.items)) return data.items as Variant[];
  if (Array.isArray(data)) return data as Variant[];
  return [];
}

const ProductDetails: React.FC = () => {
  const { addToCart } = useCart();
  const { id } = useParams();
  const { locale } = useLanguage();
  const { t } = useTranslation();

  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favoritePayload = useMemo<FavoriteProduct | null>(
    () =>
      product
        ? {
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price ?? 0,
            images: product.images,
            subCategory: product.subCategory,
          }
        : null,
    [product]
  );
  const isFavoriteProduct = product?._id ? isFavorite(product._id) : false;
  const handleToggleFavorite = useCallback(() => {
    if (!favoritePayload) return;
    toggleFavorite(favoritePayload);
  }, [favoritePayload, toggleFavorite]);

  const [currentImage, setCurrentImage] = useState(0);

  const [measure, setMeasure] = useState<string>("");
  const [color, setColor] = useState<string>("");

  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [showDiscountTimer, setShowDiscountTimer] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const productName = useMemo(
    () => getLocalizedText(product?.name, locale) || "",
    [product?.name, locale]
  );

  const productDescription = useMemo(
    () => getLocalizedText(product?.description, locale) || "",
    [product?.description, locale]
  );

  const timeLeft = useMemo(() => {
    if (timeLeftMs === null) return null;
    return formatTimeLeft(timeLeftMs);
  }, [timeLeftMs]);

  const timeLeftText = useMemo(() => {
    if (!timeLeft) return "";
    if (timeLeft.expired) {
      return t("productDetails.discount.ended");
    }
    return timeLeft.parts
      .map((part) =>
        t(`productDetails.discount.parts.${part.unit}`, {
          value: part.value,
        })
      )
      .join(" ");
  }, [timeLeft, t]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const prodRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/products/${id}`
        );
        if (ignore) return;
        setProduct(prodRes.data);

        const varsRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/variants`,
          { params: { product: id, limit: 500 } }
        );

        const vs: Variant[] = normalizeVariantsResponse(varsRes.data);
        setVariants(vs);

        if (vs.length > 0) {
          setMeasure(vs[0].measureSlug || "");
          setColor(vs[0].colorSlug || "");
        } else {
          setMeasure("");
          setColor("");
        }
      } catch (err) {
        console.error("❌ Failed to fetch product details", err);
        setProduct(null);
        setVariants([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  // خرائط عرضية للأسماء + الوحدة
  const measureInfoBySlug = useMemo(() => {
    const map = new Map<string, { label: string; unit?: string }>();
    for (const v of variants) {
      if (v.measureSlug && v.measure) {
        const existing = map.get(v.measureSlug);
        map.set(v.measureSlug, {
          label: v.measure,
          unit: existing?.unit ?? (v.measureUnit || undefined),
        });
      }
    }
    return map;
  }, [variants]);

  const colorLabelBySlug = useMemo(() => {
    const map = new Map<string, LocalizedObject>();
    for (const v of variants) {
      if (!v.colorSlug) continue;
      const source = v.color?.name || v.colorSlug;
      map.set(v.colorSlug, getColorLabel(source));
    }
    return map;
  }, [variants]);

  // المقاسات (مع استبعاد "موحّد")
  const measures = useMemo(() => {
    return Array.from(measureInfoBySlug.entries())
      .map(([slug, info]) => ({ slug, ...info }))
      .filter((m) => !isUnified(m.label));
  }, [measureInfoBySlug]);

  // الألوان (مع استبعاد "موحّد")
  const allColors = useMemo(() => {
    return Array.from(colorLabelBySlug.entries())
      .map(([slug, label]) => {
        const localized = getLocalizedText(label, locale) || slug;
        const baseName = label.ar?.trim() || label.he?.trim() || localized;
        return { slug, name: localized, baseName };
      })
      .filter((c) => !isUnified(c.baseName))
      .map(({ slug, name }) => ({ slug, name }));
  }, [colorLabelBySlug, locale]);

  const colorsByMeasure = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const v of variants) {
      if (!v.measureSlug || !v.colorSlug) continue;
      if (!m.has(v.measureSlug)) m.set(v.measureSlug, new Set());
      m.get(v.measureSlug)!.add(v.colorSlug);
    }
    return m;
  }, [variants]);

  const availableColorsForMeasure = useMemo(() => {
    if (!measure) return new Set<string>();
    return colorsByMeasure.get(measure) || new Set<string>();
  }, [colorsByMeasure, measure]);

  const currentVariant = useMemo(() => {
    if (!variants.length || !measure || !color) return null;
    return (
      variants.find(
        (v) => v.measureSlug === measure && v.colorSlug === color
      ) || null
    );
  }, [variants, measure, color]);

  useEffect(() => {
    setQuantity(1);
  }, [currentVariant?._id]);

  useEffect(() => {
    if (!measure) {
      setColor("");
      return;
    }
    const allowed = colorsByMeasure.get(measure);
    if (!allowed || allowed.size === 0) {
      setColor("");
      return;
    }
    if (!color || !allowed.has(color)) {
      setColor(Array.from(allowed)[0]);
    }
  }, [measure, colorsByMeasure]); // intentionally omit `color`

  const images =
    currentVariant?.color?.images && currentVariant.color.images.length > 0
      ? currentVariant.color.images
      : product?.images?.length
      ? product.images
      : ["https://i.imgur.com/PU1aG4t.jpeg"];

  const nextImage = () => setCurrentImage((p) => (p + 1) % images.length);
  const prevImage = () =>
    setCurrentImage((p) => (p - 1 + images.length) % images.length);

  const finalAmount = currentVariant?.finalAmount;
  const compareAt = currentVariant?.displayCompareAt ?? null;
  const handleQuantityChange = (newQty: number) => {
    setQuantity((prev) => {
      const desired = Number.isFinite(newQty) ? newQty : prev;
      return Math.max(1, desired);
    });
  };

  const isQuantityValid = !!currentVariant && quantity >= 1;

  const isCtaDisabled = !currentVariant || !isQuantityValid;

  const discountPercent =
    typeof finalAmount === "number" &&
    typeof compareAt === "number" &&
    compareAt > 0 &&
    finalAmount < compareAt
      ? Math.round(((compareAt - finalAmount) / compareAt) * 100)
      : null;

  useEffect(() => {
    const d = currentVariant?.price?.discount;
    if (!d?.endAt) {
      setShowDiscountTimer(false);
      setTimeLeftMs(null);
      setProgressPct(null);
      return;
    }

    const now = Date.now();
    const end = new Date(d.endAt).toISOString();
    const endMs = new Date(end).getTime();
    const start = d.startAt ? new Date(d.startAt).getTime() : now;

    const hasRealDiscount =
      typeof finalAmount === "number" &&
      typeof compareAt === "number" &&
      compareAt > 0 &&
      finalAmount < compareAt;

    const isActive = hasRealDiscount && now >= start && now < endMs;

    if (!isActive) {
      setShowDiscountTimer(false);
      setTimeLeftMs(null);
      setProgressPct(null);
      return;
    }

    setShowDiscountTimer(true);

    const update = () => {
      const t = Date.now();
      const left = endMs - t;
      setTimeLeftMs(left > 0 ? left : 0);

      const duration = Math.max(1, endMs - start);
      const progress = ((t - start) / duration) * 100;
      setProgressPct(clamp(progress));

      if (t >= endMs) setShowDiscountTimer(false);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [
    currentVariant?.price?.discount?.startAt,
    currentVariant?.price?.discount?.endAt,
    finalAmount,
    compareAt,
  ]);

  if (!product) {
    return (
      <p className="text-center mt-10">{t("productDetails.loading")}</p>
    );
  }

  // إخفاء UI المقاس إن لم يتبقَّ إلا "موحّد"
  const showMeasureUI = measures.length > 0;
  const showColorsUI = allColors.length > 0;

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6 text-right">
        <div className="grid md:grid-cols-2 gap-8">
          {/* ✅ سلايدر الصور */}
          <div className="relative w-full h-[400px] overflow-hidden rounded group">
            {images.map((src: string, index: number) => (
              <img
                key={index}
                src={src}
                alt={productName}
                className={clsx(
                  "absolute top-0 left-0 w-full h-full object-contain transition-all duration-500 pointer-events-none",
                  {
                    "opacity-100 translate-x-0 z-10": index === currentImage,
                    "opacity-0 translate-x-full z-0": index > currentImage,
                    "opacity-0 -translate-x-full z-0": index < currentImage,
                  }
                )}
              />
            ))}

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 hover:scale-105 transition opacity-0 group-hover:opacity-100 z-20"
                >
                  ◀
                </button>
                <button
                  onClick={nextImage}
                  className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 hover:scale-105 transition opacity-0 group-hover:opacity-100 z-20"
                >
                  ▶
                </button>

                {discountPercent !== null && (
                  <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    -{discountPercent}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* ✅ التفاصيل */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold">{productName}</h1>
              <button
                type="button"
                disabled={!favoritePayload}
                onClick={handleToggleFavorite}
                className={clsx(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition",
                  !favoritePayload && "cursor-not-allowed opacity-60",
                  favoritePayload &&
                    (isFavoriteProduct
                      ? "bg-red-600 text-white border-red-500 hover:bg-red-500"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100")
                )}
                aria-label={
                  isFavoriteProduct
                    ? t("productDetails.removeFavorite")
                    : t("productDetails.addToFavorites")
                }
              >
                <Heart
                  className="h-5 w-5"
                  fill={isFavoriteProduct ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            </div>
            <p className="text-gray-700 mb-4">{productDescription}</p>

            {/* المقاس + الوحدة */}
            {showMeasureUI && (
              <div className="mb-4">
                <label className="block mb-1">
                  {t("productDetails.measureLabel")}
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={measure}
                  onChange={(e) => setMeasure(e.target.value)}
                >
                  {measures.map((m) => {
                    const text = m.unit ? `${m.label} ${m.unit}` : m.label;
                    return (
                      <option key={m.slug} value={m.slug}>
                        {text}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* اللون (مع إخفاء موحّد) */}
            {showColorsUI && (
              <div className="mb-4">
                <label className="block mb-1">
                  {t("productDetails.colorLabel")}
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                >
                  {allColors.map((c) => {
                    const available =
                      measure && availableColorsForMeasure.has(c.slug);
                    return (
                      <option key={c.slug} value={c.slug} disabled={!available}>
                        {c.name}
                        {!available
                          ? ` ${t("productDetails.colorUnavailable")}`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* السعر */}
            <div className="mb-2">
              {typeof compareAt === "number" &&
              typeof finalAmount === "number" &&
              compareAt > finalAmount ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-500 line-through">
                    ₪{compareAt}
                  </span>
                  <span className="text-xl font-semibold">₪{finalAmount}</span>
                </div>
              ) : (
                <p className="text-xl font-semibold">
                  {typeof finalAmount === "number" ? (
                    <>₪{finalAmount}</>
                  ) : (
                    t("productDetails.price.selectOptions")
                  )}
                </p>
              )}
            </div>

            {showDiscountTimer &&
              progressPct !== null &&
              timeLeftMs !== null && (
                <div className="mb-4">
                  <div
                    className="w-full h-2 rounded-full bg-gray-200 overflow-hidden"
                    aria-label={t("productDetails.discount.progressAria")}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progressPct)}
                    title={t("productDetails.discount.progressTitle")}
                  >
                    <div
                      className="h-full bg-red-600 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-red-700 font-semibold text-right">
                    {t("productDetails.discount.endsIn")} {timeLeftText}
                  </div>
                </div>
              )}

            <div className="flex items-end gap-4 mt-6">
              <div className="flex flex-col gap-2 text-right">
                <label className="text-sm font-medium">
                  {t("productDetails.quantityLabel")}
                </label>
                <QuantityInput
                  quantity={quantity}
                  onChange={handleQuantityChange}
                />
              </div>
              <Button
                disabled={isCtaDisabled}
                onClick={() => {
                  if (!currentVariant || isCtaDisabled) return;
                  addToCart(
                    {
                      ...product,
                      selectedVariantId: currentVariant._id,
                      selectedSku: currentVariant.stock.sku,
                      selectedMeasure: currentVariant.measure,
                      selectedMeasureUnit:
                        currentVariant.measureUnit || undefined, // ✅
                      selectedColor: currentVariant.color?.name,
                      price:
                        typeof currentVariant.finalAmount === "number"
                          ? currentVariant.finalAmount
                          : currentVariant.price?.amount,
                    },
                    quantity
                  );
                }}
              >
              {t("productDetails.cta.addToCart")}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetails;
