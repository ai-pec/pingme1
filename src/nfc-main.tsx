import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import PublicNFCProfile from "./pages/PublicNFCProfile";
import NFCLanding from "./pages/NFCLanding";
import "./index.css";

const queryClient = new QueryClient();

function NfcApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                {/* Root → NFC landing page */}
                <Route path="/" element={<NFCLanding />} />
                {/* /:username → public NFC profile */}
                <Route path="/:username" element={<PublicNFCProfile />} />
                {/* fallback → landing page */}
                <Route path="*" element={<NFCLanding />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<NfcApp />);
