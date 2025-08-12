// src/pages/Products.tsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import CategorySidebar from "@/components/CategorySidebar";
import { useLocation } from "react-router-dom";
import axios from "axios";

type ProductItem = {
  _id: string;
  name: string;
  description: string; // غير اختياري
  images: string[]; // غير اختياري
  mainCategory?: string;
  subCategory?: string;

  // قيم قادمة من السيرفر
  minPrice?: number;
  totalStock?: number;

  // قيَم نهائية نمررها لـ ProductCard
  price: number; // غير اختياري
  quantity: number; // غير اختياري
};

const Products: React.FC = () => {
  const [selectedMainCategory, setSelectedMainCategory] = useState("الكل");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  // الترقيم (السيرفر سيرجع صفحة واحدة بالفعل)
  const [currentPage, setCurrentPage] = useState(1);

  // قراءة باراميتر category من الـ URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    if (category) setSelectedMainCategory(category);
  }, [location.search]);

  // جلب المنتجات + الإحصاءات (minPrice/totalStock) من السيرفر
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

      try {
        const url = `${
          import.meta.env.VITE_API_URL
        }/api/products/with-stats?${params.toString()}`;
        const res = await axios.get(url);
        if (ignore) return;

        const { items, totalPages: tp } = res.data || {
          items: [],
          totalPages: 1,
        };

        // توحيد الحقول مع ProductCard بقيم افتراضية آمنة
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
  ]);

  const handleCategorySelect = (main: string, sub: string = "") => {
    setSelectedMainCategory(main);
    setSelectedSubCategory(sub);
    setCurrentPage(1);
  };

  // تجميع الفئات
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
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
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
            </div>

            {products.length === 0 ? (
              <p className="text-center text-gray-600 text-lg">
                لا يوجد منتجات مطابقة للبحث
              </p>
            ) : (
              <>
                {/* الصفحة الحالية جاهزة من السيرفر */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* الترقيم */}
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
