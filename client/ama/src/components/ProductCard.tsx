import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import clsx from "clsx";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { getLocalizedText, type LocalizedText } from "@/lib/localized";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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

  // Dialog للموبايل
  const [openDialog, setOpenDialog] = useState(false);

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
      if (v.colorSlug) {
        map.set(v.colorSlug, {
          slug: v.colorSlug,
          name: v.color?.name || v.colorSlug,
        });
      }
    }
    return Array.from(map.values());
  }, [variants]);

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
  const addItemToCart = useCallback(() => {
    if (variants.length > 0) {
      if (!currentVariant) return;
      if ((currentVariant.stock?.inStock ?? 0) <= 0) return;

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
      addToCart(itemForCart);
    } else {
      const productForCart = {
        ...product,
        image: displayedImages?.[0] || fallbackImg,
        selectedMeasure,
        selectedColor,
        price: product.price ?? 0,
      };
      addToCart(productForCart);
    }
  }, [
    addToCart,
    variants.length,
    currentVariant,
    product,
    displayedImages,
    selectedMeasure,
    selectedColor,
  ]);

  const handleQuickAddClick = () => {
    // لو ما في متغيّرات: أضف فوراً
    if (variants.length === 0) {
      addItemToCart();
      return;
    }
    // افتح الديالوج للموبايل
    setOpenDialog(true);
  };

  // سكيليتون
  if (vLoading) {
    return (
      <div className="group border rounded-lg p-3 text-right relative h-full animate-pulse">
        <div className="w-full aspect-[3/4] mb-3 rounded bg-gray-200" />
        <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
        <div className="h-10 w-full bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <>
      {/* ============ موبايل (واجهة مبسّطة + كل البطاقة تفتح التفاصيل) ============ */}
      <div
        className="relative border rounded-lg p-3 text-right hover:shadow flex flex-col h-full md:hidden cursor-pointer"
        onClick={() => navigate(`/products/${product._id}`)}
      >
        {/* محتوى البطاقة */}
        <div className="relative w-full aspect-[3/4] mb-2 overflow-hidden rounded bg-white">
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
          <div className="flex items-start justify-between gap-2">
            <span className="block text-base font-medium mb-1 line-clamp-2">
              {productName}
            </span>

            {/* زر السلة (أيقونة فقط) — يمنع الانتقال ويفتح الديالوج */}
            <button
              className="shrink-0 p-2 rounded-md border hover:bg-gray-50 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAddClick();
              }}
              aria-label={t("productCard.addToCart")}
              title={t("productCard.addToCart")}
            >
              <img
                src="https://www.svgrepo.com/show/533044/cart-shopping-fast.svg"
                alt="Cart"
                className="w-5 h-5"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </button>
          </div>

          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              {typeof variantCompare === "number" &&
              variantCompare > displayPrice ? (
                <>
                  <span className="text-gray-500 line-through">
                    ₪{variantCompare}
                  </span>
                  <span className="font-bold text-lg">₪{displayPrice}</span>
                </>
              ) : (
                <span className="font-bold text-lg">₪{displayPrice}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ ديسكتوب (كما هو لديك) ============ */}
      <div className="hidden md:flex group border rounded-lg p-4 text-right hover:shadow relative flex-col justify-between h-full">
        <div className="relative w-full aspect-[3/4] mb-3 overflow-hidden rounded bg-white">
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
                onClick={prevImage}
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
                onClick={nextImage}
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

        <h3 className="text-lg font-medium mb-1">{productName}</h3>

        {product.subCategory && (
          <p className="text-sm text-gray-500 mb-2">{product.subCategory}</p>
        )}

        {/* المقاسات */}
        {measuresFromVariants.filter((m) => !isUnified(m.label)).length > 0 && (
          <div className="mb-2">
            <span className="text-sm font-medium">
              {t("productCard.sizesLabel")}:
            </span>
            <div className="flex gap-2 mt-1 flex-wrap">
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
                      onClick={() => setSelectedMeasure(m.slug)}
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

        {/* الألوان */}
        {allColorsFromVariants.filter((c) => !isUnified(c.name)).length > 0 && (
          <div className="mb-2">
            <span className="text-sm font-medium">
              {t("productCard.colorsLabel")}:
            </span>
            <div className="flex gap-2 mt-1 flex-wrap">
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

        {/* السعر */}
        <div className="mb-2">
          {typeof variantCompare === "number" &&
          variantCompare > displayPrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500 line-through">
                ₪{variantCompare}
              </span>
              <span className="font-bold text-lg">₪{displayPrice}</span>
            </div>
          ) : (
            <p className="font-bold mb-0">₪{displayPrice}</p>
          )}
        </div>

        {/* تايمر خصم */}
        {showDiscountTimer && progressPct !== null && timeLeftMs !== null && (
          <div className="mb-3">
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

        {/* أزرار الديسكتوب — كما هي */}
        <div className="mt-auto">
          <Button onClick={addItemToCart} className="w-full">
            {t("productCard.addToCart")}
          </Button>
          <Link to={`/products/${product._id}`}>
            <Button variant="secondary" className="w-full mt-2">
              {t("productCard.viewDetails")}
            </Button>
          </Link>
        </div>
      </div>

      {/* ============ Dialog للموبايل — متمركز + ارتفاع مناسب ============ */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent
          className={clsx(
            "sm:max-w-2xl md:max-w-3xl",
            "w-[95vw] sm:w-auto p-0",
            "rounded-2xl sm:rounded-lg",
            "max-h-[85svh] overflow-y-auto"
          )}
        >
          <div className="p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle>{productName}</DialogTitle>
              <DialogDescription>
                {t("productCard.dialogDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4 mt-2">
              {/* صورة كبيرة */}
              <div className="relative w-full aspect-[3/4] overflow-hidden rounded bg-white">
                {displayedImages.map((src, index) => (
                  <img
                    key={`${src}-${index}`}
                    src={src}
                    alt={productName}
                    className={clsx(
                      "absolute inset-0 w-full h-full object-contain transition-all duration-500",
                      {
                        "opacity-100 translate-x-0 z-10":
                          index === currentImage,
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
                      onClick={prevImage}
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
                        width="18"
                        height="18"
                        fill="currentColor"
                      >
                        <path d="M12.707 15.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 1 1 1.414 1.414L8.414 10l4.293 4.293a1 1 0 0 1 0 1.414z" />
                      </svg>
                    </button>

                    <button
                      onClick={nextImage}
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
                        width="18"
                        height="18"
                        fill="currentColor"
                      >
                        <path d="M7.293 4.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5A1 1 0 1 1 7.293 14.293L11.586 10 7.293 5.707a1 1 0 0 1 0-1.414z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* اختيارات + سعر */}
              <div className="text-right">
                <div className="mb-3">
                  <div className="flex items-baseline gap-2 justify-end">
                    {typeof variantCompare === "number" &&
                    variantCompare > displayPrice ? (
                      <>
                        <span className="text-gray-500 line-through">
                          ₪{variantCompare}
                        </span>
                        <span className="font-bold text-xl">
                          ₪{displayPrice}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-xl">₪{displayPrice}</span>
                    )}
                  </div>
                </div>

                {/* مقاسات */}
                {measuresFromVariants.filter((m) => !isUnified(m.label))
                  .length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-1">
                      {t("productCard.sizeLabel")}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {measuresFromVariants
                        .filter((m) => !isUnified(m.label))
                        .map((m) => {
                          const labelWithUnit = m.unit
                            ? `${m.label} ${m.unit}`
                            : m.label;
                          return (
                            <button
                              key={m.slug}
                              onClick={() => setSelectedMeasure(m.slug)}
                              className={clsx(
                                "px-3 py-1 text-sm rounded border transition",
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

                {/* ألوان */}
                {allColorsFromVariants.filter((c) => !isUnified(c.name))
                  .length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-1">
                      {t("productCard.colorLabel")}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
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
                                  : "border-gray-300 hover:border-gray-400",
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

                {/* المخزون */}
                {currentVariant && (
                  <div className="text-sm text-gray-600 mb-4">
                    {currentVariant.stock?.inStock > 0
                      ? t("productCard.inStock", {
                          count: currentVariant.stock?.inStock,
                        })
                      : t("productCard.outOfStock")}
                  </div>
                )}

                <DialogFooter className="gap-2 justify-start md:justify-end">
                  <DialogClose asChild>
                    <Button variant="secondary">
                      {t("productCard.cancel")}
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      addItemToCart();
                      setOpenDialog(false);
                    }}
                    disabled={
                      variants.length > 0 &&
                      (!currentVariant ||
                        (currentVariant.stock?.inStock ?? 0) <= 0)
                    }
                  >
                    {t("productCard.addToCart")}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductCard;
