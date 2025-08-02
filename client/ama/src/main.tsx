import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { SpeedInsights } from "@vercel/speed-insights/react";

import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <CartProvider>
      <BrowserRouter>
        <SpeedInsights />
        <App />
      </BrowserRouter>
    </CartProvider>
  </AuthProvider>
);
