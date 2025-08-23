// src/pages/Products.tsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import CategorySidebar from "@/components/CategorySidebar";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

type ProductItem = {
  _id: string;
  name: string;
  description: string;
  images: string[];
  mainCategory?: string;
  subCategory?: string;
  minPrice?: number;
  totalStock?: number;
  price: number;
  quantity: number;
};

type FacetItem = { name: string; slug: string };
type Facets = { measures: FacetItem[]; colors: FacetItem[] };
type OwnershipFilter = "all" | "ours" | "local";

const Products: React.FC = () => {
  const { user, token } = useAuth();
  const canUseOwnership = user?.role === "admin" || user?.role === "dealer";

  const [selectedMainCategory, setSelectedMainCategory] = useState("الكل");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [selectedColorSlug, setSelectedColorSlug] = useState("");
  const [selectedMeasureSlug, setSelectedMeasureSlug] = useState("");

  const [ownershipFilter, setOwnershipFilter] =
    useState<OwnershipFilter>("all");

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [facets, setFacets] = useState<Facets>({ measures: [], colors: [] });

  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ زر “المحدّثة هذا الأسبوع”
  const [recentDays, setRecentDays] = useState<number | null>(null); // null = إيقاف، >0 = فعّال
  const [recentTotal, setRecentTotal] = useState<number | null>(null); // عرض العدد كبادج

  useEffect(() => {
    if (!canUseOwnership && ownershipFilter !== "all") {
      setOwnershipFilter("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseOwnership]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    if (category) setSelectedMainCategory(category);
  }, [location.search]);

  // جلب Facets
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedMainCategory && selectedMainCategory !== "الكل") {
          params.set("mainCategory", selectedMainCategory);
        }
        if (selectedSubCategory) params.set("subCategory", selectedSubCategory);
        if (searchTerm) params.set("q", searchTerm);
        if (canUseOwnership && ownershipFilter !== "all") {
          params.set("ownership", ownershipFilter);
        }

        const url = `${
          import.meta.env.VITE_API_URL
        }/api/products/facets?${params.toString()}`;

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const { data } = await axios.get(url, { headers });
        if (ignore) return;

        const f: Facets = {
          measures: Array.isArray(data?.measures)
            ? data.measures.filter((m: any) => m?.slug && m?.name)
            : [],
          colors: Array.isArray(data?.colors)
            ? data.colors.filter((c: any) => c?.slug && c?.name)
            : [],
        };
        setFacets(f);

        if (
          f.colors.length &&
          !f.colors.some((c) => c.slug === selectedColorSlug)
        ) {
          setSelectedColorSlug("");
        }
        if (
          f.measures.length &&
          !f.measures.some((m) => m.slug === selectedMeasureSlug)
        ) {
          setSelectedMeasureSlug("");
        }
      } catch {
        setFacets({ measures: [], colors: [] });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [
    selectedMainCategory,
    selectedSubCategory,
    searchTerm,
    ownershipFilter,
    canUseOwnership,
    token,
  ]);

  // جلب المنتجات
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "9");
      if (selectedMainCategory && selectedMainCategory !== "الكل") {
        params.set("mainCategory", selectedMainCategory);
      }
      if (selectedSubCategory) params.set("subCategory", selectedSubCategory);
      if (searchTerm) params.set("q", searchTerm);
      if (maxPrice) params.set("maxPrice", maxPrice);

      if (canUseOwnership && ownershipFilter !== "all") {
        params.set("ownership", ownershipFilter);
      }

      const tags: string[] = [];
      if (selectedColorSlug) tags.push(`color:${selectedColorSlug}`);
      if (selectedMeasureSlug) tags.push(`measure:${selectedMeasureSlug}`);
      if (tags.length) params.set("tags", tags.join(","));

      try {
        const base = `${import.meta.env.VITE_API_URL}/api/products`;
        const url =
          recentDays && recentDays > 0
            ? `${base}/recent-updates?${params.toString()}&days=${recentDays}`
            : `${base}/with-stats?${params.toString()}`;

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;
        const res = await axios.get(url, { headers });
        if (ignore) return;

        const {
          items,
          totalPages: tp,
          total,
        } = res.data || {
          items: [],
          totalPages: 1,
          total: 0,
        };

        const mapped: ProductItem[] = (items || []).map((p: any) => ({
          _id: p._id,
          name: p.name ?? "",
          description: p.description ?? "",
          images: Array.isArray(p.images) ? p.images : [],
          mainCategory: p.mainCategory,
          subCategory: p.subCategory,
          minPrice: p.minPrice,
          totalStock: p.totalStock,
          price: typeof p.minPrice === "number" ? p.minPrice : 0,
          quantity: typeof p.totalStock === "number" ? p.totalStock : 0,
        }));

        setProducts(mapped);
        setTotalPages(tp || 1);

        // ✅ تحديث البادج لو الفلتر فعّال
        if (recentDays && recentDays > 0) {
          setRecentTotal(typeof total === "number" ? total : mapped.length);
        } else {
          setRecentTotal(null);
        }
      } catch {
        setProducts([]);
        setTotalPages(1);
        if (recentDays && recentDays > 0) setRecentTotal(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [
    currentPage,
    selectedMainCategory,
    selectedSubCategory,
    searchTerm,
    maxPrice,
    selectedColorSlug,
    selectedMeasureSlug,
    ownershipFilter,
    canUseOwnership,
    token,
    recentDays,
  ]);

  const handleCategorySelect = (main: string, sub: string = "") => {
    setSelectedMainCategory(main);
    setSelectedSubCategory(sub);
    setCurrentPage(1);
  };

  const categoryGroups = useMemo(() => {
    return products.reduce((acc, product) => {
      const { mainCategory, subCategory } = product;
      if (!mainCategory) return acc;

      const existing = acc.find(
        (cat: { mainCategory: string; subCategories: string[] }) =>
          cat.mainCategory === mainCategory
      );
      if (existing) {
        if (subCategory && !existing.subCategories.includes(subCategory)) {
          existing.subCategories.push(subCategory);
        }
      } else {
        acc.push({
          mainCategory,
          subCategories: subCategory ? [subCategory] : [],
        });
      }
      return acc;
    }, [] as { mainCategory: string; subCategories: string[] }[]);
  }, [products]);

  if (loading && products.length === 0) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-right">جميع المنتجات</h1>
          <p className="text-center text-gray-600 text-lg">جاري التحميل…</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-right">جميع المنتجات</h1>

          {/* زر “المحدّثة هذا الأسبوع” + البادج */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRecentDays((prev) => {
                  const next = prev ? null : 7;
                  setCurrentPage(1);
                  return next;
                });
              }}
              className={`relative px-3 py-2 rounded transition-colors duration-200 ${
                recentDays
                  ? "bg-black text-white"
                  : "bg-gray-100 text-black hover:bg-gray-300"
              }`}
              title="عرض المنتجات التي تم تحديثها خلال آخر 7 أيام"
            >
              {recentDays ? "إظهار الكل" : "آخر التحديثات"}
              {recentDays && typeof recentTotal === "number" && (
                <span className="absolute -top-2 -right-2 text-xs rounded-full bg-red-600 text-white px-2 py-0.5">
                  {recentTotal}
                </span>
              )}
            </button>

            {recentDays && (
              <select
                className="border rounded px-2 py-2"
                value={recentDays}
                onChange={(e) => {
                  const v = parseInt(e.target.value || "7", 10);
                  setRecentDays(Number.isFinite(v) && v > 0 ? v : 7);
                  setCurrentPage(1);
                }}
                title="عدد الأيام"
              >
                <option value={7}>آخر 7 أيام</option>
                <option value={14}>آخر 14 يوم</option>
                <option value={30}>آخر 30 يوم</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-1/4">
            <CategorySidebar
              categories={categoryGroups}
              onFilter={handleCategorySelect}
              selectedMain={selectedMainCategory}
              selectedSub={selectedSubCategory}
            />
          </aside>

          <section className="flex-1">
            {/* شريط الفلاتر العلوية */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                type="text"
                placeholder="ابحث باسم المنتج..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Input
                type="number"
                placeholder="سعر أقصى"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setCurrentPage(1);
                }}
              />

              {canUseOwnership && (
                <select
                  className="border rounded px-3 py-2"
                  value={ownershipFilter}
                  onChange={(e) => {
                    setOwnershipFilter(e.target.value as OwnershipFilter);
                    setCurrentPage(1);
                  }}
                  title="مصدر المنتج"
                >
                  <option value="all">كل المصادر</option>
                  <option value="ours">مصدر ١</option>
                  <option value="local">مصدر ٢</option>
                </select>
              )}
            </div>

            {/* فلاتر اللون/المقاس */}
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <select
                className="border rounded px-3 py-2"
                value={selectedColorSlug}
                onChange={(e) => {
                  setSelectedColorSlug(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">كل الألوان</option>
                {facets.colors.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-2"
                value={selectedMeasureSlug}
                onChange={(e) => {
                  setSelectedMeasureSlug(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">كل المقاسات</option>
                {facets.measures.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>

              {(selectedColorSlug || selectedMeasureSlug) && (
                <button
                  onClick={() => {
                    setSelectedColorSlug("");
                    setSelectedMeasureSlug("");
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
                >
                  مسح فلاتر اللون/المقاس
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <p className="text-center text-gray-600 text-lg">
                لا يوجد منتجات مطابقة للبحث
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                <div className="flex justify-center mt-6 gap-2">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 rounded transition-colors duration-200 ${
                        currentPage === i + 1
                          ? "bg-black text-white"
                          : "bg-gray-100 text-black hover:bg-gray-400"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Products;
