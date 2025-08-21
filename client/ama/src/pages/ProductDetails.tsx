import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import clsx from "clsx";

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
      startAt?: string;
      endAt?: string;
    };
  };
  stock: { inStock: number; sku: string };
  tags: string[];
  // محسوبة من /api/variants
  finalAmount?: number;
  isDiscountActive?: boolean;
  displayCompareAt?: number | null;
};

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

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

const ProductDetails: React.FC = () => {
  const { addToCart } = useCart();
  const { id } = useParams();

  // بيانات المنتج والمتغيّرات
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);

  // حالة السلايدر
  const [currentImage, setCurrentImage] = useState(0);

  // اختيارات المستخدم (slugs)
  const [measure, setMeasure] = useState<string>("");
  const [color, setColor] = useState<string>("");

  // ⏳ حالات التايمر/التقدم للخصم
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [showDiscountTimer, setShowDiscountTimer] = useState(false);

  // جلب المنتج + المتغيّرات
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
        const vs: Variant[] = Array.isArray(varsRes.data) ? varsRes.data : [];
        setVariants(vs);

        // افتراضات: أول variant
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

  // خرائط عرضية للأسماء بدلاً من السلوغ
  const measureLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of variants) {
      if (v.measureSlug && v.measure) map.set(v.measureSlug, v.measure);
    }
    return map;
  }, [variants]);

  const colorLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of variants) {
      if (v.colorSlug) map.set(v.colorSlug, v.color?.name || v.colorSlug);
    }
    return map;
  }, [variants]);

  // قائمة المقاسات المتاحة (سلوغ + label)
  const measures = useMemo(() => {
    return Array.from(measureLabelBySlug.entries()).map(([slug, label]) => ({
      slug,
      label,
    }));
  }, [measureLabelBySlug]);

  // جميع الألوان (سنُعطّل غير المتاح للمقاس المختار)
  const allColors = useMemo(() => {
    return Array.from(colorLabelBySlug.entries()).map(([slug, name]) => ({
      slug,
      name,
    }));
  }, [colorLabelBySlug]);

  // خريطة: المقاس -> مجموعة الألوان المتاحة له
  const colorsByMeasure = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const v of variants) {
      if (!v.measureSlug || !v.colorSlug) continue;
      if (!m.has(v.measureSlug)) m.set(v.measureSlug, new Set());
      m.get(v.measureSlug)!.add(v.colorSlug);
    }
    return m;
  }, [variants]);

  // الألوان المتاحة للمقاس الحالي
  const availableColorsForMeasure = useMemo(() => {
    if (!measure) return new Set<string>();
    return colorsByMeasure.get(measure) || new Set<string>();
  }, [colorsByMeasure, measure]);

  // المتغيّر الحالي
  const currentVariant = useMemo(() => {
    if (!variants.length || !measure || !color) return null;
    return (
      variants.find(
        (v) => v.measureSlug === measure && v.colorSlug === color
      ) || null
    );
  }, [variants, measure, color]);

  // عندما يتغيّر المقاس: عيّن لوناً متاحاً إن كان اللون الحالي غير متاح
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
      setColor(Array.from(allowed)[0]); // أول لون متاح
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, colorsByMeasure]);

  // صور اللون المختار أو صور المنتج العامة
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
  const inStock = currentVariant?.stock?.inStock ?? 0;

  // نسبة الخصم
  const discountPercent =
    typeof finalAmount === "number" &&
    typeof compareAt === "number" &&
    compareAt > 0 &&
    finalAmount < compareAt
      ? Math.round(((compareAt - finalAmount) / compareAt) * 100)
      : null;

  // 🕒 إدارة ظهور شريط التقدم والعدّاد — يظهر فقط عند خصم فعلي نشط
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
      typeof finalAmount === "number" &&
      typeof compareAt === "number" &&
      compareAt > 0 &&
      finalAmount < compareAt;

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
    finalAmount,
    compareAt,
  ]);

  if (!product) {
    return <p className="text-center mt-10">جاري تحميل تفاصيل المنتج...</p>;
  }

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
                alt={product.name}
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
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-gray-700 mb-4">{product.description}</p>

            {/* اختيار المقاس */}
            {measures.length > 0 && (
              <div className="mb-4">
                <label className="block mb-1">المقاس</label>
                <select
                  className="w-full border rounded p-2"
                  value={measure}
                  onChange={(e) => setMeasure(e.target.value)}
                >
                  {measures.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* اختيار اللون — نعرض كل الألوان لكن نُعطّل غير المتاح للمقاس الحالي */}
            {allColors.length > 0 && (
              <div className="mb-4">
                <label className="block mb-1">اللون</label>
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
                        {c.name} {!available ? "— غير متاح لهذا المقاس" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* السعر مع سعر مقارن وقت الخصم */}
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
                    "اختر مقاسًا ولونًا"
                  )}
                </p>
              )}
            </div>

            {/* ⏰ شريط تقدّم ووقت متبقّي — يظهر فقط عند خصم نشط */}
            {showDiscountTimer &&
              progressPct !== null &&
              timeLeftMs !== null && (
                <div className="mb-4">
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

            {currentVariant && (
              <p className="text-sm text-gray-600 mb-6">
                المتوفر: {inStock}
                {currentVariant.stock?.sku
                  ? ` • SKU: ${currentVariant.stock.sku}`
                  : ""}
              </p>
            )}

            <Button
              disabled={!currentVariant || inStock <= 0}
              onClick={() => {
                if (!currentVariant) return;
                addToCart({
                  ...product,
                  selectedVariantId: currentVariant._id,
                  selectedSku: currentVariant.stock.sku,
                  selectedMeasure: currentVariant.measure,
                  selectedColor: currentVariant.color?.name,
                  price:
                    typeof currentVariant.finalAmount === "number"
                      ? currentVariant.finalAmount
                      : currentVariant.price?.amount,
                });
              }}
            >
              {inStock > 0 ? "إضافة للسلة" : "غير متوفر"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetails;
