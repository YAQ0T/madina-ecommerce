import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Cart: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-right">سلة المشتريات</h1>

        {/* تصميم جدول لــ md وأكبر */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border text-right">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border">المنتج</th>
                <th className="py-2 px-4 border">السعر</th>
                <th className="py-2 px-4 border">الكمية</th>
                <th className="py-2 px-4 border">الإجمالي</th>
                <th className="py-2 px-4 border">إزالة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-4 border">لوح خشب عالي الجودة</td>
                <td className="py-2 px-4 border">₪150</td>
                <td className="py-2 px-4 border">1</td>
                <td className="py-2 px-4 border">₪150</td>
                <td className="py-2 px-4 border">
                  <Button variant="destructive" size="sm">
                    إزالة
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* تصميم Card للموبايل */}
        <div className="grid gap-4 md:hidden">
          <div className="border rounded-lg p-4 text-right">
            <h3 className="text-lg font-semibold mb-2">لوح خشب عالي الجودة</h3>
            <p className="text-gray-600 mb-1">السعر: ₪150</p>
            <p className="text-gray-600 mb-1">الكمية: 1</p>
            <p className="text-gray-700 font-semibold mb-3">الإجمالي: ₪150</p>
            <Button variant="destructive" size="sm">
              إزالة
            </Button>
          </div>
        </div>

        {/* المجموع وزر إتمام */}
        <div className="mt-6 flex justify-between items-center flex-col md:flex-row gap-4">
          <p className="text-xl font-semibold text-right">
            المجموع الكلي: <span className="text-green-600">₪150</span>
          </p>
          <Button>إتمام الطلب</Button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Cart;
