import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import clsx from "clsx";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { getLocalizedText, type LocalizedText } from "@/lib/localized";
import { getColorLabel } from "@/lib/colors";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/i18n";
import QuantityInput from "@/components/common/QuantityInput";
import { Loader2, Check, Plus, X } from "lucide-react";
import { dispatchCartHighlight } from "@/lib/cartHighlight";

interface Props {
  product: {
    _id: string;
    name: LocalizedText;
    description: LocalizedText;
    price: number;
    images?: string[];
    subCategory?: string;
  };
}

type Variant = {
  _id: string;
  product: string;
  measure: string;
  measureUnit?: string;
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
  tags?: string[];
  finalAmount?: number;
  isDiscountActive?: boolean;
  displayCompareAt?: number | null;
};

const normalize = (s?: string) =>
  (s || "").trim().replace(/\s+/g, "").toLowerCase();
const isUnified = (s?: string) => normalize(s) === normalize("موحد");

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

const fallbackImg = "https://i.imgur.com/PU1aG4t.jpeg";

/** ✅ يُرجع دائمًا مصفوفة المتغيّرات سواء كانت الاستجابة {items:[]} أو [] مباشرة */
function normalizeVariantsResponse(data: any): Variant[] {
  if (data && Array.isArray(data.items)) return data.items as Variant[];
  if (Array.isArray(data)) return data as Variant[];
  return [];
}

const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const { t } = useTranslation();
  const productName = useMemo(
    () => getLocalizedText(product.name, locale) || product._id,
    [product.name, locale, product._id]
  );
  const productDescription = useMemo(
    () => getLocalizedText(product.description, locale) || "",
    [product.description, locale]
  );

  // حالات مشتركة
  const [currentImage, setCurrentImage] = useState(0);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [vLoading, setVLoading] = useState(true);

  const [selectedMeasure, setSelectedMeasure] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // خصم/مؤقت
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [showDiscountTimer, setShowDiscountTimer] = useState(false);

  // Bottom sheet للموبايل
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const closeMobileSheet = useCallback(() => setIsMobileSheetOpen(false), []);
  const toggleMobileSheet = useCallback(() => {
    setIsMobileSheetOpen((prev) => !prev);
  }, []);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isDesktopDetailsOpen, setIsDesktopDetailsOpen] = useState(false);
  const resetJustAddedTimeout = useRef<number | null>(null);
  const desktopDetailsId = useMemo(
    () => `desktop-details-${product._id}`,
    [product._id]
  );
  const toggleDesktopDetails = useCallback(() => {
    setIsDesktopDetailsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      if (resetJustAddedTimeout.current !== null) {
        window.clearTimeout(resetJustAddedTimeout.current);
      }
    };
  }, []);

  // جلب المتغيّرات
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setVLoading(true);
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/variants`,
          { params: { product: product._id, limit: 500 } }
        );
        if (ignore) return;

        const vs: Variant[] = normalizeVariantsResponse(data);
        setVariants(vs);

        if (vs.length > 0) {
          setSelectedMeasure(vs[0].measureSlug || "");
          setSelectedColor(vs[0].colorSlug || "");
        }
      } catch {
        setVariants([]);
      } finally {
        if (!ignore) setVLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [product._id]);

  // اشتقاقات
  const measuresFromVariants = useMemo(() => {
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
    return Array.from(map.entries()).map(([slug, { label, unit }]) => ({
      slug,
      label,
      unit,
    }));
  }, [variants]);

  const allColorsFromVariants = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    for (const v of variants) {
      if (!v.colorSlug) continue;
      const source = v.color?.name || v.colorSlug;
      const localized = getLocalizedText(getColorLabel(source), locale) || source;
      map.set(v.colorSlug, { slug: v.colorSlug, name: localized });
    }
    return Array.from(map.values());
  }, [variants, locale]);

  const colorsByMeasure = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const v of variants) {
      if (!v.measureSlug || !v.colorSlug) continue;
      if (!m.has(v.measureSlug)) m.set(v.measureSlug, new Set());
      m.get(v.measureSlug)!.add(v.colorSlug);
    }
    return m;
  }, [variants]);

  const availableColorSlugsForSelectedMeasure = useMemo(() => {
    if (!selectedMeasure) return new Set<string>();
    return colorsByMeasure.get(selectedMeasure) || new Set<string>();
  }, [colorsByMeasure, selectedMeasure]);

  const currentVariant = useMemo(() => {
    if (!variants.length || !selectedMeasure || !selectedColor) return null;
    return (
      variants.find(
        (v) =>
          v.measureSlug === selectedMeasure && v.colorSlug === selectedColor
      ) || null
    );
  }, [variants, selectedMeasure, selectedColor]);

  const currentVariantId = currentVariant?._id ?? "no-variant";

  const displayedImages = useMemo(() => {
    const variantColorImages =
      currentVariant?.color?.images?.filter(Boolean) ?? [];
    if (variantColorImages.length > 0) return variantColorImages;
    const productImages = product.images?.filter(Boolean) ?? [];
    if (productImages.length > 0) return productImages;
    return [fallbackImg];
  }, [currentVariant?.color?.images, product.images]);

  // مزامنة اللون مع المقاس
  useEffect(() => {
    if (variants.length === 0) return;
    if (!selectedMeasure) return;

    const allowed = colorsByMeasure.get(selectedMeasure);
    if (!allowed || allowed.size === 0) {
      setSelectedColor("");
      return;
    }
    if (!selectedColor || !allowed.has(selectedColor)) {
      const first = Array.from(allowed)[0];
      setSelectedColor(first);
    }
  }, [selectedMeasure, colorsByMeasure, variants.length]); // eslint-disable-line

  // إعادة المؤشر للصورة الأولى عند تغيّر المصدر
  useEffect(() => {
    setCurrentImage(0);
  }, [displayedImages]);

  useEffect(() => {
    setQuantity(1);
  }, [currentVariantId]);

  useEffect(() => {
    if (!isMobileSheetOpen) {
      setQuantity(1);
    }
  }, [isMobileSheetOpen]);

  // الأسعار/الخصم
  const variantFinal = currentVariant?.finalAmount;
  const variantCompare = currentVariant?.displayCompareAt ?? null;
  const displayPrice =
    typeof variantFinal === "number" ? variantFinal : product.price ?? 0;

  const discountPercent =
    typeof variantFinal === "number" &&
    typeof variantCompare === "number" &&
    variantCompare > 0 &&
    variantFinal < variantCompare
      ? Math.round(((variantCompare - variantFinal) / variantCompare) * 100)
      : null;

  // مؤقّت الخصم
  useEffect(() => {
    const d = currentVariant?.price?.discount;
    if (!d?.endAt) {
      setShowDiscountTimer(false);
      setTimeLeftMs(null);
      setProgressPct(null);
      return;
    }

    const now = Date.now();
    const end = new Date(d.endAt).getTime();
    const start = d.startAt ? new Date(d.startAt).getTime() : now;

    const hasRealDiscount =
      typeof variantFinal === "number" &&
      typeof variantCompare === "number" &&
      variantCompare > 0 &&
      variantFinal < variantCompare;

    const isActive = hasRealDiscount && now >= start && now < end;

    if (!isActive) {
      setShowDiscountTimer(false);
      setTimeLeftMs(null);
      setProgressPct(null);
      return;
    }

    setShowDiscountTimer(true);

    const update = () => {
      const t = Date.now();
      const left = end - t;
      setTimeLeftMs(left > 0 ? left : 0);
      const duration = Math.max(1, end - start);
      const progress = ((t - start) / duration) * 100;
      setProgressPct(clamp(progress));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [
    currentVariant?.price?.discount?.startAt,
    currentVariant?.price?.discount?.endAt,
    variantFinal,
    variantCompare,
  ]);

  // تنقّل الصور
  const nextImage = () =>
    setCurrentImage((prev) => (prev + 1) % displayedImages.length);
  const prevImage = () =>
    setCurrentImage(
      (prev) => (prev - 1 + displayedImages.length) % displayedImages.length
    );

  const arrowBase =
    "absolute top-1/2 -translate-y-1/2 z-20 rounded-full border border-white/40 shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 opacity-80 bg-black/20 backdrop-blur-sm active:scale-95 md:opacity-0 md:bg-white/60 md:text-black md:group-hover:opacity-100";
  const arrowSize = "w-9 h-9 flex items-center justify-center";
  const arrowIcon = "pointer-events-none select-none";

  // إضافة للسلة
  const handleQuantityChange = useCallback(
    (newQty: number) => {
      const maxQty = currentVariant?.stock?.inStock;
      const safeQty = clamp(
        newQty,
        1,
        typeof maxQty === "number" && maxQty > 0 ? maxQty : newQty
      );
      setQuantity(safeQty);
    },
    [currentVariant?.stock?.inStock]
  );

  const addItemToCart = useCallback(async () => {
    if (isAdding) return false;

    setIsAdding(true);

    try {
      const effectiveQuantity = Math.max(1, quantity);
      let added = false;

      if (variants.length > 0) {
        if (!currentVariant) return false;
        if ((currentVariant.stock?.inStock ?? 0) <= 0) return false;

        const itemForCart = {
          ...product,
          image: displayedImages?.[0] || fallbackImg,
          selectedVariantId: currentVariant._id,
          selectedSku: currentVariant.stock?.sku,
          selectedMeasure: currentVariant.measure,
          selectedMeasureUnit: currentVariant.measureUnit || undefined,
          selectedColor: currentVariant.color?.name,
          price:
            typeof currentVariant.finalAmount === "number"
              ? currentVariant.finalAmount
              : currentVariant.price?.amount ?? product.price ?? 0,
        };
        const maxQty = currentVariant.stock?.inStock;
        const finalQuantity =
          typeof maxQty === "number" && maxQty > 0
            ? clamp(effectiveQuantity, 1, maxQty)
            : effectiveQuantity;
        addToCart(itemForCart, finalQuantity);
        added = true;
      } else {
        const productForCart = {
          ...product,
          image: displayedImages?.[0] || fallbackImg,
          selectedMeasure,
          selectedColor,
          price: product.price ?? 0,
        };
        addToCart(productForCart, effectiveQuantity);
        added = true;
      }

      if (added) {
        setJustAdded(true);
        dispatchCartHighlight();
        if (resetJustAddedTimeout.current !== null) {
          window.clearTimeout(resetJustAddedTimeout.current);
        }
        resetJustAddedTimeout.current = window.setTimeout(() => {
          setJustAdded(false);
        }, 1000);
      }

      return added;
    } finally {
      setIsAdding(false);
    }
  }, [
    isAdding,
    quantity,
    variants.length,
    currentVariant,
    addToCart,
    product,
    displayedImages,
    selectedMeasure,
    selectedColor,
  ]);

  const isVariantUnavailable =
    variants.length > 0 &&
    (!currentVariant || (currentVariant.stock?.inStock ?? 0) <= 0);

  // سكيليتون
  if (vLoading) {
    return (
      <div className="group border rounded-lg p-2 text-right relative h-full animate-pulse">
        <div className="w-full aspect-[4/5] mb-2 rounded bg-gray-200" />
        <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
        <div className="h-10 w-full bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <>
      {/* ============ موبايل (واجهة مبسّطة + كل البطاقة تفتح التفاصيل) ============ */}
      <div
        className="relative border rounded-lg p-2 text-right hover:shadow flex flex-col h-full md:hidden cursor-pointer"
        onClick={() => {
          if (isMobileSheetOpen) return;
          navigate(`/products/${product._id}`);
        }}
      >
        {/* محتوى البطاقة */}
        <div className="relative w-full aspect-[4/5] mb-1.5 overflow-hidden rounded bg-white">
          {displayedImages.map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt={productName}
              className={clsx(
                "absolute inset-0 w-full h-full object-contain transition-all duration-500",
                {
                  "opacity-100 translate-x-0 z-10": index === currentImage,
                  "opacity-0 translate-x-full z-0": index > currentImage,
                  "opacity-0 -translate-x-full z-0": index < currentImage,
                }
              )}
              loading="lazy"
              decoding="async"
              sizes="100vw"
              draggable={false}
            />
          ))}

          {displayedImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label={t("productCard.previousImage")}
                className={clsx(arrowBase, arrowSize, "left-2 text-white")}
              >
                <svg
                  className={arrowIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  width="18"
                  height="18"
                  fill="currentColor"
                >
                  <path d="M12.707 15.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 1 1 1.414 1.414L8.414 10l4.293 4.293a1 1 0 0 1 0 1.414z" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label={t("productCard.nextImage")}
                className={clsx(arrowBase, arrowSize, "right-2 text-white")}
              >
                <svg
                  className={arrowIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  width="18"
                  height="18"
                  fill="currentColor"
                >
                  <path d="M7.293 4.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5A1 1 0 1 1 7.293 14.293L11.586 10 7.293 5.707a1 1 0 0 1 0-1.414z" />
                </svg>
              </button>
            </>
          )}

          {discountPercent !== null && (
            <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-20">
              -{discountPercent}%
            </span>
          )}
        </div>

        <div className="pr-0">
          <div className="flex items-start justify-between gap-1.5">
            <span className="block text-sm font-medium mb-1 line-clamp-2">
              {productName}
            </span>

            {/* زر فتح/إغلاق الشيت السفلي */}
            <button
              type="button"
              className={clsx(
                "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm transition",
                "hover:bg-gray-100 active:scale-95",
                isMobileSheetOpen &&
                  "bg-black text-white hover:bg-black border-black shadow-md"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleMobileSheet();
              }}
              aria-label={t("productCard.addToCart")}
              aria-pressed={isMobileSheetOpen}
              title={t("productCard.addToCart")}
            >
              {isMobileSheetOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-1.5">
              {typeof variantCompare === "number" &&
              variantCompare > displayPrice ? (
                <>
                  <span className="text-gray-500 line-through">
                    ₪{variantCompare}
                  </span>
                  <span className="font-semibold text-base">₪{displayPrice}</span>
                </>
              ) : (
                <span className="font-semibold text-base">₪{displayPrice}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ ديسكتوب (كما هو لديك) ============ */}
      <div className="hidden md:flex group border rounded-lg p-3 text-right hover:shadow relative flex-col h-full">
        <button
          type="button"
          onClick={toggleDesktopDetails}
          className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          aria-expanded={isDesktopDetailsOpen}
          aria-controls={desktopDetailsId}
          aria-label={
            isDesktopDetailsOpen
              ? t("productCard.collapseDetails")
              : t("productCard.expandDetails")
          }
        >
          {isDesktopDetailsOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <div
          className="relative w-full aspect-[4/5] mb-2 overflow-hidden rounded bg-white cursor-pointer"
          onClick={() => navigate(`/products/${product._id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate(`/products/${product._id}`);
            }
          }}
        >
          {displayedImages.map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt={productName}
              className={clsx(
                "absolute inset-0 w-full h-full object-contain transition-all duration-500 ",
                {
                  "opacity-100 translate-x-0 z-10": index === currentImage,
                  "opacity-0 translate-x-full z-0": index > currentImage,
                  "opacity-0 -translate-x-full z-0": index < currentImage,
                }
              )}
              loading="lazy"
              decoding="async"
              sizes="33vw"
              draggable={false}
            />
          ))}

          {displayedImages.length > 1 && (
            <>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  prevImage();
                }}
                aria-label={t("productCard.previousImage")}
                className={clsx(
                  arrowBase,
                  arrowSize,
                  "left-2 text-white md:text-black"
                )}
              >
                <svg
                  className={arrowIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M12.707 15.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 1 1 1.414 1.414L8.414 10l4.293 4.293a1 1 0 0 1 0 1.414z" />
                </svg>
              </button>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  nextImage();
                }}
                aria-label={t("productCard.nextImage")}
                className={clsx(
                  arrowBase,
                  arrowSize,
                  "right-2 text-white md:text-black"
                )}
              >
                <svg
                  className={arrowIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M7.293 4.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5A1 1 0 1 1 7.293 14.293L11.586 10 7.293 5.707a1 1 0 0 1 0-1.414z" />
                </svg>
              </button>
            </>
          )}

          {discountPercent !== null && (
            <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-20">
              -{discountPercent}%
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1">
          <h3 className="text-base font-medium mb-1">{productName}</h3>

          {product.subCategory && (
            <p className="text-xs text-gray-500 mb-1.5">{product.subCategory}</p>
          )}

          <div className="mb-1.5">
            {typeof variantCompare === "number" &&
            variantCompare > displayPrice ? (
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-gray-500 line-through">₪{variantCompare}</span>
                <span className="font-semibold text-base">₪{displayPrice}</span>
              </div>
            ) : (
              <p className="font-semibold text-base mb-0">₪{displayPrice}</p>
            )}
          </div>

          {isDesktopDetailsOpen && (
            <div
              id={desktopDetailsId}
              className="flex flex-col gap-1.5 flex-1"
            >
              {productDescription && (
                <p className="text-sm leading-6 text-gray-600">
                  {productDescription}
                </p>
              )}

              {measuresFromVariants.filter((m) => !isUnified(m.label)).length > 0 && (
                <div>
                  <div className="mb-1 text-sm font-medium">
                    {t("productCard.sizeLabel")}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {measuresFromVariants
                      .filter((m) => !isUnified(m.label))
                      .map((m) => {
                        const labelWithUnit = m.unit
                          ? `${m.label} ${m.unit}`
                          : m.label;
                        return (
                          <button
                            key={m.slug}
                            title={labelWithUnit}
                            onClick={() => {
                              setSelectedMeasure(m.slug);
                              setCurrentImage(0);
                            }}
                            className={clsx(
                              "px-3 py-1 text-sm rounded border transition",
                              selectedMeasure === m.slug
                                ? "border-black font-bold"
                                : "border-gray-300"
                            )}
                          >
                            {labelWithUnit}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {allColorsFromVariants.filter((c) => !isUnified(c.name)).length > 0 && (
                <div>
                  <div className="mb-1 text-sm font-medium">
                    {t("productCard.colorLabel")}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {allColorsFromVariants
                      .filter((c) => !isUnified(c.name))
                      .map((c) => {
                        const isAvailable =
                          selectedMeasure &&
                          availableColorSlugsForSelectedMeasure.has(c.slug);

                        return (
                          <button
                            key={c.slug}
                            title={c.name}
                            onClick={() => {
                              if (!isAvailable) return;
                              setSelectedColor(c.slug);
                              setCurrentImage(0);
                            }}
                            disabled={!isAvailable}
                            className={clsx(
                              "px-3 py-1 text-sm rounded border transition",
                              selectedColor === c.slug && isAvailable
                                ? "border-black font-bold"
                                : "border-gray-300",
                              !isAvailable && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {currentVariant && (
                <div className="text-sm text-gray-600">
                  {currentVariant.stock?.inStock > 0
                    ? t("productCard.inStock", {
                        count: currentVariant.stock?.inStock,
                      })
                    : t("productCard.outOfStock")}
                </div>
              )}

              {showDiscountTimer && progressPct !== null && timeLeftMs !== null && (
                <div>
                  <div
                    className="w-full h-2 rounded-full bg-gray-200 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progressPct)}
                    title={t("productCard.discountTimerTitle")}
                  >
                    <div
                      className="h-full bg-red-600 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-red-700 font-semibold text-right">
                    {t("productCard.discountTimer")}
                  </div>
                </div>
              )}

              <div className="mt-auto flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <QuantityInput
                    quantity={quantity}
                    onChange={handleQuantityChange}
                    placeholder="الكمية"
                    placeholderQuantity={1}
                  />
                  <Button
                    onClick={() => {
                      void addItemToCart();
                    }}
                    className={clsx(
                      "flex-1 transition-transform duration-200",
                      justAdded &&
                        "scale-[1.02] ring-2 ring-green-400 ring-offset-2 ring-offset-white bg-green-600 text-white",
                      isAdding && "opacity-80 cursor-not-allowed",
                      !isAdding && !justAdded && "hover:scale-[1.01]"
                    )}
                    disabled={isAdding || isVariantUnavailable}
                  >
                    {justAdded ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check className="h-4 w-4" />
                        {t("productCard.addedToCart")}
                      </span>
                    ) : isVariantUnavailable ? (
                      t("productCard.outOfStock")
                    ) : isAdding ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("productCard.addingToCart")}
                      </span>
                    ) : (
                      t("productCard.addToCart")
                    )}
                  </Button>
                </div>
                <Link to={`/products/${product._id}`}>
                  <Button variant="secondary" className="w-full">
                    {t("productCard.viewDetails")}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        {isMobileSheetOpen && (
          <div
            className={clsx(
              "mt-2 overflow-hidden rounded-b-lg border border-gray-200 bg-white shadow-xl",
              "animate-in fade-in slide-in-from-bottom duration-300 ease-out"
            )}
          >
            <div className="border-b px-4 pb-3 pt-4 text-right">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-base font-semibold">{productName}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {t("productCard.dialogDescription")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMobileSheet();
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{t("productCard.cancel")}</span>
                </button>
              </div>
            </div>

            <div className="max-h-[85svh] overflow-y-auto">
              <div className="flex flex-col gap-4 p-4">
                <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg bg-white">
                  {displayedImages.map((src, index) => (
                    <img
                      key={`${src}-${index}`}
                      src={src}
                      alt={productName}
                      className={clsx(
                        "absolute inset-0 h-full w-full object-contain transition-all duration-500",
                        {
                          "opacity-100 translate-x-0 z-10": index === currentImage,
                          "opacity-0 translate-x-full z-0": index > currentImage,
                          "opacity-0 -translate-x-full z-0": index < currentImage,
                        }
                      )}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ))}

                  {displayedImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prevImage();
                        }}
                        aria-label={t("productCard.previousImage")}
                        className={clsx(
                          arrowBase,
                          arrowSize,
                          "left-2 text-white"
                        )}
                      >
                        <svg
                          className={arrowIcon}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          width="18"
                          height="18"
                          fill="currentColor"
                        >
                          <path d="M12.707 15.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 1 1 1.414 1.414L8.414 10l4.293 4.293a1 1 0 0 1 0 1.414z" />
                        </svg>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          nextImage();
                        }}
                        aria-label={t("productCard.nextImage")}
                        className={clsx(
                          arrowBase,
                          arrowSize,
                          "right-2 text-white"
                        )}
                      >
                        <svg
                          className={arrowIcon}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          width="18"
                          height="18"
                          fill="currentColor"
                        >
                          <path d="M7.293 4.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5A1 1 0 1 1 7.293 14.293L11.586 10 7.293 5.707a1 1 0 0 1 0-1.414z" />
                        </svg>
                      </button>
                    </>
                  )}

                  {discountPercent !== null && (
                    <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 text-right">
                  <div className="flex items-baseline justify-end gap-2">
                    {typeof variantCompare === "number" &&
                    variantCompare > displayPrice ? (
                      <>
                        <span className="text-gray-500 line-through">
                          ₪{variantCompare}
                        </span>
                        <span className="text-lg font-bold">₪{displayPrice}</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">₪{displayPrice}</span>
                    )}
                  </div>

                  {productDescription && (
                    <p className="text-sm leading-6 text-gray-600">
                      {productDescription}
                    </p>
                  )}

                  {measuresFromVariants.filter((m) => !isUnified(m.label)).length > 0 && (
                    <div>
                      <div className="mb-1 text-sm font-medium">
                        {t("productCard.sizeLabel")}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {measuresFromVariants
                          .filter((m) => !isUnified(m.label))
                          .map((m) => {
                            const labelWithUnit = m.unit
                              ? `${m.label} (${m.unit})`
                              : m.label;
                            return (
                              <button
                                key={m.slug}
                                onClick={() => {
                                  setSelectedMeasure(m.slug);
                                  setCurrentImage(0);
                                }}
                                className={clsx(
                                  "rounded border px-3 py-1 text-sm transition",
                                  selectedMeasure === m.slug
                                    ? "border-black font-bold"
                                    : "border-gray-300 hover:border-gray-400"
                                )}
                              >
                                {labelWithUnit}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {allColorsFromVariants.filter((c) => !isUnified(c.name)).length > 0 && (
                    <div>
                      <div className="mb-1 text-sm font-medium">
                        {t("productCard.colorLabel")}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {allColorsFromVariants
                          .filter((c) => !isUnified(c.name))
                          .map((c) => {
                            const isAvailable =
                              selectedMeasure &&
                              availableColorSlugsForSelectedMeasure.has(c.slug);
                            return (
                              <button
                                key={c.slug}
                                title={c.name}
                                onClick={() => {
                                  if (!isAvailable) return;
                                  setSelectedColor(c.slug);
                                  setCurrentImage(0);
                                }}
                                disabled={!isAvailable}
                                className={clsx(
                                  "rounded border px-3 py-1 text-sm transition",
                                  selectedColor === c.slug && isAvailable
                                    ? "border-black font-bold"
                                    : "border-gray-300 hover:border-gray-400",
                                  !isAvailable && "cursor-not-allowed opacity-40"
                                )}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {currentVariant && (
                    <div className="text-sm text-gray-600">
                      {currentVariant.stock?.inStock > 0
                        ? t("productCard.inStock", {
                            count: currentVariant.stock?.inStock,
                          })
                        : t("productCard.outOfStock")}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3">
                    <span className="text-sm text-gray-700">
                      {t("productCard.quantityLabel")}
                    </span>
                    <QuantityInput
                      quantity={quantity}
                      onChange={handleQuantityChange}
                      placeholder="الكمية"
                      placeholderQuantity={1}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t bg-white p-4 sm:flex-row-reverse sm:items-center sm:justify-between">
              <Button
                onClick={async () => {
                  const added = await addItemToCart();
                  if (added) {
                    closeMobileSheet();
                  }
                }}
                disabled={isAdding || isVariantUnavailable}
                className={clsx(
                  "w-full transition-transform duration-200 sm:w-auto",
                  justAdded &&
                    "scale-[1.02] ring-2 ring-green-400 ring-offset-2 ring-offset-white bg-green-600 text-white",
                  isAdding && "cursor-not-allowed opacity-80",
                  !isAdding && !justAdded && "hover:scale-[1.01]"
                )}
              >
                {justAdded ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Check className="h-4 w-4" />
                    {t("productCard.addedToCart")}
                  </span>
                ) : isVariantUnavailable ? (
                  t("productCard.outOfStock")
                ) : isAdding ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("productCard.addingToCart")}
                  </span>
                ) : (
                  t("productCard.addToCart")
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMobileSheet();
                }}
              >
                {t("productCard.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductCard;
