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
import {
  Loader2,
  Check,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

  // تفاصيل البطاقة
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [overlayQuantityInput, setOverlayQuantityInput] = useState<string>("1");
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const mobileCardRef = useRef<HTMLDivElement | null>(null);
  const desktopCardRef = useRef<HTMLDivElement | null>(null);
  const resetJustAddedTimeout = useRef<number | null>(null);
  const detailsPanelId = useMemo(
    () => `product-details-${product._id}`,
    [product._id]
  );
  const toggleDetails = useCallback(() => {
    setIsDetailsOpen((prev) => !prev);
  }, []);

  /** 🎯 تم تعديل هذا المكوّن ليصبح Bottom Sheet يخرج من أسفل الشاشة */
  const DetailsOverlay = ({ className }: { className?: string }) => {
    return (
      <div
        className={clsx("absolute inset-0 z-30 pointer-events-none", className)}
      >
        {/* الخلفية المعتمة */}
        <div
          className="absolute inset-0 rounded-lg bg-black/10 backdrop-blur-sm pointer-events-auto"
          aria-hidden="true"
          onClick={(e) => {
            // إغلاق عند الضغط على الخلفية
            e.stopPropagation();
            setIsDetailsOpen(false);
          }}
        />
        {/* الشيت السفلي المثبّت في الأسفل */}
        <div
          id={detailsPanelId}
          className={clsx(
            "absolute bottom-0 left-0 right-0 z-10",
            "flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl",
            "bg-white shadow-2xl ring-1 ring-black/10 pointer-events-auto",
            "animate-in fade-in slide-in-from-bottom duration-300 ease-out"
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("productCard.viewDetails")}
          // دعم حواف الأجهزة ذات النوتش
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {productDescription && (
              <p className="text-sm leading-6 text-gray-600">
                {productDescription}
              </p>
            )}

            <div className="mt-auto flex flex-col gap-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    decrementOverlayQuantity();
                  }}
                  aria-label={t("productCard.decreaseQuantity")}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={overlayQuantityInput}
                  onChange={(event) => {
                    event.stopPropagation();
                    handleOverlayQuantityInputChange(event.target.value);
                  }}
                  placeholder="الكمية"
                  className="h-10 w-24 rounded-full border border-gray-300 px-4 text-center text-base font-medium shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    incrementOverlayQuantity();
                  }}
                  aria-label={t("productCard.increaseQuantity")}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <Button
                onClick={() => {
                  void addItemToCart();
                }}
                className={clsx(
                  "w-full transition-transform duration-200",
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
              <Link to={`/products/${product._id}`}>
                <Button variant="secondary" className="w-full">
                  {t("productCard.viewDetails")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      const localized =
        getLocalizedText(getColorLabel(source), locale) || source;
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
    setOverlayQuantityInput("1");
  }, [currentVariantId]);

  useEffect(() => {
    if (!isDetailsOpen) {
      setQuantity(1);
      setOverlayQuantityInput("1");
    }
  }, [isDetailsOpen]);

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
  const handleOverlayQuantityInputChange = useCallback(
    (value: string) => {
      if (!/^\d*$/.test(value)) return;

      if (value === "") {
        setOverlayQuantityInput("");
        setQuantity(1);
        return;
      }

      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed)) return;

      const maxQty = currentVariant?.stock?.inStock;
      const safeQty = clamp(
        parsed,
        1,
        typeof maxQty === "number" && maxQty > 0 ? maxQty : parsed
      );
      setQuantity(safeQty);
      setOverlayQuantityInput(safeQty.toString());
    },
    [currentVariant?.stock?.inStock]
  );

  const incrementOverlayQuantity = useCallback(() => {
    const maxQty = currentVariant?.stock?.inStock;
    const nextBase = overlayQuantityInput === "" ? 1 : quantity;
    const nextValue = clamp(
      nextBase + 1,
      1,
      typeof maxQty === "number" && maxQty > 0 ? maxQty : nextBase + 1
    );
    setQuantity(nextValue);
    setOverlayQuantityInput(nextValue.toString());
  }, [currentVariant?.stock?.inStock, overlayQuantityInput, quantity]);

  const decrementOverlayQuantity = useCallback(() => {
    const maxQty = currentVariant?.stock?.inStock;
    const nextBase = overlayQuantityInput === "" ? 1 : quantity;
    const nextValue = clamp(
      nextBase - 1,
      1,
      typeof maxQty === "number" && maxQty > 0 ? maxQty : nextBase - 1
    );
    setQuantity(nextValue);
    setOverlayQuantityInput(nextValue.toString());
  }, [currentVariant?.stock?.inStock, overlayQuantityInput, quantity]);

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
    <div className="contents">
      {/* ============ موبايل (واجهة مبسّطة + كل البطاقة تفتح التفاصيل) ============ */}
      <div
        ref={mobileCardRef}
        className="relative border rounded-lg p-2 text-right hover:shadow flex flex-col h-full md:hidden cursor-pointer"
        onClick={() => {
          if (isDetailsOpen) return;
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
                isDetailsOpen &&
                  "bg-black text-white hover:bg-black border-black shadow-md"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleDetails();
              }}
              aria-expanded={isDetailsOpen}
              aria-controls={detailsPanelId}
              aria-label={
                isDetailsOpen
                  ? t("productCard.collapseDetails")
                  : t("productCard.expandDetails")
              }
              aria-pressed={isDetailsOpen}
              title={t("productCard.addToCart")}
            >
              {isDetailsOpen ? (
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
                  <span className="font-semibold text-base">
                    ₪{displayPrice}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-base">₪{displayPrice}</span>
              )}
            </div>
          </div>

          {measuresFromVariants.filter((m) => !isUnified(m.label)).length >
            0 && (
            <div className="mt-2">
              <div className="mb-1 text-xs font-medium text-gray-700">
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
                        type="button"
                        title={labelWithUnit}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedMeasure(m.slug);
                          setCurrentImage(0);
                        }}
                        className={clsx(
                          "px-2 py-1 text-xs rounded border transition",
                          selectedMeasure === m.slug
                            ? "border-black font-semibold"
                            : "border-gray-300 text-gray-700"
                        )}
                      >
                        {labelWithUnit}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {allColorsFromVariants.filter((c) => !isUnified(c.name)).length >
            0 && (
            <div className="mt-2">
              <div className="mb-1 text-xs font-medium text-gray-700">
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
                        type="button"
                        title={c.name}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!isAvailable) return;
                          setSelectedColor(c.slug);
                          setCurrentImage(0);
                        }}
                        disabled={!isAvailable}
                        className={clsx(
                          "px-2 py-1 text-xs rounded border transition",
                          selectedColor === c.slug && isAvailable
                            ? "border-black font-semibold"
                            : "border-gray-300 text-gray-700",
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
        </div>

        {isDetailsOpen && <DetailsOverlay className="flex md:hidden" />}
      </div>

      {/* ============ ديسكتوب (كما هو لديك) ============ */}
      <div
        ref={desktopCardRef}
        className="hidden md:flex group border rounded-lg p-3 text-right hover:shadow relative flex-col h-full"
      >
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
            <p className="text-xs text-gray-500 mb-1.5">
              {product.subCategory}
            </p>
          )}

          {measuresFromVariants.filter((m) => !isUnified(m.label)).length >
            0 && (
            <div className="mt-2">
              <div className="mb-1 text-xs font-medium text-gray-700">
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
                        type="button"
                        title={labelWithUnit}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedMeasure(m.slug);
                          setCurrentImage(0);
                        }}
                        className={clsx(
                          "px-2 py-1 text-xs rounded border transition",
                          selectedMeasure === m.slug
                            ? "border-black font-semibold"
                            : "border-gray-300 text-gray-700"
                        )}
                      >
                        {labelWithUnit}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {allColorsFromVariants.filter((c) => !isUnified(c.name)).length >
            0 && (
            <div className="mt-2">
              <div className="mb-1 text-xs font-medium text-gray-700">
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
                        type="button"
                        title={c.name}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!isAvailable) return;
                          setSelectedColor(c.slug);
                          setCurrentImage(0);
                        }}
                        disabled={!isAvailable}
                        className={clsx(
                          "px-2 py-1 text-xs rounded border transition",
                          selectedColor === c.slug && isAvailable
                            ? "border-black font-semibold"
                            : "border-gray-300 text-gray-700",
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

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <div className="flex flex-col items-end text-right">
              {typeof variantCompare === "number" &&
              variantCompare > displayPrice ? (
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className="text-gray-500 line-through">
                    ₪{variantCompare}
                  </span>
                  <span className="font-semibold text-base">
                    ₪{displayPrice}
                  </span>
                </div>
              ) : (
                <p className="font-semibold text-base mb-0">₪{displayPrice}</p>
              )}
            </div>
            <button
              type="button"
              onClick={toggleDetails}
              className={clsx(
                "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm transition hover:bg-gray-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                isDetailsOpen &&
                  "bg-black text-white hover:bg-black border-black shadow-md"
              )}
              aria-expanded={isDetailsOpen}
              aria-controls={detailsPanelId}
              aria-label={
                isDetailsOpen
                  ? t("productCard.collapseDetails")
                  : t("productCard.expandDetails")
              }
            >
              {isDetailsOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {isDetailsOpen && <DetailsOverlay className="hidden md:flex" />}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
