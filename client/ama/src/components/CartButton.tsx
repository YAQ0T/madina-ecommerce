import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

const CartButton: React.FC = () => {
  const { cart } = useCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link to="/cart" className="relative">
      <ShoppingCart size={28} />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
};

export default CartButton;
