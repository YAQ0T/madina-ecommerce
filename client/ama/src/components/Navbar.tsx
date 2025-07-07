import React from "react";
import { Link } from "react-router-dom";
import CartButton from "@/components/CartButton";
import { Button } from "@/components/ui/button";

const Navbar: React.FC = () => {
  return (
    <header className="border-b mb-6">
      <nav className="container mx-auto p-4 flex items-center justify-between">
        {/* الشعار */}
        <Link to="/" className="text-2xl font-bold">
          المدينة المنورة
        </Link>

        {/* الروابط */}
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/">الرئيسية</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/products">المنتجات</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/about">من نحن</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/contact">تواصل معنا</Link>
          </Button>
        </div>

        {/* زر السلة */}
        <CartButton count={0} />
      </nav>
    </header>
  );
};

export default Navbar;
