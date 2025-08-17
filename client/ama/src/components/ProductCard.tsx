import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import clsx from "clsx";

interface Props {
  product: {
    _id: string;
    name: string;
    description: string;
    price: number; // أقل سعر محسوب من with-stats (finalAmount الأدنى)
    images?: string[];
    subCategory?: string;
    // الحقول القديمة تبقى للـ fallback فقط
    measures?: string[];
    colors?: string[];
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
      startAt?: string;
      endAt?: string;
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

const isHexColor = (c: string) => /^#([0-9A-F]{3}){1,2}$/i.test(c);

const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();

  // صور الكارد
  const [currentImage, setCurrentImage] = useState(0);
  const images = product.images?.length
    ? product.images
    : ["https://i.imgur.com/PU1aG4t.jpeg"];

  // متغيّرات المنتج
  const [variants, setVariants] = useState<Variant[]>([]);
  const [vLoading, setVLoading] = useState(true);

  // اختيارات المستخدم (slugs)
  const [selectedMeasure, setSelectedMeasure] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // إشعار الإضافة
  const [showAdded, setShowAdded] = useState(false);

  // جلب المتغيّرات (من /api/variants لضمان الحقول المحسوبة)
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

        // تعيين افتراضيات ذكية: أول متغيّر
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

  // كل الألوان المعرفة عبر كل المتغيرات (لعرضها دائمًا لكن مع تعطيل غير المتاح)
  const allColorsFromVariants = useMemo(() => {
    const map = new Map<
      string,
      { slug: string; name: string; code?: string }
    >();
    for (const v of variants) {
      if (v.colorSlug) {
        map.set(v.colorSlug, {
          slug: v.colorSlug,
          name: v.color?.name || v.colorSlug,
          code: v.color?.code,
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

  // عند تغيير المقاس: لو اللون الحالي غير متاح، اختَر أول لون متاح تلقائيًا
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

  // السعر المعروض: finalAmount إن توفر للمتغيّر المختار، وإلا أقل سعر للمنتج (من with-stats)
  const variantFinal = currentVariant?.finalAmount;
  const variantCompare = currentVariant?.displayCompareAt ?? null;
  const displayPrice =
    typeof variantFinal === "number" ? variantFinal : product.price ?? 0;

  // نسبة الخصم (إن أمكن حسابها)
  const discountPercent =
    typeof variantFinal === "number" &&
    typeof variantCompare === "number" &&
    variantCompare > 0 &&
    variantFinal < variantCompare
      ? Math.round(((variantCompare - variantFinal) / variantCompare) * 100)
      : null;

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
        image: images?.[0] || "https://i.imgur.com/PU1aG4t.jpeg",
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

    // Fallback للسلوك القديم إن لا توجد Variants
    if (product.measures?.length && !selectedMeasure) {
      alert("يرجى اختيار المقاس قبل الإضافة للسلة");
      return;
    }
    if (product.colors?.length && !selectedColor) {
      alert("يرجى اختيار اللون قبل الإضافة للسلة");
      return;
    }
    const productForCart = {
      ...product,
      image: product.images?.[0] || "https://i.imgur.com/PU1aG4t.jpeg",
      selectedMeasure,
      selectedColor,
      price: product.price ?? 0,
    };
    addToCart(productForCart);
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1500);
  };

  const nextImage = () => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevImage = () =>
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="group border rounded-lg p-4 text-right hover:shadow relative flex flex-col justify-between h-full">
      {/* ✅ الصورة */}
      <div className="relative w-full h-64 mb-3 overflow-hidden rounded">
        {images.map((src, index) => (
          <img
            key={index}
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
          />
        ))}

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 transition-all duration-300 opacity-0 group-hover:opacity-100 z-20"
            >
              ◀
            </button>
            <button
              onClick={nextImage}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/50 hover:bg-white/80 text-black rounded-full px-3 py-1 shadow-lg border border-gray-300 transition-all duration-300 opacity-0 group-hover:opacity-100 z-20"
            >
              ▶
            </button>
          </>
        )}

        {/* بادج خصم إن وُجد */}
        {discountPercent !== null && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
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
      {(measuresFromVariants.length > 0 || product.measures?.length) && (
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
            {measuresFromVariants.length > 0
              ? measuresFromVariants.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.label}
                  </option>
                ))
              : (product.measures || []).map((m, i) => (
                  <option key={i} value={m}>
                    {m}
                  </option>
                ))}
          </select>
        </div>
      )}

      {/* ✅ اختيار اللون */}
      {(allColorsFromVariants.length > 0 || product.colors?.length) && (
        <div className="mb-2">
          <span className="text-sm font-medium">الألوان: </span>

          {allColorsFromVariants.length > 0 ? (
            <div className="flex gap-2 mt-1 flex-wrap">
              {allColorsFromVariants.map((c) => {
                const isAvailable =
                  selectedMeasure &&
                  availableColorSlugsForSelectedMeasure.has(c.slug);

                return (
                  <button
                    key={c.slug}
                    title={c.name}
                    onClick={() => isAvailable && setSelectedColor(c.slug)}
                    disabled={!isAvailable}
                    className={clsx(
                      "w-6 h-6 rounded-full border-2 transition",
                      selectedColor === c.slug && isAvailable
                        ? "border-black scale-110"
                        : "border-gray-300",
                      !isAvailable && "opacity-40 cursor-not-allowed"
                    )}
                    style={
                      c.code && isHexColor(c.code)
                        ? { backgroundColor: c.code }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2 mt-1">
              {(product.colors || []).map((color, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedColor(slugify(color))}
                  className={clsx(
                    "w-6 h-6 rounded-full border-2",
                    selectedColor === slugify(color)
                      ? "border-black scale-110"
                      : "border-gray-300"
                  )}
                  style={
                    isHexColor(color) ? { backgroundColor: color } : undefined
                  }
                  title={color}
                />
              ))}
            </div>
          )}
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
        <div className="absolute top-2 left-2 bg-black text-white text-sm px-3 py-1 rounded shadow animate-bounce z-10">
          ✅ تمت الإضافة!
        </div>
      )}
    </div>
  );
};

export default ProductCard;
