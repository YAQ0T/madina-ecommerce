import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

interface CartButtonProps {
  count: number;
}

const CartButton: React.FC<CartButtonProps> = ({ count }) => {
  return (
    <Link to="/cart">
      <Button variant="outline" size="icon" className="relative">
        <ShoppingCart className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-1 text-xs">
            {count}
          </span>
        )}
      </Button>
    </Link>
  );
};

export default CartButton;
