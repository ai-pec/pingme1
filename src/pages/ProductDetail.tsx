import { useState, useEffect, useRef } from "react";
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
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  subscribeToProducts,
  type DbProduct,
  subscribeToProductCategories,
} from "../lib/productService";
import {
  normalizeCategorySlug,
  categoryNameFromSlug,
  type ProductVariant,
} from "../lib/productCatalog";

/* ─── Brand Tokens ────────────────────────────────────────────── */
const GOLD       = "#edd09f";
const GOLD_DEEP  = "#c9a96e";
const GOLD_LIGHT = "#f5e6c8";
const INK        = "#1a1410";
const INK_SOFT   = "#2e261c";
const SMOKE      = "#f9f4ec";
const SMOKE_DEEP = "#f0e8d8";
const MIST       = "#e8ddd0";
const TEXT_SEC   = "#6b5d4f";
const TEXT_MUTED = "#a89880";
const SUCCESS    = "#4a7c59";

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
  const [zoomed, setZoomed] = useState(false);

  const validImages = images.filter((img, i) => img && !imageFailed[i]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 88 }}>
      {/* Main image */}
      <div
        onClick={() => setZoomed(!zoomed)}
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
          boxShadow: zoomed
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
              transform: zoomed ? "scale(1.12)" : "scale(1)",
              transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
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
            opacity: zoomed ? 0 : 1,
            transition: "opacity 0.3s",
          }}
        >
          Click to zoom
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
      background: "#fff",
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
              background: "#fff",
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
          background: "#fff",
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
  const { addToCart, clearCart } = useCart();
  const { toast } = useToast();

  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [categoryMetadata, setCategoryMetadata] = useState<
    Record<string, { name?: string; description?: string; icon?: string; coverImage?: string }>
  >({});
  const [qty, setQty] = useState(1);
  const [addedAnim, setAddedAnim] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const [openTab, setOpenTab] = useState<"features" | "how" | "specs">("features");
  const [copied, setCopied] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

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

  /* ── Resolve product ── */
  const normalizedSlug = categorySlug ? normalizeCategorySlug(categorySlug) : null;

  const categoryProducts = dbProducts.filter(
    (p) => normalizeCategorySlug(p.categorySlug) === normalizedSlug
  ) as unknown as ProductVariant[];

  const product = categoryProducts.find((p) => p.id === productId);

  const categoryMeta = normalizedSlug ? categoryMetadata[normalizedSlug] : null;
  const categoryName =
    categoryMeta?.name || (normalizedSlug ? categoryNameFromSlug(normalizedSlug) : "Products");

  /* ── Derived fields ── */
  const images: string[] = product?.image ? [product.image] : [];
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
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
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
      {/* ── Global Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');

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
      `}</style>   {/* ── Announcement Bar ── */}
        <div
          style={{
            background: INK,
            overflow: "hidden",
            padding: "9px 0",
            borderBottom: `1px solid ${INK_SOFT}`,
          }}
        >
          <div className="pm-announce">
            {[
              "🔒 Privacy-First — Your number is never shared",
              "📦 Pan-India Shipping",
              "✅ Easy Replacements",
              "⚡ No App Needed for Scanner",
              "💬 WhatsApp Support Available",
              "🔒 Privacy-First — Your number is never shared",
              "📦 Pan-India Shipping",
              "✅ Easy Replacements",
              "⚡ No App Needed for Scanner",
              "💬 WhatsApp Support Available",
            ].map((item, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: GOLD_LIGHT,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.02em",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

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
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 18,
                    fontWeight: 400,
                    color: TEXT_MUTED,
                    textDecoration: "line-through",
                  }}
                >
                  {product.originalPrice}
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
                  onClick={() => setWishlist((w) => !w)}
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
              <div className="pm-tab-bar">
                {(["features", "how", "specs"] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`pm-tab${openTab === tab ? " pm-tab-active" : ""}`}
                    onClick={() => setOpenTab(tab)}
                  >
                    {tab === "features"
                      ? "Key Features"
                      : tab === "how"
                      ? "How It Works"
                      : "Specifications"}
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

              {/* How It Works Tab */}
              {openTab === "how" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    {
                      step: "01",
                      title: "Attach or carry",
                      desc: "Place your PingME tag on your vehicle, bag, collar, or card.",
                    },
                    {
                      step: "02",
                      title: "Register it",
                      desc: "Link the tag to your account at app.plzpingme.com — takes under 2 minutes.",
                    },
                    {
                      step: "03",
                      title: "Get contacted privately",
                      desc: "Anyone who scans your tag can send you a message — without ever seeing your real number.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                        padding: "14px 0",
                        borderBottom: `1px solid ${MIST}`,
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: GOLD_LIGHT,
                          color: GOLD_DEEP,
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {item.step}
                      </span>
                      <div>
                        <p
                          style={{
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                            fontSize: 14,
                            fontWeight: 700,
                            color: INK,
                            margin: "0 0 4px",
                          }}
                        >
                          {item.title}
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
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Specs Tab */}
              {openTab === "specs" && (
                <div>
                  {[
                    { label: "Category", value: categoryName },
                    { label: "Technology", value: "QR Code + NFC (where supported)" },
                    { label: "Material", value: "Durable PVC / Aluminium (product-specific)" },
                    { label: "Connectivity", value: "No Bluetooth. No battery. No app for scanner." },
                    { label: "Account Required", value: "Yes — for tag owner. Not for finder." },
                    { label: "Compatibility", value: "All smartphones with camera (QR). NFC-enabled for tap." },
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

        {/* ── Trust Perks Strip ── */}
        <div
          style={{
            background: "#fff",
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

      
    </MainLayout>
  );
};

export default ProductDetail;