import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import logo from "@/assets/ping-me-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import UserAvatar from "@/components/profile/UserAvatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { user, loading } = useAuth();
  const { items, cartCount, cartTotal, removeFromCart, updateQuantity } = useCart();

  const isActive = (link: typeof navLinks[0]) => {
    if (link.label === "Home") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(link.to);
  };

  return (
    <header className="bg-background/95 backdrop-blur-md border-b border-border-light sticky top-0 z-50 py-2">
      <div className="container">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center transition-transform hover:scale-105">
            <img src={logo} alt="PingME" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 flex-wrap">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`relative text-muted-foreground font-medium transition-colors hover:text-foreground
                  after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5
                  after:bg-primary after:transform after:scale-x-0 after:origin-center after:transition-transform
                  hover:after:scale-x-100
                  ${isActive(link) ? "text-foreground after:scale-x-100" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Cart Sheet */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <button className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                      {cartCount}
                    </span>
                  )}
                </button>
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
                      <Button 
                        variant="link" 
                        onClick={() => { setCartOpen(false); navigate("/products"); }}
                      >
                        Browse Products
                      </Button>
                    </div>
                  ) : (
                    items.map(item => (
                      <div key={item.id} className="flex gap-4 p-3 border border-border rounded-xl bg-card">
                        <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="max-w-[80%] max-h-[80%] object-contain" />
                          ) : (
                            <span className="text-2xl">{item.emoji}</span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-sm leading-tight pr-2">{item.title}</h4>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="font-bold text-sm tracking-tight">{item.price}</span>
                            <div className="flex items-center gap-2 border rounded-md h-7">
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="px-2 h-full hover:bg-muted rounded-l-md"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-semibold px-1 w-4 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="px-2 h-full hover:bg-muted rounded-r-md"
                              >
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
                        navigate("/prebook");
                      }}
                    >
                      Checkout Securely
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {!loading && (
              user ? (
                <UserAvatar />
              ) : (
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-full border border-foreground text-foreground font-semibold text-sm transition-all hover:bg-foreground hover:text-background"
                >
                  Login
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Toggle & Cart */}
          <div className="flex items-center md:hidden gap-3">
            <button 
              className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-medium transition-colors ${
                    isActive(link) ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-3">
                <Button 
                  className="w-full bg-foreground text-background"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCartOpen(true);
                  }}
                >
                  View Cart ({cartCount})
                </Button>
                {!loading && !user && (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 rounded-lg border border-foreground text-foreground font-semibold text-center"
                  >
                    Login
                  </Link>
                )}
                {!loading && user && (
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 rounded-lg border border-foreground text-foreground font-semibold text-center"
                  >
                    My Profile
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
