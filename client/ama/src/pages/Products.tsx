// src/pages/Products.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import CategorySidebar from "@/components/CategorySidebar";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

// shadcn/ui
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type CategoryGroup = { mainCategory: string; subCategories: string[] };

// 🔢 حجم نافذة أرقام الصفحات المرئية
const PAGE_WINDOW = 5;

// 🧮 يبني قائمة الصفحات مع نقاط الحذف …
// يعيد مصفوفة مثل: [1, 2, 3, 4, 5, 'ellipsis', 20]
function buildPageWindow(
  current: number,
  total: number,
  windowSize: number = PAGE_WINDOW
): (number | "ellipsis")[] {
  if (total <= windowSize) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  const first = 1;
  const last = total;

  const half = Math.floor(windowSize / 2);
  let start = Math.max(first, current - half);
  let end = Math.min(last, start + windowSize - 1);

  if (end - start + 1 < windowSize) {
    start = Math.max(first, end - windowSize + 1);
  }

  // الصفحة الأولى + … إن لزم
  if (start > first) {
    pages.push(first);
    if (start > first + 1) pages.push("ellipsis");
  }

  // نافذة الأرقام
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  // … + الصفحة الأخيرة إن لزم
  if (end < last) {
    if (end < last - 1) pages.push("ellipsis");
    pages.push(last);
  }

  return pages;
}

const Products: React.FC = () => {
  const { user, token } = useAuth();
  const canUseOwnership = user?.role === "admin" || user?.role === "dealer";

  const [selectedMainCategory, setSelectedMainCategory] = useState("الكل");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  // 🔎 البحث اليدوي بالاسم:
  const [rawSearch, setRawSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 💰 السعر الأقصى اليدوي:
  const [rawMaxPrice, setRawMaxPrice] = useState("");
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

  // زر “المحدّثة هذا الأسبوع”
  const [recentDays, setRecentDays] = useState<number | null>(null);
  const [recentTotal, setRecentTotal] = useState<number | null>(null);

  // شجرة التصنيفات الشاملة — تُحمّل مرة عند دخول الصفحة فقط
  const [categoryMenu, setCategoryMenu] = useState<CategoryGroup[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);

  // اقتراحات البحث بالاسم
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchBoxWrapperRef = useRef<HTMLDivElement | null>(null);
  const maxPriceRef = useRef<HTMLInputElement | null>(null);

  // عند تفعيل/تثبيت بحث جديد، عد للصفحة الأولى وابقِ الفوكس
  useEffect(() => {
    setCurrentPage(1);
    searchRef.current?.focus();
  }, [searchTerm]);

  // منع تغيير فلتر الملكية لغير المصرّح لهم
  useEffect(() => {
    if (!canUseOwnership && ownershipFilter !== "all") {
      setOwnershipFilter("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseOwnership]);

  // قراءة بارام الفئة من المسار
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    if (category) setSelectedMainCategory(category);
  }, [location.search]);

  // جلب Facets (ألوان/مقاسات)
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
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (canUseOwnership && ownershipFilter !== "all") {
          params.set("ownership", ownershipFilter);
        }
        if (recentDays && recentDays > 0)
          params.set("days", String(recentDays));

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
    maxPrice,
    ownershipFilter,
    canUseOwnership,
    token,
    recentDays,
    selectedColorSlug,
    selectedMeasureSlug,
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

        if (recentDays && recentDays > 0) {
          setRecentTotal(typeof total === "number" ? total : mapped.length);
        } else {
          setRecentTotal(null);
        }
      } catch {
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

  // حمّل شجرة التصنيفات مرة واحدة فقط عند الدخول
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingCategories(true);
      try {
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;
        const base = `${import.meta.env.VITE_API_URL}/api/products`;

        const PER_PAGE = 100;
        const firstParams = new URLSearchParams();
        firstParams.set("page", "1");
        firstParams.set("limit", String(PER_PAGE));

        const firstUrl = `${base}/with-stats?${firstParams.toString()}`;
        const firstRes = await axios.get(firstUrl, { headers });
        if (ignore) return;

        const firstData = firstRes.data || { items: [], totalPages: 1 };
        const totalPagesAll = Math.max(1, Number(firstData.totalPages) || 1);

        const map = new Map<string, Set<string>>();
        const consume = (items: any[]) => {
          for (const p of items || []) {
            const main = p?.mainCategory;
            const sub = p?.subCategory;
            if (!main) continue;
            if (!map.has(main)) map.set(main, new Set<string>());
            if (sub) map.get(main)!.add(sub);
          }
        };

        consume(firstData.items || []);

        const MAX_PAGES = 20;
        const pagesToFetch = Math.min(totalPagesAll, MAX_PAGES);

        const requests: Promise<any>[] = [];
        for (let page = 2; page <= pagesToFetch; page++) {
          const params = new URLSearchParams();
          params.set("page", String(page));
          params.set("limit", String(PER_PAGE));
          const url = `${base}/with-stats?${params.toString()}`;
          requests.push(
            axios
              .get(url, { headers })
              .then((res) => res.data)
              .catch(() => null)
          );
        }

        const pages = await Promise.all(requests);
        if (ignore) return;

        for (const pageData of pages) {
          if (!pageData?.items) continue;
          consume(pageData.items);
        }

        const groups: CategoryGroup[] = Array.from(map.entries()).map(
          ([main, subs]) => ({
            mainCategory: main,
            subCategories: Array.from(subs.values()),
          })
        );

        groups.sort((a, b) =>
          a.mainCategory.localeCompare(b.mainCategory, "ar")
        );
        groups.forEach((g) =>
          g.subCategories.sort((a, b) => a.localeCompare(b, "ar"))
        );

        setCategoryMenu(groups);
      } catch {
        // تجاهل الخطأ للحفاظ على القائمة الحالية
      } finally {
        setLoadingCategories(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [token]);

  // اقتراحات البحث
  useEffect(() => {
    let active = true;
    if (!rawSearch.trim()) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "10");
        params.set("q", rawSearch.trim());

        const url = `${
          import.meta.env.VITE_API_URL
        }/api/products/with-stats?${params.toString()}`;
        const res = await axios.get(url, { headers });
        if (!active) return;

        const names = Array.from(
          new Set(
            (res.data?.items || [])
              .map((p: any) => p?.name)
              .filter((n: any) => typeof n === "string" && n.trim())
          )
        ) as string[];

        setSuggestions(names.slice(0, 10));
      } catch {
        if (!active) return;
        setSuggestions([]);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [rawSearch, token]);

  // إغلاق قائمة الاقتراحات عند الضغط خارج صندوق البحث
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!searchBoxWrapperRef.current) return;
      if (!searchBoxWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleCategorySelect = (main: string, sub: string = "") => {
    if (main === selectedMainCategory && sub === selectedSubCategory) return;
    setSelectedMainCategory(main);
    setSelectedSubCategory(sub);
    setCurrentPage(1);
    searchRef.current?.focus();
  };

  // احتياطي: ليس مصدر القائمة الآن
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

  // 🔎 تثبيت البحث عند Enter أو الضغط على الأيقونة
  const triggerSearch = () => {
    setSearchTerm(rawSearch.trim());
    setShowSuggestions(false);
    setHighlightIndex(-1);
  };

  // 💰 تثبيت السعر الأقصى عند Enter أو الضغط على زر التطبيق
  const triggerMaxPrice = () => {
    const v = rawMaxPrice.trim();
    setMaxPrice(v);
    setCurrentPage(1);
    maxPriceRef.current?.focus();
  };

  const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    e
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSuggestions) setShowSuggestions(true);
      setHighlightIndex((prev) =>
        Math.min((prev < 0 ? -1 : prev) + 1, suggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && highlightIndex >= 0) {
        const chosen = suggestions[highlightIndex];
        if (chosen) {
          setRawSearch(chosen);
        }
      }
      triggerSearch();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  };

  const handleMaxPriceKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    e
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerMaxPrice();
    }
  };

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

  // ⚙️ بيانات الترقيم
  const pageItems = buildPageWindow(currentPage, totalPages, PAGE_WINDOW);

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
              categories={categoryMenu.length ? categoryMenu : categoryGroups}
              onFilter={handleCategorySelect}
              selectedMain={selectedMainCategory}
              selectedSub={selectedSubCategory}
              loading={loadingCategories}
            />
          </aside>

          <section className="flex-1">
            {/* شريط الفلاتر العلوية */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              {/* مجموعة البحث: Input + زر أيقونة + اقتراحات */}
              <div
                className="relative flex w-full sm:max-w-xl"
                ref={searchBoxWrapperRef}
              >
                <Input
                  ref={searchRef}
                  type="text"
                  placeholder="ابحث باسم المنتج..."
                  value={rawSearch}
                  autoComplete="off"
                  onChange={(e) => {
                    setRawSearch(e.target.value);
                    setShowSuggestions(true);
                    setHighlightIndex(-1);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => rawSearch && setShowSuggestions(true)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={triggerSearch}
                  className="absolute inset-y-0 left-0 sm:left-auto sm:right-0 sm:inset-y-0 flex items-center justify-center w-12 bg-black text-white rounded-r-md sm:rounded-l-none sm:rounded-r-md hover:bg-gray-800"
                  title="بحث"
                >
                  {/* أيقونة عدسة */}
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>

                {/* قائمة الاقتراحات */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    className="absolute top-full mt-1 w-full z-20 bg-white border rounded-md shadow-lg max-h-64 overflow-auto text-right"
                    role="listbox"
                  >
                    {suggestions.map((s, idx) => (
                      <li
                        key={`${s}-${idx}`}
                        role="option"
                        aria-selected={idx === highlightIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setRawSearch(s);
                          setShowSuggestions(false);
                          setHighlightIndex(-1);
                          setTimeout(() => triggerSearch(), 0);
                        }}
                        className={`px-3 py-2 cursor-pointer transition-colors ${
                          idx === highlightIndex
                            ? "bg-gray-200"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* مجموعة السعر الأقصى: Input + زر تطبيق */}
              <div className="relative flex w-full sm:max-w-xs">
                <Input
                  ref={maxPriceRef}
                  type="number"
                  placeholder="سعر أقصى"
                  value={rawMaxPrice}
                  onChange={(e) => setRawMaxPrice(e.target.value)}
                  onKeyDown={handleMaxPriceKeyDown}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={triggerMaxPrice}
                  className="absolute inset-y-0 left-0 sm:left-auto sm:right-0 sm:inset-y-0 flex items-center justify-center px-3 bg-black text-white rounded-r-md sm:rounded-l-none sm:rounded-r-md hover:bg-gray-800"
                  title="تطبيق السعر"
                >
                  تطبيق
                </button>
              </div>

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

                {/* 🔻 شريط الترقيم باستخدام shadcn/ui */}
                <div className="mt-6 flex flex-col items-center gap-4">
                  <Pagination>
                    <PaginationContent className="rtl:flex-row-reverse">
                      {/* السابق */}
                      <PaginationItem>
                        <PaginationPrevious
                          size="default"
                          href="#"
                          aria-disabled={currentPage === 1}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1)
                              setCurrentPage((p) => Math.max(1, p - 1));
                          }}
                        />
                      </PaginationItem>

                      {/* أرقام الصفحات مع … */}
                      {pageItems.map((item, idx) =>
                        item === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink
                              size="default"
                              href="#"
                              isActive={currentPage === item}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      {/* التالي */}
                      <PaginationItem>
                        <PaginationNext
                          size="default"
                          href="#"
                          aria-disabled={currentPage === totalPages}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                              setCurrentPage((p) =>
                                Math.min(totalPages, p + 1)
                              );
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  {/* القائمة المنسدلة للقفز لأي صفحة بسرعة */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      اذهب إلى صفحة:
                    </span>
                    <Select
                      value={String(currentPage)}
                      onValueChange={(v) => setCurrentPage(Number(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="اختر صفحة" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-500">
                      من أصل {totalPages}
                    </span>
                  </div>
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
