// src/components/CategorySidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CategorySidebarProps {
  categories: {
    mainCategory: string;
    subCategories: string[];
  }[];
  onFilter: (main: string, sub?: string) => void;
  selectedMain: string;
  selectedSub: string;
  loading?: boolean;
}

const CLOSED = "__closed__"; // ✅ قيمة حارسة بدل undefined

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  onFilter,
  selectedMain,
  selectedSub,
  loading = false,
}) => {
  // ✅ نجعل الـ Accordion "controlled" دائمًا باستخدام قيمة string
  const [openMain, setOpenMain] = useState<string>(CLOSED);
  const [openSheet, setOpenSheet] = useState(false); // للموبايل

  // افتح التصنيف المطابق للاختيار الحالي أو أغلقه للقيمة الحارسة
  useEffect(() => {
    setOpenMain(
      selectedMain && selectedMain !== "الكل" ? selectedMain : CLOSED
    );
  }, [selectedMain]);

  // ترتيب وتنظيف القوائم
  const normalized = useMemo(() => {
    const list = [...categories].map((c) => ({
      mainCategory: c.mainCategory,
      subCategories: Array.from(new Set(c.subCategories)),
    }));
    list.sort((a, b) => a.mainCategory.localeCompare(b.mainCategory, "ar"));
    list.forEach((g) =>
      g.subCategories.sort((a, b) => a.localeCompare(b, "ar"))
    );
    return list;
  }, [categories]);

  const SidebarBody = (
    <div className="space-y-2">
      {/* زر الكل */}
      <button
        className={cn(
          "w-full text-right px-3 py-2 rounded-md transition-colors",
          selectedMain === "الكل" ? "bg-black text-white" : "hover:bg-gray-100"
        )}
        onClick={() => {
          setOpenMain(CLOSED);
          onFilter("الكل", "");
          setOpenSheet(false);
        }}
        disabled={loading}
      >
        الكل
      </button>

      {/* حالة التحميل */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : normalized.length === 0 ? (
        <div className="text-sm text-gray-500 px-1">لا توجد تصنيفات متاحة.</div>
      ) : (
        <Accordion
          type="single"
          collapsible
          dir="rtl"
          // ✅ controlled دائمًا بقيمة string
          value={openMain}
          onValueChange={(v) => setOpenMain(v || CLOSED)}
          className="w-full"
        >
          {normalized.map((cat) => (
            <AccordionItem
              key={cat.mainCategory}
              value={cat.mainCategory}
              className="border-b"
            >
              <AccordionTrigger
                className={cn(
                  "px-3 py-2 rounded-md text-right",
                  openMain === cat.mainCategory ||
                    selectedMain === cat.mainCategory
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                )}
              >
                {cat.mainCategory}
              </AccordionTrigger>
              <AccordionContent className="px-2 pt-1 pb-2">
                <div className="flex flex-col gap-1">
                  {cat.subCategories.map((sub) => {
                    const active =
                      selectedMain === cat.mainCategory && selectedSub === sub;
                    return (
                      <button
                        key={sub}
                        onClick={() => {
                          onFilter(cat.mainCategory, sub);
                          setOpenSheet(false);
                        }}
                        className={cn(
                          "w-full text-right px-3 py-2 rounded-md transition-colors",
                          active
                            ? "bg-gray-700 text-white"
                            : "hover:bg-gray-100"
                        )}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );

  return (
    <aside className="w-full">
      {/* عنوان على الديسكتوب */}
      <h2 className="text-lg font-bold mb-4 text-right hidden lg:block">
        التصنيفات
      </h2>

      {/* جوّال: زر يفتح Sheet */}
      <div className="lg:hidden mb-4 text-right">
        <Sheet open={openSheet} onOpenChange={setOpenSheet}>
          <SheetTrigger asChild>
            <Button variant="secondary" className="font-semibold">
              التصنيفات
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[90vw] sm:w-[420px]"
            aria-describedby={undefined} // ✅ يمنع التحذير
          >
            <SheetHeader>
              <SheetTitle className="text-right">التصنيفات</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{SidebarBody}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ديسكتوب/تابلت: سايدبار ثابت */}
      <div className="hidden lg:block">{SidebarBody}</div>
    </aside>
  );
};

export default CategorySidebar;
