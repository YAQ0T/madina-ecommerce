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
  const canUseOwnership = user?.role === "admin" || user?.role === "dealer"; // ✅ فقط الأدمن/التاجر

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

  // لو صار المستخدم غير مخوّل، نرجّع الفلتر إلى "all"
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

  // جلب الـ Facets (مع فلتر الملكية للأدمن/التاجر فقط)
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
          params.set("ownership", ownershipFilter); // ✅ أرسل فقط لو مخوّل
        }

        const url = `${
          import.meta.env.VITE_API_URL
        }/api/products/facets?${params.toString()}`;

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined; // ✅ حتى يقرأ السيرفر الدور

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
      } catch (err) {
        console.error("❌ Failed to fetch facets", err);
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
    canUseOwnership, // ✅ تعيد الجلب لو تغيّرت صلاحية الدور
    token, // ✅ نمرّر الهيدر لما يتوفّر
  ]);

  // جلب المنتجات (مع فلتر الملكية للأدمن/التاجر فقط)
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
        params.set("ownership", ownershipFilter); // ✅ ours | local فقط لو مخوّل
      }

      const tags: string[] = [];
      if (selectedColorSlug) tags.push(`color:${selectedColorSlug}`);
      if (selectedMeasureSlug) tags.push(`measure:${selectedMeasureSlug}`);
      if (tags.length) params.set("tags", tags.join(","));

      try {
        const url = `${
          import.meta.env.VITE_API_URL
        }/api/products/with-stats?${params.toString()}`;

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined; // ✅ تمرير التوكن (اختياري)

        const res = await axios.get(url, { headers });
        if (ignore) return;

        const { items, totalPages: tp } = res.data || {
          items: [],
          totalPages: 1,
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
      } catch (err) {
        console.error("❌ Failed to fetch products with stats", err);
        setProducts([]);
        setTotalPages(1);
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
    canUseOwnership, // ✅
    token, // ✅
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
        <h1 className="text-3xl font-bold mb-6 text-right">جميع المنتجات</h1>

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

              {/* ✅ فلتر الملكية يظهر فقط للأدمن/التاجر */}
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
                  <option value="ours">على اسمنا (ours)</option>
                  <option value="local">محلي (local)</option>
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
