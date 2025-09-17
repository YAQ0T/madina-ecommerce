// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

// ====== أنواع بسيطة للمنتج ======
type Product = {
  _id?: string;
  id?: string | number;
  name?: string;
  title?: string;
  price?: number;
  images?: string[];
  image?: string;
  mainImage?: string;
  slug?: string;
};

// ====== الأقسام الرئيسية (دوائر) — سنستخدم title نفسه كاسم الفئة ======
const categories = [
  { title: "لوازم نجارين", img: "https://i.imgur.com/aPYhaQW.png" },
  { title: "لوازم منجدين", img: "https://i.imgur.com/S9rjrsh.png" },
  { title: "مقابض ابواب", img: "https://i.imgur.com/O9xXLeu.png" },
  { title: "مقابض خزائن", img: "https://i.imgur.com/AEyMjHc.png" },
  { title: "اكسسوارات مطابخ", img: "https://i.imgur.com/hlpu1oK.png" },
  { title: "إكسسوارات غرف نوم", img: "https://i.imgur.com/ZMr397G.png" },
  { title: "عدة وأدوات", img: "https://i.imgur.com/Hf5NvqJ.png" },
  {
    title: "جوارير وسكك ومفصلات",
    img: "https://i.imgur.com/fE6zgKp.png",
  },
  { title: "أقمشة كنب", img: "https://i.imgur.com/bf8geWx.jpeg" },
  {
    title: "كبسات مسامير و براغي",
    img: "https://i.imgur.com/CntFVhx.png",
  },
  { title: "لوازم أبواب", img: "https://i.imgur.com/UskLo6H.png" }, // احتياطي
  // { title: "مفصلات نجارين والامنيوم", img: "https://i.imgur.com/XHNtA14.png" }, // احتياطي
];

// ====== بطاقات المزايا 4 ======
const benefits = [
  {
    icon: "https://www.svgrepo.com/show/467670/delivery-truck.svg",
    title: "توصيل إلى كافة المدن",
    desc: "توصيل سريع وفي الموعد",
  },
  {
    icon: "https://www.svgrepo.com/show/469025/headset-alt.svg",
    title: "دعم أونلاين",
    desc: "فريق دعم مخصص من 8:30 صباحًا حتى 12:00 ليلًا",
  },
  {
    icon: "https://www.svgrepo.com/show/468385/credit-card-2.svg",
    title: "دفع آمن 100٪",
    desc: "جميع البطاقات مقبولة ومعالجة آمنة",
  },
  {
    icon: "https://www.svgrepo.com/show/468263/check-mark-circle.svg",
    title: "منتجات أصلية 100٪",
    desc: "ضمان الأصالة والجودة",
  },
];

// ====== عناصر افتراضية للمنتجات في حال عدم توفّر API ======
const fallbackProducts: Product[] = [
  {
    id: 1,
    name: "مقبض خزانة معدني",
    price: 29.9,
    image: "https://i.imgur.com/lu2y3pi.png",
  },
  {
    id: 2,
    name: "سحّاب درج هادئ",
    price: 49.0,
    image: "https://i.imgur.com/bf8geWx.jpeg",
  },
  {
    id: 3,
    name: "قماش كنب مقاوم للبقع",
    price: 89.0,
    image: "https://i.imgur.com/oW6JO0A.png",
  },
  {
    id: 4,
    name: "مفصلات هيدروليك",
    price: 39.5,
    image: "https://i.imgur.com/CCEly6H.jpeg",
  },
];

const getId = (p: Product) => p._id ?? p.id ?? p.slug ?? String(Math.random());
const getImage = (p: Product) =>
  p.images?.[0] ||
  p.image ||
  p.mainImage ||
  "https://placehold.co/600x400/png?text=No+Image";
const getName = (p: Product) => p.name || p.title || "منتج بدون اسم";

// ====== بطاقة منتج (مُصغّرة للموبايل) ======
const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const img = getImage(product);
  const name = getName(product);

  const detailId =
    (typeof product._id === "string" && product._id) ||
    (typeof product.id === "string" && product.id) ||
    (typeof product.id === "number" && String(product.id)) ||
    "";

  const goToDetails = () => {
    if (detailId) navigate(`/products/${detailId}`);
    else navigate(`/products`);
  };

  return (
    <div className="group rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      <button
        type="button"
        onClick={goToDetails}
        className="aspect-[3/4] w-full overflow-hidden bg-gray-50 dark:bg-gray-800 block"
        aria-label={`عرض تفاصيل ${name}`}
      >
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </button>
      <div className="p-3 sm:p-4 text-right">
        <h3 className="font-semibold line-clamp-1 text-sm sm:text-base">
          {name}
        </h3>
        {typeof product.price === "number" ? (
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
            {product.price.toFixed(2)} ₪
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
            السعر عند الاختيار
          </p>
        )}
        <div className="mt-2 sm:mt-3 flex justify-end">
          <Button
            variant="default"
            className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
            onClick={goToDetails}
          >
            عرض المنتج
          </Button>
        </div>
      </div>
    </div>
  );
};

// ====== مكوّن شبكة منتجات (ينادي API مع سقوط افتراضي) — موبايل أصغر ======
const ProductsSection = ({
  title,
  endpoint,
}: {
  title: string;
  endpoint: string; // مثال: "/api/home-collections/recommended"
}) => {
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const base = import.meta.env.VITE_API_URL || "";
        const url =
          endpoint.startsWith("http") || endpoint.startsWith("//")
            ? endpoint
            : `${base}${endpoint}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        const list: Product[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.data)
          ? data.data
          : [];
        if (!stop && list.length) setItems(list.slice(0, 8));
        if (!stop && !list.length) setItems(fallbackProducts);
      } catch {
        if (!stop) setItems(fallbackProducts);
      }
    })();
    return () => {
      stop = true;
    };
  }, [endpoint]);

  return (
    <section className="mt-10 sm:mt-14">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-right">
          {title}
        </h2>
        <Button
          variant="ghost"
          className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
          onClick={() => (window.location.href = "/products")}
        >
          تصفّح الكل
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {(items ?? fallbackProducts).map((p) => (
          <ProductCard key={getId(p)} product={p} />
        ))}
      </div>
    </section>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();

  const goToCategory = (main: string, sub?: string) => {
    const params = new URLSearchParams();
    params.set("category", main);
    if (sub) params.set("sub", sub);
    navigate(`/products?${params.toString()}`);
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-4 md:p-6">
        {/* البطل — أصغر للموبايل */}
        <section className="text-right">
          <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
            مرحبًا بكم في متجر ديكوري
          </h1>
          <p className="text-sm md:text-lg mb-5 md:mb-6 text-gray-700 dark:text-gray-200">
            هنا تجد أفضل مستلزمات النجارة وأقمشة التنجيد وخامات صناعة الكنب.
          </p>
          <div className="flex justify-end mb-6 md:mb-10">
            <Button
              className="h-9 px-4 text-sm md:h-10 md:px-5 md:text-base"
              onClick={() => navigate(`/products`)}
            >
              ابدأ التسوّق الآن
            </Button>
          </div>
        </section>

        {/* الأقسام الرئيسية () — أحجام أصغر للموبايل */}
        <section className="mt-2">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-right">
            تصفّح حسب الفئة
          </h2>
          <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
            {categories.map((c) => (
              <div
                key={c.title}
                onClick={() => goToCategory(c.title as string)}
                className="cursor-pointer flex flex-col items-center text-center"
              >
                <div
                  className="
                    w-20 h-20
                    sm:w-24 sm:h-24
                    md:w-28 md:h-28
                    lg:w-32 lg:h-32
                    xl:w-36 xl:h-36
                    rounded-md overflow-hidden
                    bg-white dark:bg-gray-900
                    border border-gray-200 dark:border-gray-700
                    shadow-sm hover:shadow-md transition-shadow duration-300
                  "
                >
                  <img
                    src={c.img}
                    alt={c.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="mt-2 sm:mt-3 text-[11px] sm:text-sm font-medium">
                  {c.title}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ماذا نقدّم (4 بطاقات فوائد) — مصغّر للموبايل */}
        <section className="mt-10 md:mt-14">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-right">
            ماذا نقدّم لعملائنا؟
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 sm:p-5 text-right hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex justify-end">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <img
                      src={b.icon}
                      alt={b.title}
                      className="w-6 h-6 sm:w-7 sm:h-7"
                      loading="lazy"
                    />
                  </div>
                </div>
                <h3 className="mt-3 sm:mt-4 font-semibold text-sm sm:text-base">
                  {b.title}
                </h3>
                <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* منتجات مقترحة — من home-collections */}
        <ProductsSection
          title="منتجات مُقترحة لك"
          endpoint="/api/home-collections/recommended"
        />

        {/* وصل حديثًا — من home-collections */}
        <ProductsSection
          title="وصل حديثًا"
          endpoint="/api/home-collections/new"
        />
      </main>
      <Footer />
    </>
  );
};

export default Home;
