import React, { useState, useEffect, useRef } from "react";

interface QuantityInputProps {
  quantity: number;
  onChange: (newQty: number) => void;
}

const QuantityInput: React.FC<QuantityInputProps> = ({
  quantity,
  onChange,
}) => {
  const [tempValue, setTempValue] = useState<string>(quantity.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setTempValue(quantity.toString());
    }
  }, [quantity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // السماح فقط بالأرقام أو فراغ مؤقت
    if (/^\d*$/.test(val)) {
      setTempValue(val);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(tempValue);
    if (!isNaN(parsed) && parsed >= 1) {
      onChange(parsed);
    } else {
      setTempValue(quantity.toString()); // إرجاع القيمة الأصلية إذا فشل الإدخال
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className="border w-20 px-2 py-1 rounded text-center"
      value={tempValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default QuantityInput;
