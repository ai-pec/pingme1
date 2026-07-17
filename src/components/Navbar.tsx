import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, Trash2, Plus, Minus, Sparkles, ChevronRight } from "lucide-react";
import logo from "@/assets/ping-me-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/profile/UserAvatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { resolveProductImageUrl } from "@/lib/productCatalog";
import CartButton from "./CartButton";

const MAIN_SITE = "https://plzpingme.com";
const isNfcSubdomain =
  typeof window !== "undefined" && window.location.hostname.startsWith("nfc.");

// On localhost (dev), resolve cross-domain links relative to the same host
// so nfc.localhost:8080 → localhost:8080 instead of plzpingme.com
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".localhost"));

const mainSiteUrl = (path: string) => {
  if (isLocalhost) {
    return `http://localhost:${window.location.port || 8080}${path}`;
  }
  return `${MAIN_SITE}${path}`;
};

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [activeLink, setActiveLink] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { user, loading, logout } = useAuth();
  const { items, cartCount, cartTotal, removeFromCart, updateQuantity } = useCart();

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = currentScrollY - lastScrollY;

          setScrolled(currentScrollY > 20);

          if (currentScrollY < 80) {
            // Always show near the top
            setNavVisible(true);
          } else if (diff > 6) {
            // Scrolling down fast enough — hide
            setNavVisible(false);
            // Also close mobile menu when hiding
            setMobileMenuOpen(false);
          } else if (diff < -4) {
            // Scrolling up — show
            setNavVisible(true);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const isActive = (link: typeof navLinks[0]) => {
    if (link.label === "Home") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(link.to);
  };

  return (
    <>
      <style>{`
        :root {
          --primary-yellow: hsl(45 100% 48%);
          --dark-brown: hsl(40 76% 7%);
          --light-ash: hsl(40 12% 37%);
        }

        @keyframes slideDownFancy {
          from {
            opacity: 0;
            transform: translateY(-20px);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(244, 180, 0, 0.3); }
          50%       { box-shadow: 0 0 40px rgba(244, 180, 0, 0.6); }
        }

        @keyframes shimmer {
          0%   { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.08); opacity: 0.8; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Hide / show navbar ── */
        @keyframes navSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes navSlideUp {
          from { transform: translateY(0);     opacity: 1; }
          to   { transform: translateY(-100%); opacity: 0; }
        }

        .header-wrapper {
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 50;
          transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                      padding 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Poppins', sans-serif;
        }

        .header-wrapper.nav-hidden {
          animation: navSlideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          pointer-events: none;
        }

        .header-wrapper.nav-visible {
          animation: navSlideDown 0.38s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          pointer-events: all;
        }

        .header-wrapper.scrolled {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(244, 180, 0, 0.1);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
          padding: 8px 0;
        }

        .header-wrapper:not(.scrolled) {
          background: rgba(255, 255, 255, 0.98);
          border-bottom: 1px solid rgba(244, 180, 0, 0.05);
        }

        /* ── Dark mode overrides ── */
        :root.dark .header-wrapper.scrolled {
          background: rgba(0, 0, 0, 0.95) !important;
          border-bottom: 1px solid rgba(244, 180, 0, 0.08);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        :root.dark .header-wrapper:not(.scrolled) {
          background: rgba(0, 0, 0, 0.98);
          border-bottom: 1px solid rgba(244, 180, 0, 0.04);
        }

        :root.dark .menu-toggle {
          color: var(--primary-yellow);
          border-color: rgba(244, 180, 0, 0.25);
        }

        /* ── Nav links ── */
        .nav-link-wrapper {
          position: relative;
          overflow: hidden;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-link-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(244, 180, 0, 0.15), rgba(244, 180, 0, 0.05));
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: inherit;
        }
        .nav-link-wrapper:hover::before { opacity: 1; }
        .nav-link-wrapper::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 12px;
          right: 12px;
          height: 2.5px;
          background: linear-gradient(90deg, var(--primary-yellow), rgba(244, 180, 0, 0.5));
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-link-wrapper:hover::after,
        .nav-link-wrapper.active::after { transform: scaleX(1); }
        .nav-link {
          position: relative;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--light-ash);
          transition: color 0.3s ease;
          font-family: 'Poppins', sans-serif;
        }
        .nav-link-wrapper:hover .nav-link,
        .nav-link-wrapper.active .nav-link { color: var(--primary-yellow); }

        /* ── Cart button ── */
        .cart-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(244, 180, 0, 0.08), rgba(244, 180, 0, 0.04));
          /* Remove border entirely for a clean, borderless button */
          border: none;
          cursor: pointer;
          transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          color: var(--dark-brown);
          font-family: 'Poppins', sans-serif;
        }
        .cart-button:hover {
          background: transparent;
          /* Keep border stable on hover to avoid animating border-color */
          box-shadow: none;
          transform: none;
        }
        .cart-button:active { transform: translateY(-2px) scale(0.95); }
        .cart-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 26px;
          height: 26px;
          background: linear-gradient(135deg, var(--primary-yellow), #f59e0b);
          color: var(--dark-brown);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(244, 180, 0, 0.18);
          /* animation intentionally removed to prevent constant motion */
          font-family: 'Poppins', sans-serif;
          letter-spacing: -0.5px;
        }

        /* ── Login button ── */
        .login-button {
          position: relative;
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          background: linear-gradient(135deg, var(--primary-yellow), #f59e0b);
          color: var(--dark-brown);
          border: none;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Poppins', sans-serif;
          box-shadow: 0 8px 20px rgba(244, 180, 0, 0.25);
        }
        .login-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .login-button:hover::before  { transform: translateX(100%); }
        .login-button:hover {
          box-shadow: 0 12px 30px rgba(244, 180, 0, 0.35);
          transform: translateY(-3px);
        }
        .login-button:active { transform: translateY(-1px) scale(0.98); }

        /* ── Mobile menu ── */
        .mobile-menu-item {
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards;
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .mobile-menu-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(244, 180, 0, 0.1), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: inherit;
        }
        .mobile-menu-item:hover::before { opacity: 1; }
        .mobile-menu-item:nth-child(1) { animation-delay: 0.05s; }
        .mobile-menu-item:nth-child(2) { animation-delay: 0.10s; }
        .mobile-menu-item:nth-child(3) { animation-delay: 0.15s; }
        .mobile-menu-item:nth-child(4) { animation-delay: 0.20s; }
        .mobile-menu-item:nth-child(5) { animation-delay: 0.25s; }
        .mobile-menu-item:nth-child(6) { animation-delay: 0.30s; }

        .menu-toggle {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(244, 180, 0, 0.08), rgba(244, 180, 0, 0.04));
          border: 1.5px solid rgba(244, 180, 0, 0.15);
          cursor: pointer;
          transition: all 0.3s ease;
          color: var(--dark-brown);
        }
        .menu-toggle:hover {
          background: linear-gradient(135deg, rgba(244, 180, 0, 0.12), rgba(244, 180, 0, 0.08));
          border-color: rgba(244, 180, 0, 0.3);
          box-shadow: 0 4px 12px rgba(244, 180, 0, 0.1);
        }
        .menu-icon { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .menu-toggle.open .menu-icon { transform: rotate(90deg); }

        /* ── Logo ── */
        .logo-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .logo-wrapper::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(244, 180, 0, 0.1), transparent);
          animation: shimmer 3s ease-in-out infinite;
          pointer-events: none;
        }
        .logo-image {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 1;
        }
        .logo-wrapper:hover .logo-image {
          transform: scale(1.05) translateY(-2px);
          filter: drop-shadow(0 8px 12px rgba(244, 180, 0, 0.2));
        }

        .accent-line {
          width: 40px;
          height: 2px;
          background: linear-gradient(90deg, var(--primary-yellow), transparent);
          border-radius: 2px;
          margin-top: 8px;
        }
      `}</style>

      <header className={`header-wrapper ${scrolled ? "scrolled" : ""} ${navVisible ? "nav-visible" : "nav-hidden"}`}>
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6 py-3 md:py-4">

            {/* Logo */}
            {isNfcSubdomain ? (
              <a href={mainSiteUrl("/")} className="logo-wrapper flex-shrink-0">
                <img
                  src={logo}
                  alt="PingME"
                  className="logo-image h-12 md:h-14 w-auto object-contain"
                />
              </a>
            ) : (
              <Link to="/" className="logo-wrapper flex-shrink-0">
                <img
                  src={logo}
                  alt="PingME"
                  className="logo-image h-12 md:h-14 w-auto object-contain"
                />
              </Link>
            )}

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navLinks.map((link, idx) => (
                <div key={link.label} style={{ animationDelay: `${0.06 + idx * 0.05}s` }}>
                  {isNfcSubdomain ? (
                    <a
                      href={mainSiteUrl(link.to)}
                      className="nav-link-wrapper"
                    >
                      <span className="nav-link">{link.label}</span>
                    </a>
                  ) : (
                    <Link
                      to={link.to}
                      className={`nav-link-wrapper ${isActive(link) ? "active" : ""}`}
                      onMouseEnter={() => setActiveLink(link.label)}
                      onMouseLeave={() => setActiveLink(null)}
                    >
                      <span className="nav-link">{link.label}</span>
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Cart */}
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <CartButton count={cartCount} onClick={() => setCartOpen(true)} />
                </SheetTrigger>
                <SheetContent className="flex flex-col w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="text-xl">Your Cart ({cartCount})</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto py-6 space-y-4">
                    {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                        <p>Your cart is empty.</p>
                        <Button variant="link" onClick={() => { setCartOpen(false); navigate("/products"); }}>
                          Browse Products
                        </Button>
                      </div>
                    ) : (
                      items.map(item => (
                        <div key={item.id} className="flex gap-4 p-3 border border-border rounded-xl bg-card">
                          <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                            {resolveProductImageUrl(item.image) ? (
                              <img src={resolveProductImageUrl(item.image)} alt={item.title} className="max-w-[80%] max-h-[80%] object-contain" loading="lazy" decoding="async" />
                            ) : (
                              <span className="text-2xl">{item.emoji}</span>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-sm leading-tight pr-2">{item.title}</h4>
                              <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                              <span className="font-bold text-sm tracking-tight">{item.price}</span>
                              <div className="flex items-center gap-2 border rounded-md h-7">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 h-full hover:bg-muted rounded-l-md">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-semibold px-1 w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 h-full hover:bg-muted rounded-r-md">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {items.length > 0 && (
                    <div className="pt-4 border-t border-border mt-auto">
                      <div className="flex justify-between mb-4">
                        <span className="font-semibold">Estimated Total</span>
                        <span className="font-bold text-lg">₹{cartTotal.toFixed(2)}</span>
                      </div>
                      <Button
                        className="w-full h-12 text-base"
                        onClick={() => {
                          setCartOpen(false);
                          if (!user) {
                            navigate("/login", { state: { from: { pathname: "/booking" } } });
                            return;
                          }
                          navigate("/booking");
                        }}
                      >
                        Checkout Securely
                      </Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User / Login */}
              {!loading && (
                user ? (
                  <UserAvatar />
                ) : (
                  isNfcSubdomain ? (
                    <a href={mainSiteUrl("/login")} className="login-button">
                      <Sparkles className="w-4 h-4" />
                      Login
                    </a>
                  ) : (
                    <Link to="/login" className="login-button">
                      <Sparkles className="w-4 h-4" />
                      Login
                    </Link>
                  )
                )
              )}
            </div>

            {/* Mobile right side */}
            <div className="flex lg:hidden items-center gap-2">
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <CartButton count={cartCount} onClick={() => setCartOpen(true)} />
                </SheetTrigger>
                <SheetContent className="flex flex-col w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="text-xl">Your Cart ({cartCount})</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto py-6 space-y-4">
                    {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                        <p>Your cart is empty.</p>
                        <Button variant="link" onClick={() => { setCartOpen(false); navigate("/products"); }}>
                          Browse Products
                        </Button>
                      </div>
                    ) : (
                      items.map(item => (
                        <div key={item.id} className="flex gap-4 p-3 border border-border rounded-xl bg-card">
                          <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                            {resolveProductImageUrl(item.image) ? (
                              <img src={resolveProductImageUrl(item.image)} alt={item.title} className="max-w-[80%] max-h-[80%] object-contain" loading="lazy" decoding="async" />
                            ) : (
                              <span className="text-2xl">{item.emoji}</span>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-sm leading-tight pr-2">{item.title}</h4>
                              <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                              <span className="font-bold text-sm tracking-tight">{item.price}</span>
                              <div className="flex items-center gap-2 border rounded-md h-7">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 h-full hover:bg-muted rounded-l-md">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-semibold px-1 w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 h-full hover:bg-muted rounded-r-md">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {items.length > 0 && (
                    <div className="pt-4 border-t border-border mt-auto">
                      <div className="flex justify-between mb-4">
                        <span className="font-semibold">Total Amount</span>
                        <span className="font-bold text-lg">₹{cartTotal.toFixed(2)}</span>
                      </div>
                      <Button
                        className="w-full h-12 text-base"
                        onClick={() => {
                          setCartOpen(false);
                          if (!user) {
                            navigate("/login", { state: { from: { pathname: "/booking" } } });
                            return;
                          }
                          navigate("/booking");
                        }}
                      >
                        Checkout Securely
                      </Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>

              {!loading && user && <UserAvatar />}

              <ThemeToggle />

              <button
                className={`menu-toggle ${mobileMenuOpen ? "open" : ""}`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="menu-icon w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background/98 backdrop-blur-md">
            <div className="px-4 py-6 space-y-4">
              <nav className="flex flex-col gap-2 pb-4">
                {navLinks.map((link, idx) => (
                  isNfcSubdomain ? (
                    <a
                      key={link.label}
                      href={mainSiteUrl(link.to)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item px-4 py-3 rounded-lg font-semibold text-foreground hover:bg-yellow-50 dark:hover:bg-yellow-400/10 hover:text-yellow-600 transition-all relative group"
                      style={{ animationDelay: `${idx * 0.06}s` }}
                    >
                      <div className="flex items-center justify-between">
                        {link.label}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                      </div>
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item px-4 py-3 rounded-lg font-semibold text-foreground hover:bg-yellow-50 dark:hover:bg-yellow-400/10 hover:text-yellow-600 transition-all relative group"
                      style={{ animationDelay: `${idx * 0.06}s` }}
                    >
                      <div className="flex items-center justify-between">
                        {link.label}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                      </div>
                      {isActive(link) && <div className="accent-line absolute left-4 bottom-0" />}
                    </Link>
                  )
                ))}
              </nav>

              <div className="border-t border-border pt-4 space-y-3">
                {!loading && !user && (
                  isNfcSubdomain ? (
                    <a
                      href={mainSiteUrl("/login")}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item block py-3 px-4 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold text-center hover:shadow-lg transition-all"
                    >
                      Login
                    </a>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item block py-3 px-4 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-bold text-center hover:shadow-lg transition-all"
                    >
                      Login
                    </Link>
                  )
                )}
                {!loading && user && (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item block py-3 px-4 rounded-lg border-2 border-border text-foreground font-semibold text-center hover:border-yellow-400 hover:text-yellow-600"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/profile/visits"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item block py-3 px-4 rounded-lg border-2 border-border text-foreground font-semibold text-center hover:border-yellow-400 hover:text-yellow-600"
                    >
                      NFC Profile Visits
                    </Link>
                    <Link
                      to="/profile/leads"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item block py-3 px-4 rounded-lg border-2 border-border text-foreground font-semibold text-center hover:border-yellow-400 hover:text-yellow-600"
                    >
                      NFC Leads & Outreach
                    </Link>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item block py-3 px-4 rounded-lg border-2 border-border text-foreground font-semibold text-center hover:border-yellow-400 hover:text-yellow-600"
                    >
                      Admin Panel
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await logout();
                        navigate("/");
                      }}
                      className="mobile-menu-item block w-full py-3 px-4 rounded-lg border-2 border-red-300 text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className="h-20 md:h-24" />
    </>
  );
};

export default Navbar;