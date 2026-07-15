import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  RefreshCw,
  MessageCircle,
  ChevronRight,
  Minus,
  Plus,
  Star,
  Loader2,
  Zap,
  Lock,
  Package,
  CheckCircle2,
  Share2,
  Heart,
  Info,
} from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  subscribeToProducts,
  type DbProduct,
  subscribeToProductCategories,
  subscribeToReviews,
  type ProductReview,
} from "../lib/productService";
import {
  normalizeCategorySlug,
  categoryNameFromSlug,
  type ProductVariant,
} from "../lib/productCatalog";

/* ─── Brand Tokens ────────────────────────────────────────────── */
const GOLD       = "var(--pm-gold)";
const GOLD_DEEP  = "var(--pm-gold-deep)";
const GOLD_LIGHT = "var(--pm-gold-light)";
const INK        = "var(--pm-ink)";
const INK_SOFT   = "var(--pm-ink-soft)";
const SMOKE      = "var(--pm-smoke)";
const SMOKE_DEEP = "var(--pm-smoke-deep)";
const MIST       = "var(--pm-mist)";
const TEXT_SEC   = "var(--pm-text-sec)";
const TEXT_MUTED = "var(--pm-text-muted)";
const SUCCESS    = "var(--pm-success)";
const WHITE      = "var(--pm-white)";
const REVIEW_CARD_BG = "var(--pm-review-card-bg)";
const REVIEW_SUMMARY_BG = "var(--pm-review-summary-bg)";

/* ─── Static Trust Items ──────────────────────────────────────── */
const TRUST_PERKS = [
  {
    icon: <Truck size={22} strokeWidth={1.8} />,
    title: "Pan-India Shipping",
    desc: "Delivered in 3–5 business days via reliable courier partners.",
  },
  {
    icon: <RefreshCw size={22} strokeWidth={1.8} />,
    title: "Easy Replacements",
    desc: "Damaged or lost? Contact us and we'll replace your tag promptly.",
  },
  {
    icon: <ShieldCheck size={22} strokeWidth={1.8} />,
    title: "Privacy Guaranteed",
    desc: "Your real number is never exposed — ever. That's our promise.",
  },
];

/* ─── Breadcrumb ──────────────────────────────────────────────── */
const Breadcrumb = ({
  categorySlug,
  categoryName,
  productTitle,
}: {
  categorySlug: string;
  categoryName: string;
  productTitle: string;
}) => (
  <nav
    aria-label="breadcrumb"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 28,
    }}
  >
    {[
      { label: "All Products", href: "/products" },
      { label: categoryName, href: `/products/${categorySlug}` },
      { label: productTitle, href: null },
    ].map((crumb, i, arr) => (
      <span
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 13,
          fontWeight: i === arr.length - 1 ? 600 : 400,
          color: i === arr.length - 1 ? INK : TEXT_MUTED,
        }}
      >
        {crumb.href ? (
          <Link
            to={crumb.href}
            style={{
              color: TEXT_MUTED,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = GOLD_DEEP)}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = TEXT_MUTED)}
          >
            {crumb.label}
          </Link>
        ) : (
          <span
            style={{
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {crumb.label}
          </span>
        )}
        {i < arr.length - 1 && (
          <ChevronRight size={13} style={{ color: MIST, flexShrink: 0 }} />
        )}
      </span>
    ))}
  </nav>
);

/* ─── Image Gallery ───────────────────────────────────────────── */
const ImageGallery = ({
  images,
  emoji,
  title,
}: {
  images: string[];
  emoji: string;
  title: string;
}) => {
  const [active, setActive] = useState(0);
  const [imageFailed, setImageFailed] = useState<boolean[]>(
    new Array(images.length).fill(false)
  );
  const [hoverState, setHoverState] = useState({ isHovered: false, x: 0, y: 0 });

  const validImages = images.filter((img, i) => img && !imageFailed[i]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setHoverState({ isHovered: true, x, y });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 88 }}>
      {/* Main image */}
      <div
        onMouseEnter={() => setHoverState((prev) => ({ ...prev, isHovered: true }))}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverState({ isHovered: false, x: 0, y: 0 })}
        style={{
          background: SMOKE,
          borderRadius: 20,
          border: `1px solid ${MIST}`,
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "zoom-in",
          position: "relative",
          transition: "box-shadow 0.3s",
          boxShadow: hoverState.isHovered
            ? `0 32px 80px rgba(26,20,16,0.18)`
            : `0 8px 40px rgba(26,20,16,0.08)`,
        }}
      >
        {validImages.length > 0 && !imageFailed[active] ? (
          <img
            src={images[active]}
            alt={title}
            onError={() => {
              const next = [...imageFailed];
              next[active] = true;
              setImageFailed(next);
            }}
            style={{
              width: "80%",
              height: "80%",
              objectFit: "contain",
              transform: hoverState.isHovered ? "scale(1.5)" : "scale(1)",
              transformOrigin: hoverState.isHovered ? `${hoverState.x}% ${hoverState.y}%` : "center center",
              transition: hoverState.isHovered ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        ) : (
          <span style={{ fontSize: 100, lineHeight: 1 }} aria-hidden>
            {emoji}
          </span>
        )}

        {/* Zoom hint */}
        <span
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(6px)",
            borderRadius: 8,
            padding: "5px 10px",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: TEXT_MUTED,
            border: `1px solid ${MIST}`,
            pointerEvents: "none",
            opacity: hoverState.isHovered ? 0 : 1,
            transition: "opacity 0.3s",
          }}
        >
          Hover to zoom
        </span>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                border: `2px solid ${active === i ? GOLD_DEEP : MIST}`,
                background: SMOKE,
                overflow: "hidden",
                cursor: "pointer",
                padding: 4,
                transition: "border-color 0.2s, transform 0.2s",
                transform: active === i ? "scale(1.04)" : "scale(1)",
                flexShrink: 0,
              }}
            >
              {img && !imageFailed[i] ? (
                <img
                  src={img}
                  alt={`${title} view ${i + 1}`}
                  onError={() => {
                    const next = [...imageFailed];
                    next[i] = true;
                    setImageFailed(next);
                  }}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 30 }} aria-hidden>{emoji}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: TEXT_MUTED,
          textAlign: "center",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        * Actual product color/finish may vary slightly from the image due to photography and screen settings.
      </p>
    </div>
  );
};

/* ─── Quantity Selector ───────────────────────────────────────── */
const QtySelector = ({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (n: number) => void;
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      border: `1px solid ${MIST}`,
      borderRadius: 10,
      overflow: "hidden",
      background: WHITE,
      height: 46,
    }}
  >
    <button
      onClick={() => onChange(Math.max(1, qty - 1))}
      aria-label="Decrease quantity"
      style={{
        width: 46,
        height: "100%",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: qty === 1 ? MIST : INK,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (qty > 1) (e.currentTarget as HTMLElement).style.background = SMOKE; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <Minus size={15} strokeWidth={2.5} />
    </button>
    <span
      style={{
        width: 44,
        textAlign: "center",
        fontFamily: "'DM Mono', monospace",
        fontSize: 16,
        fontWeight: 600,
        color: INK,
        borderLeft: `1px solid ${MIST}`,
        borderRight: `1px solid ${MIST}`,
        lineHeight: "46px",
        userSelect: "none",
      }}
    >
      {qty}
    </span>
    <button
      onClick={() => onChange(qty + 1)}
      aria-label="Increase quantity"
      style={{
        width: 46,
        height: "100%",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: INK,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = SMOKE; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <Plus size={15} strokeWidth={2.5} />
    </button>
  </div>
);

/* ─── Related Products Row ────────────────────────────────────── */
const RelatedProducts = ({
  products,
  currentId,
  categorySlug,
}: {
  products: ProductVariant[];
  currentId: string;
  categorySlug: string;
}) => {
  const navigate = useNavigate();
  const related = products.filter((p) => p.id !== currentId).slice(0, 4);
  if (!related.length) return null;

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "clamp(32px,5vw,60px) clamp(12px,4vw,24px) clamp(40px,6vw,80px)",
        borderTop: `1px solid ${MIST}`,
      }}
    >
      <h2
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(22px, 3.5vw, 32px)",
          fontWeight: 700,
          color: INK,
          marginBottom: 32,
          letterSpacing: "-0.02em",
        }}
      >
        More in this collection
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(180px, 100%), 1fr))",
          gap: 16,
        }}
      >
        {related.map((prod) => (
          <button
            key={prod.id}
            onClick={() => navigate(`/products/${categorySlug}/${prod.id}`)}
            style={{
              background: WHITE,
              border: `1px solid ${MIST}`,
              borderRadius: 14,
              overflow: "hidden",
              cursor: "pointer",
              textAlign: "left",
              padding: 0,
              transition: "transform 0.25s, box-shadow 0.25s, border-color 0.25s",
              boxShadow: "0 4px 20px rgba(26,20,16,0.06)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-4px)";
              el.style.boxShadow = "0 12px 40px rgba(26,20,16,0.12)";
              el.style.borderColor = GOLD;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "";
              el.style.boxShadow = "0 4px 20px rgba(26,20,16,0.06)";
              el.style.borderColor = MIST;
            }}
          >
            <div
              style={{
                background: SMOKE,
                aspectRatio: "4/3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              {prod.image ? (
                <img
                  src={prod.image}
                  alt={prod.title}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 52 }} aria-hidden>{prod.emoji}</span>
              )}
            </div>
            <div style={{ padding: "14px 16px 16px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: INK,
                  margin: "0 0 4px",
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {prod.title}
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 14,
                  fontWeight: 600,
                  color: GOLD_DEEP,
                  margin: 0,
                }}
              >
                {prod.price}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

/* ─── Support Banner ──────────────────────────────────────────── */
const SupportBanner = () => (
  <section
    style={{
      background: SMOKE_DEEP,
      borderTop: `1px solid ${MIST}`,
      borderBottom: `1px solid ${MIST}`,
      padding: "clamp(40px, 6vw, 64px) 24px",
    }}
  >
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${MIST}`,
      }}
      className="pm-support-grid"
    >
      {/* Left — visual */}
      <div
        style={{
          background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${SMOKE_DEEP} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          padding: 40,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle, ${MIST} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "relative",
            fontSize: 72,
            filter: "drop-shadow(0 8px 24px rgba(201,169,110,0.4))",
          }}
        >
          📲
        </div>
      </div>
      {/* Right — text */}
      <div
        style={{
          background: WHITE,
          padding: "clamp(28px, 4vw, 48px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TEXT_MUTED,
            margin: 0,
          }}
        >
          We're here to help
        </p>
        <h3
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 700,
            color: INK,
            margin: 0,
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          Need support? We've got you every step of the way.
        </h3>
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 400,
            color: TEXT_SEC,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Reach us on WhatsApp for instant help with setup, replacements, or
          anything else about your PingME tag.
        </p>
        <a
          href="https://wa.me/917347340007"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: INK,
            color: GOLD,
            borderRadius: 10,
            padding: "12px 24px",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            alignSelf: "flex-start",
            transition: "background 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = INK_SOFT;
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = INK;
            (e.currentTarget as HTMLElement).style.transform = "";
          }}
        >
          <MessageCircle size={16} /> WhatsApp Support
        </a>
      </div>
    </div>
    <style>{`@media (max-width: 640px) { .pm-support-grid { grid-template-columns: 1fr !important; } }`}</style>
  </section>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const ProductDetail = () => {
  const { categorySlug, productId } = useParams<{
    categorySlug: string;
    productId: string;
  }>();
  const navigate = useNavigate();
  const { addToCart, clearCart, removeFromCart } = useCart();
  const { toast } = useToast();

  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [categoryMetadata, setCategoryMetadata] = useState<
    Record<string, { name?: string; description?: string; icon?: string; coverImage?: string }>
  >({});
  const [qty, setQty] = useState(1);
  const [addedAnim, setAddedAnim] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const [openTab, setOpenTab] = useState<"features" | "specs">("features");
  const [copied, setCopied] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [activeReviewImage, setActiveReviewImage] = useState<string | null>(null);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(3);

  /* ── Data Subscriptions ── */
  useEffect(() => {
    const unsub = subscribeToProducts(
      (latest) => setDbProducts(latest),
      (err) => console.error(err)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToProductCategories(
      (map) => setCategoryMetadata(map),
      (err) => console.error(err)
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoadingReviews(true);
    const unsub = subscribeToReviews(
      productId,
      (latest) => {
        setReviews(latest);
        setLoadingReviews(false);
      },
      (err) => {
        console.error("Failed to load reviews:", err);
        setLoadingReviews(false);
      }
    );
    return unsub;
  }, [productId]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const starDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rating = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[rating]++;
    });
    const total = reviews.length || 1;
    return {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };
  }, [reviews]);

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const allReviewImages = useMemo(() => {
    return reviews.flatMap((r) => r.images || []);
  }, [reviews]);

  /* ── Resolve product ── */
  const normalizedSlug = categorySlug ? normalizeCategorySlug(categorySlug) : null;

  const categoryProducts = dbProducts.filter(
    (p) => !p.disabled && normalizeCategorySlug(p.categorySlug) === normalizedSlug
  ) as unknown as ProductVariant[];

  const product = categoryProducts.find((p) => !p.disabled && p.id === productId);

  const categoryMeta = normalizedSlug ? categoryMetadata[normalizedSlug] : null;
  const categoryName =
    categoryMeta?.name || (normalizedSlug ? categoryNameFromSlug(normalizedSlug) : "Products");

  /* ── Color variants (photos for other colors of this same product) ── */
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const colorVariants = product?.colorVariants ?? [];

  // Reset color selection whenever the product itself changes
  useEffect(() => {
    setSelectedColorIdx(null);
  }, [productId]);

  const selectedColor = selectedColorIdx !== null ? colorVariants[selectedColorIdx] : null;

  /* ── Derived fields ── */
  const images: string[] = [];
  if (selectedColor?.image) {
    images.push(selectedColor.image);
  } else if (product?.image) {
    images.push(product.image);
  }
  if (!selectedColor && product?.images && Array.isArray(product.images)) {
    product.images.forEach((img) => {
      if (img && img !== product.image && !images.includes(img)) {
        images.push(img);
      }
    });
  }
  const numericPrice = product
    ? parseFloat(product.price.replace(/[^\d.]/g, ""))
    : 0;
  const numericOriginal = product?.originalPrice
    ? parseFloat(product.originalPrice.replace(/[^\d.]/g, ""))
    : null;
  const discountPct =
    numericOriginal && numericOriginal > numericPrice
      ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100)
      : null;

  /* ── Cart Handlers ── */
  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: product.id,
        title: selectedColor ? `${product.title} - ${selectedColor.color}` : product.title,
        price: product.price,
        originalPrice: product.originalPrice,
        image: selectedColor?.image || product.image,
        emoji: product.emoji,
      });
    }
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1800);
    toast({
      title: "Added to Cart ✓",
      description: `${qty}× ${product.title} added.`,
      action: (
        <ToastAction altText="Checkout" onClick={() => navigate("/booking")}>
          Checkout
        </ToastAction>
      ),
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    clearCart();
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        emoji: product.emoji,
        quantity: 1,
      });
    }
    navigate("/booking");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  /* ── Loading / Not Found ── */
  if (!product && dbProducts.length > 0) {
    return (
      <MainLayout>
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: SMOKE,
          }}
        >
          <span style={{ fontSize: 64 }}>🔍</span>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 28,
              fontWeight: 700,
              color: INK,
            }}
          >
            Product not found
          </h2>
          <button
            onClick={() => navigate("/products")}
            style={{
              background: INK,
              color: GOLD,
              border: "none",
              borderRadius: 10,
              padding: "12px 28px",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back to Products
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="pm-detail-page">
        {/* ── Global Styles ── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');

          :root {
            --pm-gold: #edd09f;
            --pm-gold-deep: #c9a96e;
            --pm-gold-light: #f5e6c8;
            --pm-ink: #1a1410;
            --pm-ink-soft: #2e261c;
            --pm-smoke: #f9f4ec;
            --pm-smoke-deep: #f0e8d8;
            --pm-mist: #e8ddd0;
            --pm-text-sec: #6b5d4f;
            --pm-text-muted: #a89880;
            --pm-success: #4a7c59;
            --pm-white: #ffffff;
            --pm-review-card-bg: rgba(255, 255, 255, 0.45);
            --pm-review-summary-bg: rgba(26, 20, 16, 0.015);
          }

          .dark {
            --pm-gold: #edd09f;
            --pm-gold-deep: #c9a96e;
            --pm-gold-light: #2c251a;
            --pm-ink: #faf9f6;
            --pm-ink-soft: #e5dfd5;
            --pm-smoke: #0d0c0a;
            --pm-smoke-deep: #161512;
            --pm-mist: rgba(255, 255, 255, 0.08);
            --pm-text-sec: #c5beae;
            --pm-text-muted: #8c8473;
            --pm-success: #4fa87a;
            --pm-white: #171613;
            --pm-review-card-bg: rgba(255, 255, 255, 0.03);
            --pm-review-summary-bg: rgba(255, 255, 255, 0.02);
          }

          .pm-detail-page { background: ${SMOKE}; min-height: 100vh; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pm-anim { animation: fadeUp 0.55s ease both; }
        .pm-anim-1 { animation-delay: 0.05s; }
        .pm-anim-2 { animation-delay: 0.13s; }
        .pm-anim-3 { animation-delay: 0.22s; }

        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(1.9); opacity: 0; }
        }

        /* Announcement Bar */
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .pm-announce { display: flex; gap: 48px; width: max-content; animation: ticker-scroll 22s linear infinite; }

        /* Layout responsiveness */
        .pm-detail-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(24px, 4vw, 72px);
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px) clamp(40px, 6vw, 72px);
          align-items: start;
        }
        @media (max-width: 900px) {
          .pm-detail-layout { grid-template-columns: 1fr !important; padding: 20px 16px 48px; }
          .pm-sticky-col { position: static !important; top: auto !important; }
        }
        @media (max-width: 480px) {
          .pm-detail-layout { padding: 14px 12px 36px; gap: 20px; }
        }

        /* Tab bar — scrollable on small screens */
        .pm-tab-bar {
          display: flex; border-bottom: 1px solid ${MIST}; gap: 0; margin-bottom: 20px;
          overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .pm-tab-bar::-webkit-scrollbar { display: none; }
        .pm-tab {
          border: none; background: none; padding: 12px 16px; cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif; font-size: 13px; font-weight: 700;
          color: ${TEXT_MUTED}; letter-spacing: 0.01em; border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s; white-space: nowrap; flex-shrink: 0;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pm-tab:hover { color: ${INK}; }
        .pm-tab-active { color: ${INK} !important; border-bottom-color: ${GOLD_DEEP} !important; }
        @media (max-width: 480px) {
          .pm-tab { padding: 10px 14px; font-size: 12px; }
        }

        /* Feature list item */
        .pm-feature-item {
          display: flex; align-items: flex-start; gap: 10; padding: 10px 0;
          border-bottom: 1px solid ${MIST};
          font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; color: ${TEXT_SEC}; line-height: 1.5;
        }
        .pm-feature-item:last-child { border-bottom: none; }

        /* Trust perk card */
        .pm-perk {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 28px 20px; gap: 12px;
        }

        /* Specs table responsive */
        .pm-spec-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid ${MIST};
          align-items: baseline;
        }
        @media (max-width: 480px) {
          .pm-spec-row { grid-template-columns: 1fr; gap: 4px; }
        }

        /* Trust perks responsive */
        .pm-perks-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 640px) {
          .pm-perks-grid { grid-template-columns: 1fr !important; }
          .pm-perk { border-right: none !important; border-bottom: 1px solid ${MIST}; }
          .pm-perk:last-child { border-bottom: none; }
        }
        .pm-btn-buy {
          flex: 1; background: ${INK}; color: ${GOLD}; border: none; border-radius: 12px;
          padding: 16px 20px; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; font-weight: 800;
          cursor: pointer; letter-spacing: 0.01em; min-height: 52px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(26,20,16,0.15);
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pm-btn-buy:hover { background: ${INK_SOFT}; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(26,20,16,0.2); }
        .pm-btn-buy:active { transform: translateY(0); }

        .pm-btn-cart {
          flex: 1; background: transparent; color: ${INK}; border: 1.5px solid ${MIST}; border-radius: 12px;
          padding: 16px 20px; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; font-weight: 800;
          cursor: pointer; letter-spacing: 0.01em; min-height: 52px;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .pm-btn-cart:hover { border-color: ${GOLD_DEEP}; background: ${GOLD_LIGHT}; transform: translateY(-2px); }
        .pm-btn-cart-added { background: ${SUCCESS} !important; color: #fff !important; border-color: ${SUCCESS} !important; }

        /* ── Color swatch selector ── */
        .pm-swatch-track {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .pm-swatch {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .pm-swatch-ring {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid ${MIST};
          background: ${WHITE};
          position: relative;
          transition: border-color 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .pm-swatch-photo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          background: ${SMOKE};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pm-swatch-photo img { width: 100%; height: 100%; object-fit: cover; }
        .pm-swatch:hover .pm-swatch-ring {
          border-color: ${GOLD_DEEP};
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(201,146,42,0.18);
        }
        .pm-swatch-ring.is-active {
          border-color: ${GOLD_DEEP};
          box-shadow: 0 0 0 3px rgba(201,146,42,0.14), 0 8px 20px rgba(201,146,42,0.2);
        }
        .pm-swatch-check {
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 19px;
          height: 19px;
          border-radius: 50%;
          background: ${GOLD_DEEP};
          border: 2px solid ${WHITE};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(26,20,16,0.25);
        }
        .pm-swatch-label {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          color: ${TEXT_SEC};
          letter-spacing: 0.01em;
          transition: color 0.2s ease;
        }
        .pm-swatch:hover .pm-swatch-label { color: ${GOLD_DEEP}; }
        .pm-swatch-label.is-active { color: ${GOLD_DEEP}; font-weight: 700; }

        .pm-reviews-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 48px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .pm-reviews-container {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }

        .pm-btn-write-review {
          background: ${GOLD_DEEP};
          color: #fff !important;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          padding: 14px 24px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(201, 146, 42, 0.2);
          text-align: center;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          position: relative;
          overflow: hidden;
          z-index: 1;
          display: inline-block;
        }
        .pm-btn-write-review::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%);
          z-index: -1;
          transition: opacity 0.3s ease;
          opacity: 0;
        }
        .pm-btn-write-review:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 24px rgba(201, 146, 42, 0.35);
          color: #fff !important;
        }
        .pm-btn-write-review:hover::before {
          opacity: 1;
        }
        .pm-btn-write-review:active {
          transform: translateY(-1px) scale(0.99);
          box-shadow: 0 4px 12px rgba(201, 146, 42, 0.2);
        }
      `}</style>

        {/* ── Main Layout ── */}
        <div className="pm-detail-layout">

          {/* LEFT — Image Gallery */}
          <div className="pm-anim pm-sticky-col">
            {product ? (
              <ImageGallery
                images={images}
                emoji={product.emoji || "🏷️"}
                title={product.title}
              />
            ) : (
              <div
                style={{
                  background: SMOKE,
                  borderRadius: 20,
                  border: `1px solid ${MIST}`,
                  aspectRatio: "1/1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 80, opacity: 0.3 }}>⏳</span>
              </div>
            )}
          </div>

          {/* RIGHT — Product Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Breadcrumb */}
            <div className="pm-anim">
              {product ? (
                <Breadcrumb
                  categorySlug={normalizedSlug || ""}
                  categoryName={categoryName}
                  productTitle={product.title}
                />
              ) : (
                <div
                  style={{
                    height: 20,
                    width: 260,
                    borderRadius: 6,
                    background: MIST,
                    marginBottom: 28,
                  }}
                />
              )}
            </div>

            {/* Category badge + Best Seller badge */}
            <div
              className="pm-anim pm-anim-1"
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}
            >
              <span
                style={{
                  background: GOLD_LIGHT,
                  color: GOLD_DEEP,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 999,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  border: `1px solid ${MIST}`,
                }}
              >
                {categoryName}
              </span>
              {product?.popular && (
                <span
                  style={{
                    background: GOLD,
                    color: INK,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 999,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    position: "relative",
                  }}
                >
                  {/* Pulse ring */}
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      border: `2px solid ${GOLD}`,
                      animation: "pulse-ring 1.8s ease-out infinite",
                    }}
                    aria-hidden
                  />
                  ⭐ Best Seller
                </span>
              )}
              {normalizedSlug === "smart-keychain-tags" && product?.tags && product.tags.length > 0 && (
                product.tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      background: "rgba(61, 80, 168, 0.12)",
                      color: "#3d50a8",
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 999,
                      letterSpacing: "0.02em",
                      textTransform: "capitalize",
                      border: "1px solid rgba(61, 80, 168, 0.2)",
                    }}
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>

            {/* Title */}
            <h1
              className="pm-anim pm-anim-1"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(26px, 4.5vw, 42px)",
                fontWeight: 700,
                color: INK,
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
                marginBottom: 16,
              }}
            >
              {product?.title || (
                <span
                  style={{
                    display: "block",
                    height: 44,
                    width: "80%",
                    borderRadius: 8,
                    background: MIST,
                  }}
                />
              )}
            </h1>

            {/* Rating Summary */}
            {product && (
              <div 
                className="pm-anim flex items-center gap-2 mb-4 cursor-pointer hover:opacity-85 transition-opacity"
                onClick={() => {
                  const el = document.getElementById("customer-reviews");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {reviews.length > 0 ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={15}
                          fill={star <= averageRating ? GOLD : "none"}
                          stroke={star <= averageRating ? GOLD : "#d6d3d1"}
                          strokeWidth={2}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold" style={{ color: INK }}>{averageRating}</span>
                    <span className="text-xs text-muted-foreground">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                    ⭐ Be the first to review
                  </span>
                )}
              </div>
            )}

            {/* Price row */}
            <div
              className="pm-anim pm-anim-2"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "clamp(28px, 5vw, 38px)",
                  fontWeight: 600,
                  color: GOLD_DEEP,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {product?.price || "—"}
              </span>
              {product?.originalPrice && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: TEXT_MUTED,
                    }}
                  >
                    M.R.P.
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 18,
                      fontWeight: 400,
                      color: TEXT_MUTED,
                      textDecoration: "line-through",
                    }}
                  >
                    {product.originalPrice}
                  </span>
                </span>
              )}
              {discountPct && (
                <span
                  style={{
                    background: "#e8f4ec",
                    color: SUCCESS,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: 8,
                    letterSpacing: "0.02em",
                  }}
                >
                  {discountPct}% OFF
                </span>
              )}
            </div>

            {/* Tax note */}
            <p
              className="pm-anim pm-anim-2"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 500,
                color: TEXT_MUTED,
                marginBottom: 24,
              }}
            >
              Inclusive of all taxes · Free shipping on orders above ₹499
            </p>

            {/* Divider */}
            <div
              style={{ height: 1, background: MIST, marginBottom: 24 }}
              className="pm-anim pm-anim-2"
            />

            {/* Color Selector */}
            {colorVariants.length > 0 && (
              <div
                className="pm-anim pm-anim-2"
                style={{ marginBottom: 28 }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                  <span
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: TEXT_SEC,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Colour
                  </span>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 14,
                      fontStyle: "italic",
                      color: GOLD_DEEP,
                    }}
                  >
                    {selectedColor ? selectedColor.color : "Default"}
                  </span>
                </div>
                <div className="pm-swatch-track">
                  {/* Default / original photo swatch */}
                  <button className="pm-swatch" onClick={() => setSelectedColorIdx(null)}>
                    <div className={`pm-swatch-ring${selectedColorIdx === null ? " is-active" : ""}`}>
                      <div className="pm-swatch-photo">
                        {product?.image ? (
                          <img src={product.image} alt="Default" />
                        ) : (
                          <span style={{ fontSize: 22 }}>{product?.emoji || "🏷️"}</span>
                        )}
                      </div>
                      {selectedColorIdx === null && (
                        <span className="pm-swatch-check">
                          <CheckCircle2 size={12} color={WHITE} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span className={`pm-swatch-label${selectedColorIdx === null ? " is-active" : ""}`}>
                      Default
                    </span>
                  </button>

                  {colorVariants.map((variant, idx) => (
                    <button key={idx} className="pm-swatch" onClick={() => setSelectedColorIdx(idx)}>
                      <div className={`pm-swatch-ring${selectedColorIdx === idx ? " is-active" : ""}`}>
                        <div className="pm-swatch-photo">
                          {variant.image ? (
                            <img src={variant.image} alt={variant.color} />
                          ) : (
                            <span style={{ fontSize: 22 }}>{product?.emoji || "🏷️"}</span>
                          )}
                        </div>
                        {selectedColorIdx === idx && (
                          <span className="pm-swatch-check">
                            <CheckCircle2 size={12} color={WHITE} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <span className={`pm-swatch-label${selectedColorIdx === idx ? " is-active" : ""}`}>
                        {variant.color}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty + CTA */}
            <div
              className="pm-anim pm-anim-2"
              style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT_SEC,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    minWidth: 72,
                  }}
                >
                  Quantity
                </span>
                <QtySelector qty={qty} onChange={setQty} />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className="pm-btn-buy"
                  onClick={handleBuyNow}
                  disabled={!product}
                  style={{ flex: "1 1 140px" }}
                >
                  Buy Now
                </button>
                <button
                  ref={addBtnRef}
                  className={`pm-btn-cart${addedAnim ? " pm-btn-cart-added" : ""}`}
                  onClick={handleAddToCart}
                  disabled={!product}
                  style={{ flex: "1 1 140px" }}
                >
                  {addedAnim ? "✓ Added to Cart" : "Add to Cart"}
                </button>
              </div>

              {/* Wishlist + Share row */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    const newWish = !wishlist;
                    setWishlist(newWish);
                    if (newWish) {
                      handleAddToCart();
                    } else {
                      if (product) {
                        removeFromCart(product.id);
                        toast({
                          title: "Removed from Cart",
                          description: `${product.title} removed.`,
                        });
                      }
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: `1px solid ${MIST}`,
                    borderRadius: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: wishlist ? "#c0392b" : TEXT_MUTED,
                    transition: "all 0.2s",
                    
                  }}
                >
                  <Heart
                    size={15}
                    fill={wishlist ? "#c0392b" : "none"}
                    stroke={wishlist ? "#c0392b" : TEXT_MUTED}
                    strokeWidth={2}
                  />
                  {wishlist ? "Wishlisted" : "Wishlist"}
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: `1px solid ${MIST}`,
                    borderRadius: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: copied ? SUCCESS : TEXT_MUTED,
                    transition: "all 0.2s",
                  }}
                >
                  <Share2 size={15} />
                  {copied ? "Link Copied!" : "Share"}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: MIST, marginBottom: 24 }} />

            {/* Info Tab Bar */}
            <div className="pm-anim pm-anim-3">
              <div id="info-tabs" className="pm-tab-bar">
                {(["features", "specs"] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`pm-tab${openTab === tab ? " pm-tab-active" : ""}`}
                    onClick={() => setOpenTab(tab)}
                  >
                    {tab === "features" ? "Key Features" : "Specifications"}
                  </button>
                ))}
              </div>

              {/* Features Tab */}
              {openTab === "features" && (
                <div>
                  {product?.features?.length ? (
                    product.features.map((f, i) => (
                      <div key={i} className="pm-feature-item">
                        <CheckCircle2
                          size={16}
                          style={{ color: GOLD_DEEP, flexShrink: 0, marginTop: 2 }}
                        />
                        <span>{f}</span>
                      </div>
                    ))
                  ) : (
                    <p
                      style={{
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        fontSize: 14,
                        color: TEXT_MUTED,
                        padding: "12px 0",
                      }}
                    >
                      Features will be listed here.
                    </p>
                  )}
                </div>
              )}


              {/* Specs Tab */}
              {openTab === "specs" && (
                <div>
                  {[
                    { label: "Category", value: categoryName },
                    { label: "Technology", value: "QR Code" },
                    { label: "Material", value: "Durable PVC" },
                    { label: "Connectivity", value: "No Bluetooth. No battery. No app for scanner." },
                    { label: "Account Required", value: "Yes — for tag owner. Not for finder." },
                    { label: "Compatibility", value: "All smartphones with camera (QR)." },
                    { label: "Replaceable", value: "Yes — contact support" },
                  ].map((spec) => (
                    <div
                      key={spec.label}
                      className="pm-spec-row"
                    >
                      <span
                        style={{
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                          fontSize: 12,
                          fontWeight: 700,
                          color: TEXT_MUTED,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {spec.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                          fontSize: 14,
                          fontWeight: 500,
                          color: TEXT_SEC,
                        }}
                      >
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Register CTA note */}
            <div
              className="pm-anim pm-anim-3"
              style={{
                marginTop: 24,
                background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${SMOKE} 100%)`,
                border: `1px solid ${GOLD}`,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Info size={16} style={{ color: GOLD_DEEP, flexShrink: 0, marginTop: 2 }} />
              <p
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: INK_SOFT,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                After purchase, register your tag at{" "}
                <a
                  href="https://app.plzpingme.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: GOLD_DEEP,
                    fontWeight: 700,
                    textDecoration: "none",
                    borderBottom: `1px solid ${GOLD_DEEP}`,
                  }}
                >
                  app.plzpingme.com
                </a>{" "}
                to activate privacy features and start receiving pings.
              </p>
            </div>

          </div>
        </div>

        {/* ── Customer Reviews Section ── */}
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(16px, 4vw, 32px)", boxSizing: "border-box", width: "100%" }}>
          <div id="customer-reviews" className="pm-anim" style={{ marginTop: 64, borderTop: `1px solid ${MIST}`, paddingTop: 48, marginBottom: 64 }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: INK, marginBottom: 32 }}>
              Customer Reviews ({reviews.length})
            </h2>

            <div className="pm-reviews-container">
              {/* Left Column: Rating Summary Card */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 20, 
                    padding: 28, 
                    borderRadius: 24, 
                    border: `1px solid ${MIST}`, 
                    background: REVIEW_SUMMARY_BG,
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)" 
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <h4 style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Average Rating
                    </h4>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 44, fontWeight: 800, color: INK }}>
                        {averageRating || "0.0"}
                      </span>
                      <span style={{ fontSize: 14, color: TEXT_MUTED }}>/ 5.0</span>
                    </div>
                    <div style={{ display: "flex", gap: 3, margin: "4px 0" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          fill={star <= averageRating ? GOLD : "none"}
                          stroke={star <= averageRating ? GOLD : "#d6d3d1"}
                          strokeWidth={2}
                        />
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED, fontWeight: 500 }}>
                      Based on {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: MIST }} />

                  {/* Star Distribution Bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {([5, 4, 3, 2, 1] as const).map((stars) => (
                      <div key={stars} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, width: 44 }}>
                          {stars} star
                        </span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: MIST, overflow: "hidden" }}>
                          <div 
                            style={{ 
                              height: "100%", 
                              width: `${starDistribution[stars]}%`, 
                              background: GOLD_DEEP, 
                              borderRadius: 3,
                              transition: "width 0.6s ease"
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_MUTED, width: 32, textAlign: "right" }}>
                          {starDistribution[stars]}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/products/${categorySlug}/${productId}/add-review`}
                  className="pm-btn-write-review"
                >
                  Write a Review
                </Link>
              </div>

              {/* Right Column: Reviews List */}
              <div style={{ flex: 1 }}>
                {loadingReviews ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "40px 0" }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: GOLD }} />
                    <span style={{ fontSize: 14, color: TEXT_MUTED }}>Loading reviews...</span>
                  </div>
                ) : reviews.length > 0 ? (
                  <>
                    {/* Customer Photos Row */}
                    {allReviewImages.length > 0 && (
                      <div style={{ marginBottom: 32 }}>
                        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
                          Photos from Customers
                        </h3>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                          {allReviewImages.map((imgUrl, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                width: 88, 
                                height: 88, 
                                borderRadius: 16, 
                                overflow: "hidden", 
                                border: `1px solid ${MIST}`,
                                background: SMOKE,
                                cursor: "zoom-in",
                                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)"
                              }}
                              onClick={() => setActiveReviewImage(imgUrl)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.05) translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.1)";
                                e.currentTarget.style.borderColor = GOLD;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1) translateY(0)";
                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.02)";
                                e.currentTarget.style.borderColor = MIST;
                              }}
                            >
                              <img src={imgUrl} alt={`Customer photo ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {reviews.slice(0, visibleReviewsCount).map((r, i) => (
                        <div 
                          key={r.id || i} 
                          style={{ 
                            padding: "24px", 
                            borderRadius: 20,
                            border: `1px solid ${MIST}`,
                            background: REVIEW_CARD_BG,
                            display: "flex",
                            gap: 16,
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.005)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(26, 20, 16, 0.02)";
                            e.currentTarget.style.borderColor = GOLD_DEEP;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0, 0, 0, 0.005)";
                            e.currentTarget.style.borderColor = MIST;
                          }}
                        >
                          {/* Avatar Column */}
                          <div 
                            style={{ 
                              width: 44, 
                              height: 44, 
                              borderRadius: "50%", 
                              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`, 
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              fontWeight: 700,
                              flexShrink: 0,
                              letterSpacing: "0.05em",
                              boxShadow: "0 2px 8px rgba(201, 146, 42, 0.15)"
                            }}
                          >
                            {getInitials(r.authorName)}
                          </div>

                          {/* Content Column */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                            {/* Header row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>
                                  {r.authorName}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: SUCCESS, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                    ✓ Verified Purchase
                                  </span>
                                </div>
                              </div>
                              
                              <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                                {r.createdAt ? (
                                  new Date((r.createdAt as any).seconds * 1000).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                ) : (
                                  "Just now"
                                )}
                              </span>
                            </div>

                            {/* Rating row */}
                            <div style={{ display: "flex", gap: 2 }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={13}
                                  fill={star <= r.rating ? GOLD : "none"}
                                  stroke={star <= r.rating ? GOLD : "#d6d3d1"}
                                  strokeWidth={2}
                                />
                              ))}
                            </div>

                            {/* Review Comment */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <h5 style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: INK }}>
                                {r.title}
                              </h5>
                              <p style={{ margin: 0, fontSize: 14, color: INK_SOFT, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                                {r.comment}
                              </p>
                            </div>

                            {/* Review Images */}
                            {r.images && r.images.length > 0 && (
                              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                                {r.images.map((imgUrl, idx) => (
                                  <div 
                                    key={idx} 
                                    style={{ 
                                      width: 96, 
                                      height: 96, 
                                      borderRadius: 14, 
                                      overflow: "hidden", 
                                      border: `1px solid ${MIST}`,
                                      background: SMOKE,
                                      cursor: "zoom-in",
                                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)"
                                    }}
                                    onClick={() => setActiveReviewImage(imgUrl)}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = "scale(1.04)";
                                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.12)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = "scale(1)";
                                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.02)";
                                    }}
                                  >
                                    <img src={imgUrl} alt={`Review photo ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* See More / Show Less Button */}
                    {reviews.length > 3 && (
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
                        {visibleReviewsCount < reviews.length ? (
                          <button
                            onClick={() => setVisibleReviewsCount((prev) => prev + 3)}
                            style={{
                              background: "transparent",
                              color: GOLD_DEEP,
                              border: `1.5px solid ${GOLD_DEEP}`,
                              borderRadius: 12,
                              padding: "10px 24px",
                              fontFamily: "'DM Sans', system-ui, sans-serif",
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = GOLD_LIGHT)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            See More Reviews
                          </button>
                        ) : (
                          <button
                            onClick={() => setVisibleReviewsCount(3)}
                            style={{
                              background: "transparent",
                              color: TEXT_MUTED,
                              border: `1px solid ${MIST}`,
                              borderRadius: 12,
                              padding: "10px 24px",
                              fontFamily: "'DM Sans', system-ui, sans-serif",
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(26,20,16,0.02)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            Show Less
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <p style={{ fontSize: 14, color: TEXT_MUTED, margin: "0 0 8px" }}>
                      No reviews yet for this product.
                    </p>
                    <p style={{ fontSize: 12, color: TEXT_MUTED, margin: 0 }}>
                      Be the first to share your thoughts!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust Perks Strip ── */}
        <div
          style={{
            background: WHITE,
            borderTop: `1px solid ${MIST}`,
            borderBottom: `1px solid ${MIST}`,
          }}
        >
          <div className="pm-perks-grid">
            {TRUST_PERKS.map((perk, i) => (
              <div
                key={i}
                className="pm-perk"
                style={{
                  borderRight:
                    i < TRUST_PERKS.length - 1 ? `1px solid ${MIST}` : "none",
                }}
              >
                <span style={{ color: GOLD_DEEP }}>{perk.icon}</span>
                <p
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 14,
                    fontWeight: 800,
                    color: INK,
                    margin: 0,
                  }}
                >
                  {perk.title}
                </p>
                <p
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 400,
                    color: TEXT_SEC,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {perk.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Support Banner ── */}
        <SupportBanner />

        {/* ── Related Products ── */}
        {product && normalizedSlug && (
          <RelatedProducts
            products={categoryProducts}
            currentId={product.id}
            categorySlug={normalizedSlug}
          />
        )}

        {/* Review Image Lightbox Modal */}
        {activeReviewImage && (
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(26, 20, 16, 0.85)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              cursor: "zoom-out"
            }}
            onClick={() => setActiveReviewImage(null)}
          >
            <div 
              style={{
                position: "relative",
                maxWidth: "90%",
                maxHeight: "90%",
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
                cursor: "default"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={activeReviewImage} 
                alt="Zoomed review photo" 
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  objectFit: "contain"
                }} 
              />
              <button 
                onClick={() => setActiveReviewImage(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.5)",
                  color: "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 20,
                  fontWeight: 300,
                  lineHeight: 1,
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)"}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductDetail;