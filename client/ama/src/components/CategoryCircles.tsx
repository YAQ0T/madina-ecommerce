import React, { useMemo } from "react";

type CategoryGroup = {
  mainCategory: string;
  subCategories: string[];
};

type Props = {
  categories: CategoryGroup[];
  onFilter: (main: string, sub?: string) => void;
  selectedMain: string;
  selectedSub: string;
  loading?: boolean;

  /**
   * خريطة صور التصنيفات الفرعية (اختياري):
   * المفتاح: "MAIN:::SUB"
   * القيمة: رابط صورة
   */
  subCategoryImages?: Record<string, string>;
};

// صور للأقسام الرئيسية (اختياري)
const CATEGORY_IMAGES: Record<string, string> = {
  "لوازم نجارين": "https://i.imgur.com/aPYhaQW.png",
  "لوازم منجدين": "https://i.imgur.com/S9rjrsh.png",
  "مقابض ابواب": "https://i.imgur.com/UskLo6H.png",
  "مقابض خزائن": "https://i.imgur.com/AEyMjHc.png",
  "اكسسوارات مطابخ": "https://i.imgur.com/hlpu1oK.png",
  "اكسسوارات غرف نوم": "https://i.imgur.com/ZMr397G.png",
  "عدة وأدوات": "https://i.imgur.com/Hf5NvqJ.png",
  "مفصلات نجارين والامنيوم": "https://i.imgur.com/XHNtA14.png",
  "جوارير وسكك جوارير ومفصلات": "https://i.imgur.com/fE6zgKp.png",
  "أقمشة كنب": "https://i.imgur.com/bf8geWx.jpeg",
  "أصناف اضافية": "https://www.svgrepo.com/show/491692/plus-circle.svg", // احتياطي
  "لوازم أبواب": "https://i.imgur.com/UskLo6H.png", // احتياطي
  "كبسات مسامير و براغي": "https://i.imgur.com/CntFVhx.png", // احتياطي
};

// 👇 هنا تقدر تضيف صور التصنيفات الفرعية يدويًا (اختياري تمامًا)
const SUBCATEGORY_IMAGES: Record<string, string> = {};

const DEFAULT_MAIN_IMG =
  "https://placehold.co/240x240/png?text=%D8%AA%D8%B5%D9%86%D9%8A%D9%81";
const DEFAULT_SUB_IMG = "https://i.imgur.com/G9rP8ht.png";

function CircleItem({
  title,
  image,
  active = false,
  size = "lg",
  onClick,
}: {
  title: string;
  image?: string;
  active?: boolean;
  size?: "lg" | "sm";
  onClick?: () => void;
}) {
  // أحجام أصغر على الموبايل، أكبر تدريجيًا على الشاشات الكبيرة
  const dim =
    size === "lg"
      ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 xl:w-28 xl:h-28"
      : "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16";

  // ✅ تحديد البوردر راديوس حسب النوع
  const radius = size === "lg" ? "rounded-md" : "rounded-full";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center text-center focus:outline-none p-1"
      aria-pressed={active}
      title={title}
    >
      <span
        className={[
          radius,
          "overflow-hidden bg-white dark:bg-gray-900",
          "transition-all duration-300",
          active
            ? "ring-2 ring-black/20 dark:ring-white/30 scale-[1.03] shadow"
            : "hover:shadow-md",
          dim,
        ].join(" ")}
      >
        <img
          src={image || (size === "lg" ? DEFAULT_MAIN_IMG : DEFAULT_SUB_IMG)}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </span>
      <span
        className={[
          "mt-2 font-medium leading-tight line-clamp-1",
          size === "lg" ? "text-xs sm:text-sm" : "text-[10px] sm:text-xs",
          active
            ? "text-black dark:text-white"
            : "text-gray-800 dark:text-gray-100",
        ].join(" ")}
      >
        {title}
      </span>
    </button>
  );
}

function SkeletonCircle({ size = "lg" }: { size?: "lg" | "sm" }) {
  const dim =
    size === "lg"
      ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 xl:w-28 xl:h-28"
      : "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16";

  const radius = size === "lg" ? "rounded-md" : "rounded-full";

  return (
    <div className="flex flex-col items-center text-center animate-pulse">
      <div
        className={[radius, "bg-gray-200 dark:bg-gray-800", dim].join(" ")}
      />
      <div className="mt-2 h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

const CategoryCircles: React.FC<Props> = ({
  categories,
  onFilter,
  selectedMain,
  selectedSub,
  loading = false,
  subCategoryImages = {},
}) => {
  // ترتيب عربي + إزالة التكرار
  const normalized = useMemo(() => {
    const list = [...(categories || [])].map((c) => ({
      mainCategory: c.mainCategory,
      subCategories: Array.from(new Set(c.subCategories || [])),
    }));
    list.sort((a, b) => a.mainCategory.localeCompare(b.mainCategory, "ar"));
    list.forEach((g) =>
      g.subCategories.sort((a, b) => a.localeCompare(b, "ar"))
    );
    return list;
  }, [categories]);

  const activeGroup =
    selectedMain && selectedMain !== "الكل"
      ? normalized.find((g) => g.mainCategory === selectedMain)
      : undefined;

  // دمج صور الفروع
  const getSubImage = (main: string, sub: string): string | undefined => {
    const key = `${main}:::${sub}`;
    return subCategoryImages[key] || SUBCATEGORY_IMAGES[key] || undefined;
  };

  return (
    <section className="w-full text-right">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base sm:text-lg font-bold">تصفّح حسب الفئة</h2>
        {(selectedMain !== "الكل" || selectedSub) && (
          <button
            onClick={() => onFilter("الكل", "")}
            className="px-3 py-1.5 rounded-md text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            title="إظهار كل المنتجات"
          >
            الكل
          </button>
        )}
      </div>

      {/* الرئيسية */}
      <div className="relative">
        <div
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1"
          dir="rtl"
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={`sk-main-${i}`} className="snap-start shrink-0">
                  <SkeletonCircle size="lg" />
                </div>
              ))
            : normalized.map((group) => {
                const main = group.mainCategory;
                const active = selectedMain === main;
                const img = CATEGORY_IMAGES[main] || DEFAULT_MAIN_IMG;
                return (
                  <div key={main} className="snap-start shrink-0">
                    <CircleItem
                      title={main}
                      image={img}
                      active={active}
                      size="lg"
                      onClick={() =>
                        onFilter(main, selectedMain === main ? selectedSub : "")
                      }
                    />
                  </div>
                );
              })}
        </div>
      </div>

      {/* الفرعية */}
      {selectedMain !== "الكل" && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-semibold">
              {activeGroup?.mainCategory || selectedMain}
            </h3>
            {selectedSub ? (
              <button
                onClick={() => onFilter(selectedMain, "")}
                className="px-2.5 py-1 rounded-md text-[11px] sm:text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                title="إزالة الفرعي"
              >
                إزالة الفرعي
              </button>
            ) : (
              <span className="text-[11px] sm:text-xs text-gray-500">
                اختر فرعًا
              </span>
            )}
          </div>

          <div
            className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1"
            dir="rtl"
          >
            {loading && !activeGroup
              ? Array.from({ length: 10 }).map((_, i) => (
                  <div key={`sk-sub-${i}`} className="snap-start shrink-0">
                    <SkeletonCircle size="sm" />
                  </div>
                ))
              : (activeGroup?.subCategories || []).map((sub) => {
                  const img = getSubImage(selectedMain, sub) || DEFAULT_SUB_IMG;
                  return (
                    <div key={sub} className="snap-start shrink-0">
                      <CircleItem
                        title={sub}
                        image={img}
                        size="sm"
                        active={selectedSub === sub}
                        onClick={() => onFilter(selectedMain, sub)}
                      />
                    </div>
                  );
                })}

            {activeGroup && (
              <div className="snap-start shrink-0">
                <CircleItem
                  key="__all__"
                  title="الكل"
                  image={DEFAULT_SUB_IMG}
                  size="sm"
                  active={!selectedSub}
                  onClick={() => onFilter(selectedMain, "")}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default CategoryCircles;
