import React from "react";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  image: string;
  title: string;
  description: string;
  price: number;
}

const ProductCard: React.FC<ProductCardProps> = ({
  image,
  title,
  description,
  price,
}) => {
  return (
    <div className="border rounded-lg p-4 text-right hover:shadow">
      <img src={image} alt={title} className="mb-3 w-full rounded" />
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-gray-600 mb-2">{description}</p>
      <p className="font-bold mb-2">₪{price}</p>
      <Button className="w-full">إضافة للسلة</Button>
    </div>
  );
};

export default ProductCard;
