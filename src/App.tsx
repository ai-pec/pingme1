import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense, lazy, Component, ErrorInfo, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";


import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import DocsPage from "./components/DocsPage";
import SmoothScroll from "@/components/SmoothScroll";

// Pages
const Landing = lazy(() => import("./pages/Landing"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Blog = lazy(() => import("./pages/Blog"));
const Prebook = lazy(() => import("./pages/Prebook"));
const About = lazy(() => import("./pages/About"));
const Partners = lazy(() => import("./pages/Partners"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const PricingShipment = lazy(() => import("./pages/PricingShipment"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Auth Pages
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const CompleteProfile = lazy(() => import("./pages/auth/CompleteProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const NfcVisitsDashboard = lazy(() => import("./pages/NfcVisitsDashboard"));
const NfcLeadsDashboard = lazy(() => import("./pages/NfcLeadsDashboard"));
const Admin = lazy(() => import("./pages/Admin"));

const PublicNFCProfile = lazy(() => import("./pages/PublicNFCProfile"));
const NFCLanding = lazy(() => import("./pages/NFCLanding"));
const NfcPrivacyPolicy = lazy(() => import("./pages/NfcPrivacyPolicy"));


const PageLoader = () => (
  <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background gap-6">
    <div className="relative flex items-center justify-center">
      <div className="absolute h-16 w-16 animate-ping rounded-full bg-primary/20" />
      <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
    </div>
    <p className="text-sm font-medium tracking-widest text-muted-foreground animate-pulse uppercase">
      Loading PingME
    </p>
  </div>
);

class ChunkErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Chunk loading failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background space-y-5 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Update Available</h2>
            <p className="max-w-md text-muted-foreground">
              A new version of the application is available. Please refresh the page to continue.
            </p>
          </div>
          <Button size="lg" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient();

const isNfcSubdomain = typeof window !== "undefined" && (
  window.location.hostname.startsWith("nfc.") ||
  window.location.hostname.includes(".nfc.") ||
  // Dev convenience: add ?nfc=1 to any localhost URL to test NFC routing
  (import.meta.env.DEV && new URLSearchParams(window.location.search).get("nfc") === "1")
);

const isAppSubdomain = typeof window !== "undefined" && (
  window.location.hostname.startsWith("app.") ||
  window.location.hostname.includes(".app.")
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <SmoothScroll />
            <ChunkErrorBoundary>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {isNfcSubdomain ? (
                  <>
                    <Route path="/" element={<NFCLanding />} />
                    <Route path="/:username/NFC-Privacy-Policy" element={<NfcPrivacyPolicy />} />
                    <Route path="/:username" element={<PublicNFCProfile />} />
                    <Route path="*" element={<NFCLanding />} />
                  </>
                ) : (
                  <>
                <Route
                  path="/"
                  element={
                    isAppSubdomain ? (
                      <Navigate to="/login" replace />
                    ) : (
                      <Landing />
                    )
                  }
                />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:categorySlug" element={<Products />} />
                <Route path="/products/:categorySlug/:productId" element={<ProductDetail />} />
                <Route path="/blog" element={<Blog />} />
                <Route
                  path="/booking"
                  element={
                    <ProtectedRoute>
                      <Prebook />
                    </ProtectedRoute>
                  }
                />
                <Route path="/prebook" element={<Navigate to="/booking" replace />} />
                <Route path="/about" element={<About />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/report" element={<Navigate to="/contact" replace />} />

                {/* Auth Routes (phone + OTP only) */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                {/* Legacy auth paths now resolve to the phone login */}
                <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
                <Route path="/verify-email" element={<Navigate to="/login" replace />} />
                <Route path="/complete-phone" element={<Navigate to="/complete-profile" replace />} />

                {/* Protected Routes */}
                <Route
                  path="/profile/:userId?"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile/visits"
                  element={
                    <ProtectedRoute>
                      <NfcVisitsDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile/leads"
                  element={
                    <ProtectedRoute>
                      <NfcLeadsDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />

                {/* Legal Pages */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/pricing-shipment" element={<PricingShipment />} />
                <Route path="/terms-conditions" element={<TermsConditions />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/docs" element={<DocsPage />} />
                
                <Route path="/:username" element={<PublicNFCProfile />} />
                
                <Route path="*" element={<NotFound />} />
                  </>
                )}
              </Routes>
              </Suspense>
            </ChunkErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
