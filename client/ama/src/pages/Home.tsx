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
  {
    title: "مستلزمات نجارين",
    img: "https://i.imgur.com/BEfwYpQ.png",
  },
  {
    title: "سحّابات ومفصلات",
    img: "https://i.imgur.com/bf8geWx.jpeg",
  },
  {
    title: "مستلزمات مُنجّدين",
    img: "https://i.imgur.com/oW6JO0A.png",
  },
  {
    title: "مقابض ابواب",
    img: "https://i.imgur.com/uazWZhd.jpeg",
  },
  {
    title: "مقابض خزائن",
    img: "https://i.imgur.com/lu2y3pi.png",
  },
  {
    title: "إكسسوارات مطابخ",
    img: "https://i.imgur.com/CCEly6H.jpeg",
  },
  {
    title: "إكسسوارات غرف نوم",
    img: "https://i.imgur.com/uazWZhd.jpeg",
  },
  {
    title: "أقمشة كنب",
    img: "https://i.imgur.com/bf8geWx.jpeg",
  },
];

// ====== بطاقات المزايا 4 ======
const benefits = [
  {
    icon: "https://www.svgrepo.com/show/467670/delivery-truck.svg",
    title: "توصيل إلى كافة المدن",
    desc: "الضفة الغربية وداخل الخط الأخضر • توصيل سريع وفي الموعد",
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

// ====== بطاقة منتج بسيطة ======
const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const img = getImage(product);
  const name = getName(product);

  // 👇 هذا هو المعرّف الذي سنستخدمه في التوجيه
  const detailId =
    (typeof product._id === "string" && product._id) ||
    (typeof product.id === "string" && product.id) ||
    (typeof product.id === "number" && String(product.id)) ||
    "";

  const goToDetails = () => {
    if (detailId) {
      // تأكد أن عندك Route: /products/:id يحمّل ProductDetails
      navigate(`/products/${detailId}`);
    } else {
      // احتياطي لو ما لقيْنا معرّف صالح
      navigate(`/products`);
    }
  };

  return (
    <div className="group rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      <button
        type="button"
        onClick={goToDetails}
        className="aspect-[4/3] w-full overflow-hidden bg-gray-50 dark:bg-gray-800 block"
        aria-label={`عرض تفاصيل ${name}`}
      >
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </button>
      <div className="p-4 text-right">
        <h3 className="font-semibold line-clamp-1">{name}</h3>
        {typeof product.price === "number" ? (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {product.price.toFixed(2)} ₪
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            السعر عند الاختيار
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <Button variant="default" className="text-sm" onClick={goToDetails}>
            عرض المنتج
          </Button>
        </div>
      </div>
    </div>
  );
};

// ====== مكوّن شبكة منتجات (ينادي API مع سقوط افتراضي) ======
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
    <section className="mt-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-right">{title}</h2>
        <Button
          variant="ghost"
          className="text-sm"
          onClick={() => (window.location.href = "/products")}
        >
          تصفّح الكل
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
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
      <main className="container mx-auto p-6">
        {/* البطل */}
        <section className="text-right">
          <h1 className="text-4xl font-bold mb-4">مرحبًا بكم في متجر ديكوري</h1>
          <p className="text-lg mb-6 text-gray-700 dark:text-gray-200">
            هنا تجد أفضل مستلزمات النجارة وأقمشة التنجيد وخامات صناعة الكنب.
          </p>
          <div className="flex justify-end mb-10">
            <Button className="text-base" onClick={() => navigate(`/products`)}>
              ابدأ التسوّق الآن
            </Button>
          </div>
        </section>

        {/* الأقسام الرئيسية (دوائر) */}
        <section className="mt-4">
          <h2 className="text-2xl font-semibold mb-6 text-right">
            تصفّح حسب الفئة
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-6">
            {categories.map((c) => (
              <div
                key={c.title}
                onClick={() => goToCategory(c.title as string)}
                className="cursor-pointer flex flex-col items-center text-center"
              >
                <div className="w-36 h-36 rounded-full overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="mt-3 text-sm font-medium">{c.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ماذا نقدّم (4 بطاقات فوائد) */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold mb-6 text-right">
            ماذا نقدّم لعملائنا؟
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-right hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex justify-end">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <img
                      src={b.icon}
                      alt={b.title}
                      className="w-7 h-7"
                      loading="lazy"
                    />
                  </div>
                </div>
                <h3 className="mt-4 font-semibold">{b.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
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
