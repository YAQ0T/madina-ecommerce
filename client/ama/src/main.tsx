import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { I18nextProvider } from "react-i18next";

import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import i18n from "./i18n";

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <SpeedInsights />
          <App />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </I18nextProvider>
);
