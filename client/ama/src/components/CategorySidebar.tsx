import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface CategorySidebarProps {
  categories: {
    mainCategory: string;
    subCategories: string[];
  }[];
  onFilter: (main: string, sub?: string) => void;
  selectedMain: string;
  selectedSub: string;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  onFilter,
  selectedMain,
  selectedSub,
}) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false); // فتح القائمة في الجوال

  const handleMainClick = (cat: string) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
    onFilter(cat);
  };

  return (
    <aside className="w-full">
      <h2 className="text-lg font-bold mb-4 text-right hidden xl:block">
        التصنيفات
      </h2>

      {/* زر فتح القائمة في الجوال */}
      <div className="xl:hidden mb-4 text-right">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-gray-100 px-4 py-2 rounded font-semibold"
        >
          التصنيفات {mobileOpen ? "▲" : "▼"}
        </button>
      </div>

      {/* القائمة نفسها */}
      <ul
        className={cn(
          "flex flex-col xl:space-y-2 text-right transition-all duration-300",
          mobileOpen ? "block" : "hidden xl:block"
        )}
      >
        {/* زر الكل */}
        <li className="relative">
          <div
            onClick={() => {
              setOpenCategory(null);
              onFilter("الكل", "");
              if (window.innerWidth < 1280) setMobileOpen(false);
            }}
            className={cn(
              "cursor-pointer font-medium px-2 py-1 rounded transition-colors",
              selectedMain === "الكل"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            )}
          >
            الكل
          </div>
        </li>

        {/* باقي التصنيفات */}
        {categories.map((cat) => {
          const isOpen = openCategory === cat.mainCategory;
          const isActive = selectedMain === cat.mainCategory;

          return (
            <li key={cat.mainCategory} className="relative">
              <div
                onClick={() => handleMainClick(cat.mainCategory)}
                className={cn(
                  "cursor-pointer font-medium px-2 py-1 rounded transition-colors flex justify-between items-center",
                  isActive ? "bg-black text-white" : "hover:bg-gray-100"
                )}
              >
                <span>{cat.mainCategory}</span>
                <span>{isOpen ? "▲" : "▼"}</span>
              </div>

              {isOpen && (
                <ul
                  className={cn(
                    "mt-1 text-sm space-y-1 text-gray-600 bg-white shadow-md rounded-md transition-all",
                    "flex flex-col items-center text-center",
                    "xl:items-start xl:text-right xl:min-w-[180px] xl:p-2"
                  )}
                >
                  {cat.subCategories.map((sub) => (
                    <li
                      key={sub}
                      onClick={() => {
                        onFilter(cat.mainCategory, sub);
                        if (window.innerWidth < 1280) {
                          setMobileOpen(false);
                          setOpenCategory(null);
                        }
                      }}
                      className={cn(
                        "cursor-pointer px-2 py-1 rounded transition-colors w-full",
                        selectedSub === sub
                          ? "bg-gray-700 text-white font-semibold"
                          : "hover:bg-gray-100"
                      )}
                    >
                      {sub}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default CategorySidebar;
