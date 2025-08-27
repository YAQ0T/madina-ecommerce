import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import clsx from "clsx";
import { useCart } from "@/context/CartContext";

interface Props {
  product: {
    _id: string;
    name: string;
    description: string;
    price: number; // أقل سعر محسوب من with-stats (finalAmount الأدنى)
    images?: string[];
    subCategory?: string;
  };
}

type Variant = {
  _id: string;
  product: string;
  measure: string;
  measureSlug: string;
  color: { name: string; code?: string; images?: string[] };
  colorSlug: string;
  price: {
    amount: number;
    compareAt?: number;
    discount?: {
      type?: "percent" | "amount";
      value?: number;
      startAt?: string; // ISO
      endAt?: string; // ISO
    };
  };
  stock: { inStock: number; sku: string };
  tags?: string[];
  // حقول محسوبة من API/variants
  finalAmount?: number;
  isDiscountActive?: boolean;
  displayCompareAt?: number | null;
};

const slugify = (s: string) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, "-");

const formatTimeLeft = (ms: number) => {
  if (ms <= 0) return "انتهى الخصم";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}ي ${hours}س ${minutes}د`;
  if (hours > 0) return `${hours}س ${minutes}د ${seconds}ث`;
  return `${minutes}د ${seconds}ث`;
};

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();

  // 🖼️ مؤشر الصورة الحالية
  const [currentImage, setCurrentImage] = useState(0);

  // متغيّرات المنتج
  const [variants, setVariants] = useState<Variant[]>([]);
  const [vLoading, setVLoading] = useState(true);

  // اختيارات المستخدم (slugs)
  const [selectedMeasure, setSelectedMeasure] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // إشعار الإضافة
  const [showAdded, setShowAdded] = useState(false);

  // ⏳ حالات التايمر/التقدم
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [showDiscountTimer, setShowDiscountTimer] = useState(false);

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
        const vs: Variant[] = Array.isArray(data) ? data : [];
        setVariants(vs);

        // افتراض: أول متغيّر
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

  // اشتقاق المقاسات من الـ variants
  const measuresFromVariants = useMemo(() => {
    const map = new Map<string, string>(); // slug -> label
    for (const v of variants) {
      if (v.measureSlug && v.measure) map.set(v.measureSlug, v.measure);
    }
    return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
  }, [variants]);

  // كل الألوان المعرفة عبر كل المتغيرات (عرضها بالكلمات)
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

  // خريطة توفّر الألوان حسب المقاس: measureSlug -> Set(colorSlug)
  const colorsByMeasure = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const v of variants) {
      if (!v.measureSlug || !v.colorSlug) continue;
      if (!m.has(v.measureSlug)) m.set(v.measureSlug, new Set());
      m.get(v.measureSlug)!.add(v.colorSlug);
    }
    return m;
  }, [variants]);

  // قائمة الألوان المتاحة للمقاس المختار
  const availableColorSlugsForSelectedMeasure = useMemo(() => {
    if (!selectedMeasure) return new Set<string>();
    return colorsByMeasure.get(selectedMeasure) || new Set<string>();
  }, [colorsByMeasure, selectedMeasure]);

  // المتغيّر المطابق للاختيار
  const currentVariant = useMemo(() => {
    if (!variants.length || !selectedMeasure || !selectedColor) return null;
    return (
      variants.find(
        (v) =>
          v.measureSlug === selectedMeasure && v.colorSlug === selectedColor
      ) || null
    );
  }, [variants, selectedMeasure, selectedColor]);

  // ✅ الصور المعروضة بناءً على الاختيار الحالي
  const displayedImages = useMemo(() => {
    const variantColorImages =
      currentVariant?.color?.images?.filter(Boolean) ?? [];
    if (variantColorImages.length > 0) return variantColorImages;

    const productImages = product.images?.filter(Boolean) ?? [];
    if (productImages.length > 0) return productImages;

    return ["https://i.imgur.com/PU1aG4t.jpeg"];
  }, [currentVariant?.color?.images, product.images]);

  // عند تغيير المقاس: لو اللون الحالي غير متاح، اختَر أول لون متاح
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
  }, [selectedMeasure, colorsByMeasure, variants.length]); // لا تضف selectedColor هنا

  // ✅ كلما تغيّرت الصور نتيجة تغيير (المقاس/اللون)، أعد ضبط المؤشر للصفر
  useEffect(() => {
    setCurrentImage(0);
  }, [displayedImages]);

  // السعر المعروض
  const variantFinal = currentVariant?.finalAmount;
  const variantCompare = currentVariant?.displayCompareAt ?? null;
  const displayPrice =
    typeof variantFinal === "number" ? variantFinal : product.price ?? 0;

  // نسبة الخصم
  const discountPercent =
    typeof variantFinal === "number" &&
    typeof variantCompare === "number" &&
    variantCompare > 0 &&
    variantFinal < variantCompare
      ? Math.round(((variantCompare - variantFinal) / variantCompare) * 100)
      : null;

  // 🕒 شريط التقدم والوقت المتبقي
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
      if (t >= end) {
        setShowDiscountTimer(false);
      }
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

  const handleAddToCart = () => {
    // لو عندنا Variants: تأكد من اختيار متغيّر صالح
    if (variants.length > 0) {
      if (!currentVariant) {
        alert("يرجى اختيار المقاس واللون المتاحين قبل الإضافة للسلة");
        return;
      }
      if ((currentVariant.stock?.inStock ?? 0) <= 0) {
        alert("المتغير المختار غير متوفر");
        return;
      }
      const itemForCart = {
        ...product,
        image: displayedImages?.[0] || "https://i.imgur.com/PU1aG4t.jpeg",
        selectedVariantId: currentVariant._id,
        selectedSku: currentVariant.stock?.sku,
        selectedMeasure: currentVariant.measure,
        selectedColor: currentVariant.color?.name,
        price:
          typeof currentVariant.finalAmount === "number"
            ? currentVariant.finalAmount
            : currentVariant.price?.amount ?? product.price ?? 0,
      };
      addToCart(itemForCart);
      setShowAdded(true);
      setTimeout(() => setShowAdded(false), 1500);
      return;
    }

    const productForCart = {
      ...product,
      image: displayedImages?.[0] || "https://i.imgur.com/PU1aG4t.jpeg",
      selectedMeasure,
      selectedColor,
      price: product.price ?? 0,
    };
    addToCart(productForCart);
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1500);
  };

  const nextImage = () =>
    setCurrentImage((prev) => (prev + 1) % displayedImages.length);
  const prevImage = () =>
    setCurrentImage(
      (prev) => (prev - 1 + displayedImages.length) % displayedImages.length
    );

  // ✨ كلاسات مشتركة وأخرى استجابة (Responsive) لسلوك الأسهم:
  const arrowBase =
    "absolute top-1/2 -translate-y-1/2 z-20 rounded-full border border-white/40 shadow-lg " +
    "transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 " +
    // موبايل: تظهر دائمًا بنعومة
    "opacity-80 bg-black/20 backdrop-blur-sm active:scale-95 " +
    // كمبيوتر: مخفية إلا عند الـ hover على الـ group
    "md:opacity-0 md:bg-white/60 md:text-black md:group-hover:opacity-100";
  const arrowSize = "w-10 h-10 md:w-9 md:h-9 flex items-center justify-center";
  const arrowIcon = "pointer-events-none select-none";

  return (
    <div className="group border rounded-lg p-4 text-right hover:shadow relative flex flex-col justify-between h-full">
      {/* ✅ الصورة — تتغيّر حسب المتغيّر */}
      <div className="relative w-full h-64 mb-3 overflow-hidden rounded">
        {displayedImages.map((src, index) => (
          <img
            key={`${src}-${index}`}
            src={src}
            alt={product.name}
            width={400}
            height={250}
            className={clsx(
              "absolute top-0 left-0 w-full h-full object-contain transition-all duration-500 pointer-events-none",
              {
                "opacity-100 translate-x-0 z-10": index === currentImage,
                "opacity-0 translate-x-full z-0": index > currentImage,
                "opacity-0 -translate-x-full z-0": index < currentImage,
              }
            )}
            loading="lazy"
          />
        ))}

        {displayedImages.length > 1 && (
          <>
            {/* ◀ يسار */}
            <button
              onClick={prevImage}
              aria-label="الصورة السابقة"
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

            {/* ▶ يمين */}
            <button
              onClick={nextImage}
              aria-label="الصورة التالية"
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

        {/* بادج خصم إن وُجد */}
        {discountPercent !== null && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-20">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* ✅ العنوان */}
      <h3 className="text-lg font-medium mb-1">{product.name}</h3>

      {/* ✅ القائمة الفرعية */}
      {product.subCategory && (
        <p className="text-sm text-gray-500 mb-2">{product.subCategory}</p>
      )}

      {/* ✅ اختيار المقاس (من الـ Variants أو fallback) */}
      {measuresFromVariants.length > 0 && (
        <div className="mb-2">
          <span className="text-sm font-medium">المقاسات: </span>
          <select
            value={selectedMeasure}
            onChange={(e) =>
              setSelectedMeasure(
                measuresFromVariants.length > 0
                  ? e.target.value // slug
                  : slugify(e.target.value) // fallback
              )
            }
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">{vLoading ? "تحميل..." : "اختر المقاس"}</option>
            {measuresFromVariants.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ✅ اختيار اللون (كلمات بدل hex) */}
      {allColorsFromVariants.length > 0 && (
        <div className="mb-2">
          <span className="text-sm font-medium">الألوان: </span>
          <div className="flex gap-2 mt-1 flex-wrap">
            {allColorsFromVariants.map((c) => {
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

      {/* ✅ السعر (مع عرض سعر مقارن أثناء الخصم) */}
      <div className="mb-2">
        {typeof variantCompare === "number" && variantCompare > displayPrice ? (
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

      {/* ⏰ شريط تقدّم الخصم — يظهر فقط إذا الخصم نشط */}
      {showDiscountTimer && progressPct !== null && timeLeftMs !== null && (
        <div className="mb-3">
          <div
            className="w-full h-2 rounded-full bg-gray-200 overflow-hidden"
            aria-label="مدّة الخصم المتبقية"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            title="مدّة الخصم"
          >
            <div
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-red-700 font-semibold text-right">
            ينتهي خلال: {formatTimeLeft(timeLeftMs)}
          </div>
        </div>
      )}

      {/* ✅ الأزرار */}
      <div className="mt-auto">
        <Button onClick={handleAddToCart} className="w-full">
          إضافة للسلة
        </Button>
        <Link to={`/products/${product._id}`}>
          <Button variant="secondary" className="w-full mt-2">
            عرض التفاصيل
          </Button>
        </Link>
      </div>

      {showAdded && (
        <div className="absolute top-2 left-2 bg-black text-white text-sm px-3 py-1 rounded shadow animate-bounce z-20">
          ✅ تمت الإضافة!
        </div>
      )}
    </div>
  );
};

export default ProductCard;
