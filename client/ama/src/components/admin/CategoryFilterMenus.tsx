// src/components/admin/CategoryFilterMenus.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CategoryFilterMenusProps {
  selectedMainCategory: string;
  setSelectedMainCategory: (value: string) => void;
  productFilter: string;
  setProductFilter: (value: string) => void;
  categoryMap: Record<string, Set<string>>;
}

const CategoryFilterMenus: React.FC<CategoryFilterMenusProps> = ({
  selectedMainCategory,
  setSelectedMainCategory,
  setProductFilter,
  categoryMap,
}) => {
  return (
    <div className="flex gap-2">
      {/* 🔽 تصفية حسب التصنيف الفرعي */}
      {selectedMainCategory !== "all" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">🧮 تصفية فرعية</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Array.from(categoryMap[selectedMainCategory] || []).map((sub) => (
              <DropdownMenuItem
                key={String(sub)}
                onClick={() => setProductFilter(sub as string)}
              >
                {String(sub)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 🔽 تصفية حسب التصنيف الرئيسي */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">🧮 تصفية رئيسية</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setSelectedMainCategory("all");
              setProductFilter("all");
            }}
          >
            الكل
          </DropdownMenuItem>

          {Object.keys(categoryMap).map((main) => (
            <DropdownMenuItem
              key={main}
              onClick={() => {
                setSelectedMainCategory(main);
                setProductFilter(main);
              }}
            >
              {main}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CategoryFilterMenus;
