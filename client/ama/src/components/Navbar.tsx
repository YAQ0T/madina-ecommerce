import React, { useState } from "react";
import { Link } from "react-router-dom";
import CartButton from "@/components/CartButton";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react"; // أيقونة ☰ من Lucide

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { name: "الرئيسية", path: "/" },
    { name: "المنتجات", path: "/products" },
    { name: "من نحن", path: "/about" },
    { name: "تواصل معنا", path: "/contact" },
    { name: "حسابي", path: "/account" },
    { name: "تسجيل الدخول", path: "/login" },
    { name: "تسجيل", path: "/register" },
  ];

  return (
    <header className="border-b mb-6">
      <nav className="container mx-auto p-4 flex items-center justify-between">
        {/* الشعار */}
        <Link to="/" className="text-2xl font-bold">
          المدينة المنورة
        </Link>

        {/* زر القائمة للجوال */}
        <div className="flex items-center gap-4 md:hidden">
          <CartButton count={0} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Menu />
          </Button>
        </div>

        {/* روابط الصفحة على الشاشات الكبيرة */}
        <div className="hidden md:flex gap-2 items-center">
          {links.map((link) => (
            <Button key={link.path} asChild variant="ghost">
              <Link to={link.path}>{link.name}</Link>
            </Button>
          ))}
          <CartButton count={0} />
        </div>
      </nav>

      {/* القائمة الجوالية */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-lg border-t py-4 px-6 space-y-3 text-right z-50">
          {links.map((link) => (
            <div key={link.path}>
              <Link
                to={link.path}
                className="block py-2 text-gray-800 font-medium hover:text-black"
                onClick={() => setMenuOpen(false)}
              >
                {link.name}
              </Link>
            </div>
          ))}
        </div>
      )}
    </header>
  );
};

export default Navbar;
