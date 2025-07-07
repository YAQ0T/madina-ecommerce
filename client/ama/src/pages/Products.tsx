import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Products: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-right">جميع المنتجات</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* منتج 1 */}
          <div className="border rounded-lg p-4 text-right hover:shadow">
            <img
              src="src\assets\iroko.jpg"
              alt="منتج 1"
              className="mb-3 w-full rounded"
            />
            <h3 className="text-lg font-medium mb-1">لوح خشب عالي الجودة</h3>
            <p className="text-gray-600 mb-2">
              لوح خشب متين للأعمال الاحترافية.
            </p>
            <p className="font-bold mb-2">₪150</p>
            <Button className="w-full">إضافة للسلة</Button>
          </div>
          {/* منتج 2 */}
          <div className="border rounded-lg p-4 text-right hover:shadow">
            <img
              src="src\assets\iroko.jpg"
              alt="منتج 2"
              className="mb-3 w-full rounded"
            />
            <h3 className="text-lg font-medium mb-1">قماش تنجيد فاخر</h3>
            <p className="text-gray-600 mb-2">
              قماش مقاوم للتآكل بألوان متعددة.
            </p>
            <p className="font-bold mb-2">₪90</p>
            <Button className="w-full">إضافة للسلة</Button>
          </div>
          {/* منتج 3 */}
          <div className="border rounded-lg p-4 text-right hover:shadow">
            <img
              src="src\assets\iroko.jpg"
              alt="منتج 3"
              className="mb-3 w-full rounded"
            />
            <h3 className="text-lg font-medium mb-1">إسفنج تنجيد 10 سم</h3>
            <p className="text-gray-600 mb-2">
              إسفنج عالي الكثافة لصناعة الكنب.
            </p>
            <p className="font-bold mb-2">₪60</p>
            <Button className="w-full">إضافة للسلة</Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Products;
