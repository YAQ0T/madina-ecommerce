import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CartButton from "@/components/CartButton";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import OfferBanner from "./common/OfferBanner";

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  const bannerinfo = useRef(
    "خصم اجمالي على كل الفواتير الاعلى من ١٠٠٠ شيقل بقيمه ٥٪"
  );
  const links = [
    { name: "الرئيسية", path: "/" },
    { name: "المنتجات", path: "/products" },
    { name: "من نحن", path: "/about" },
    { name: "تواصل معنا", path: "/contact" },
    { name: "حسابي", path: "/account" },
  ];
  if (user && user.role === "admin") {
    links.push({ name: "لوحة التحكم", path: "/admin" });
  }

  return (
    <header className="border-b mb-6">
      {showBanner && (
        <OfferBanner
          message={bannerinfo.current}
          onClose={() => setShowBanner(false)}
        />
      )}

      <nav className="container mx-auto p-4 flex items-center justify-between">
        {/* الشعار */}
        {!user && <ThemeToggle />}
        {user && user.role != "admin" && <ThemeToggle />}
        <Link to="/" className="text-2xl font-bold min-w-45">
          Dikori | ديكوري
        </Link>
        {/* <div className="bg-testRed">لو ظهر أحمر، كل شيء تمام</div> */}

        {/* زر القائمة للجوال */}
        <div className="flex items-center gap-4 lg:hidden">
          <CartButton />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Menu />
          </Button>
        </div>

        {/* روابط الصفحة على الشاشات الكبيرة */}
        <div className="hidden lg:flex gap-2 items-center">
          {links.map((link) => (
            <Button key={link.path} asChild variant="ghost">
              <Link to={link.path}>{link.name}</Link>
            </Button>
          ))}

          {!user && (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/register">انشاء حساب</Link>
              </Button>
            </>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">أهلاً، {user.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                تسجيل الخروج
              </Button>
            </div>
          )}

          <CartButton />
        </div>
      </nav>
      {/* القائمة الجوالية */}
      {menuOpen && (
        <div className="lg:hidden bg-white shadow-lg border-t py-4 px-6 space-y-3 text-right z-50">
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

          {!user && (
            <>
              <Link
                to="/login"
                className="block py-2 text-gray-800 font-medium hover:text-black"
                onClick={() => setMenuOpen(false)}
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/register"
                className="block py-2 text-gray-800 font-medium hover:text-black"
                onClick={() => setMenuOpen(false)}
              >
                انشاء حساب
              </Link>
            </>
          )}

          {user && (
            <>
              <span className="block py-2 text-gray-800 font-medium">
                أهلاً، {user.name}
              </span>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                  navigate("/login");
                }}
                className="block w-full text-right py-2 text-red-600 font-medium hover:text-red-800"
              >
                تسجيل الخروج
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
