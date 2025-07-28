import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  return (
    <footer className="dark:text-gray-200 mt-12 border-t pt-6 text-center text-gray-600">
      <p>جميع الحقوق محفوظة &copy; 2025 متجر المدينة المنورة</p>
      <p className="dark:text-gray-200 mt-2">للتواصل: 0599-XXXXXX</p>

      <div className="dark:text-gray-200 mt-4 flex justify-center gap-4">
        <a href="#" className="dark:text-gray-200 hover:text-black">
          فيسبوك
        </a>
        <a href="#" className="dark:text-gray-200 hover:text-black">
          إنستجرام
        </a>
        <a href="#" className="dark:text-gray-200 hover:text-black">
          واتساب
        </a>
      </div>

      {/* روابط قانونية */}
      <div className="dark:text-gray-200 mt-4 flex justify-center gap-4 text-sm">
        <Link
          to="/privacy-policy"
          className="dark:text-gray-200 hover:text-black"
        >
          سياسة الخصوصية
        </Link>
        <Link to="/terms" className="dark:text-gray-200 hover:text-black">
          الشروط والأحكام
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
