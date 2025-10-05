import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CartButton from "@/components/CartButton";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useTranslation } from "@/i18n";
// import OfferBanner from "./common/OfferBanner";

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // const [showBanner, setShowBanner] = useState(true);
  // const bannerinfo = useRef(
  //   "خصم اجمالي على كل الفواتير الاعلى من ١٠٠٠ شيقل بقيمه ٥٪"
  // );
  const showThemeToggle = !user || user.role !== "admin";
  const baseLinks = useMemo(
    () => [
      { key: "home", path: "/" },
      { key: "products", path: "/products" },
      { key: "about", path: "/about" },
      { key: "contact", path: "/contact" },
      { key: "account", path: "/account" },
    ],
    []
  );

  const links = useMemo(() => {
    const result = [...baseLinks];
    if (user && user.role === "admin") {
      result.push({ key: "dashboard", path: "/admin" });
    }
    return result.map((link) => ({
      ...link,
      name: t(`navbar.links.${link.key}` as const),
    }));
  }, [baseLinks, t, user]);

  return (
    <header className="sticky top-0 inset-x-0 z-50 border-b bg-white/90 dark:bg-slate-950/90 backdrop-blur shadow-sm mb-6">
      {/* {showBanner && (
        <OfferBanner
          message={bannerinfo.current}
          onClose={() => setShowBanner(false)}
        />
      )} */}

      <nav className="container mx-auto flex items-center justify-between px-4 py-2 sm:px-6">
        {/* الشعار */}
        <div className="flex items-center gap-1.5">
          <LanguageToggle className="w-24" />
          {showThemeToggle && <ThemeToggle />}
        </div>
        <Link to="/" className="text-xl font-semibold tracking-tight md:text-2xl min-w-45">
          {t("navbar.brand")}
        </Link>
        {/* <div className="bg-testRed">لو ظهر أحمر، كل شيء تمام</div> */}

        {/* زر القائمة للجوال */}
        <div className="flex items-center gap-2 lg:hidden">
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
        <div className="hidden lg:flex items-center gap-1.5">
          {links.map((link) => (
            <Button key={link.path} asChild variant="ghost">
              <Link to={link.path}>{link.name}</Link>
            </Button>
          ))}

          {!user && (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">{t("navbar.auth.login")}</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/register">{t("navbar.auth.register")}</Link>
              </Button>
            </>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t("navbar.auth.greeting", { name: user.name })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                {t("navbar.auth.logout")}
              </Button>
            </div>
          )}

          <CartButton />
        </div>
      </nav>
      {/* القائمة الجوالية */}
      {menuOpen && (
        <div className="lg:hidden relative z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur shadow-lg border-t py-4 px-6 space-y-3 text-right">
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
                {t("navbar.auth.login")}
              </Link>
              <Link
                to="/register"
                className="block py-2 text-gray-800 font-medium hover:text-black"
                onClick={() => setMenuOpen(false)}
              >
                {t("navbar.auth.register")}
              </Link>
            </>
          )}

          {user && (
            <>
              <span className="block py-2 text-gray-800 font-medium">
                {t("navbar.auth.greeting", { name: user.name })}
              </span>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                  navigate("/login");
                }}
                className="block w-full text-right py-2 text-red-600 font-medium hover:text-red-800"
              >
                {t("navbar.auth.logout")}
              </button>
            </>
          )}

          <LanguageToggle className="w-full" />
        </div>
      )}
    </header>
  );
};

export default Navbar;
