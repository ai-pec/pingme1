import { useEffect, useMemo, useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import { ArrowLeft, ChevronRight, Shield, Lock, Package, RefreshCw, MessageCircle, Zap } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useParams, useNavigate } from "react-router-dom";
import {
  buildGenericCategoryTutorial,
  categoryCoverImageFromProducts,
  categoryDescriptionFromName,
  categoryGradientFromSlug,
  categoryIconFromProducts,
  startingPriceFromProducts,
  categoryNameFromSlug,
  normalizeCategorySlug,
  type ProductVariant,
  type ProductCategory,
} from "../lib/productCatalog";
import {
  subscribeToProducts,
  type DbProduct,
  subscribeToProductCategories,
} from "../lib/productService";

/* ─── Brand tokens ── */
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

const categoryEmojiBySlug: Record<string, string> = {
  "car-tags": "🚗",
  "pet-tags": "🐾",
  "nfc-cards": "💳",
  "keychain-tags": "🔑",
  "backpack-stickers": "🎒",
};

const categoryBadgePalette: Record<string, { bg: string; color: string }> = {
  "car-tags":          { bg: "#e8f0e8", color: SUCCESS },
  "pet-tags":          { bg: "#fdecea", color: "#c0392b" },
  "nfc-cards":         { bg: GOLD_LIGHT, color: GOLD_DEEP },
  "keychain-tags":     { bg: "#e8eaf8", color: "#3d50a8" },
  "backpack-stickers": { bg: "#fdf1e0", color: "#9a6b1e" },
};

const TICKER_ITEMS = [
  "🔒 Privacy First",
  "📦 Ships Across India",
  "⚡ No App Needed",
  "🐾 Pet Safe",
  "🚗 Vehicle Ready",
  "💳 NFC Enabled",
  "✅ Easy Replacements",
  "💬 WhatsApp Support",
];

const TRUST_ITEMS = [
  { icon: <Lock size={18} />, label: "Privacy-First Design" },
  { icon: <Package size={18} />, label: "Pan-India Shipping" },
  { icon: <RefreshCw size={18} />, label: "Easy Replacements" },
  { icon: <MessageCircle size={18} />, label: "WhatsApp Support" },
  { icon: <Zap size={18} />, label: "Instant Setup" },
];

const FAQ_ITEMS = [
  {
    q: "How does privacy work with PingME tags?",
    a: "PingME uses a masked contact system — when someone scans your tag, they can reach you through our platform without ever seeing your actual phone number, email, or address. Your personal data stays private.",
  },
  {
    q: "Does the person scanning need to download an app?",
    a: "No app required on their end. Anyone with a smartphone camera can scan a QR code, and most modern phones support NFC natively. Zero friction for the finder.",
  },
  {
    q: "What happens if my tag is lost or damaged?",
    a: "Contact our support team and we'll arrange a replacement. Your registered profile and data remain intact — just re-register the new tag to your existing account.",
  },
  {
    q: "Can I register multiple tags under one account?",
    a: "Yes! A single PingME account supports multiple tags — ideal for tagging your car, pet, bag, and more. Manage them all from one dashboard.",
  },
  {
    q: "Do you ship across India?",
    a: "Absolutely. We ship pan-India via reliable courier partners. Standard delivery takes 3–5 business days. Expedited options are available at checkout.",
  },
];

/* ── Ticker — never pauses ── */
const Ticker = () => (
  <div style={{ overflow: "hidden", width: "100%", padding: "12px 0" }}>
    <style>{`
      @keyframes ticker {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .pm-ticker-inner {
        display: flex;
        gap: 12px;
        width: max-content;
        animation: ticker 28s linear infinite;
      }
    `}</style>
    <div className="pm-ticker-inner">
      {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            background: GOLD_LIGHT,
            color: GOLD_DEEP,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "12px",
            fontWeight: 700,
            padding: "6px 14px",
            borderRadius: "999px",
            whiteSpace: "nowrap",
            border: `1px solid ${MIST}`,
            letterSpacing: "0.02em",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  </div>
);

/* ── FAQ Accordion ── */
const FAQAccordion = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
      <h2
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "clamp(24px, 4vw, 36px)",
          fontWeight: 800,
          color: INK,
          textAlign: "center",
          marginBottom: 48,
          letterSpacing: "-0.02em",
        }}
      >
        Frequently Asked Questions
      </h2>
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${MIST}` }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              gap: 16,
            }}
          >
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "15px", fontWeight: 700, color: INK }}>
              {item.q}
            </span>
            <span
              style={{
                fontSize: 22,
                color: GOLD_DEEP,
                flexShrink: 0,
                transition: "transform 0.3s",
                transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                display: "inline-block",
                fontWeight: 300,
              }}
            >
              +
            </span>
          </button>
          <div style={{ maxHeight: open === i ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
            <p
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: "14px",
                color: TEXT_SEC,
                lineHeight: 1.7,
                margin: 0,
                background: "#fdf8f2",
                borderRadius: 8,
                padding: "12px 16px 16px",
                marginBottom: 16,
              }}
            >
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};

/* ── Trust Strip ── */
const TrustStrip = () => (
  <div style={{ background: GOLD_LIGHT, borderTop: `1px solid ${MIST}`, borderBottom: `1px solid ${MIST}`, padding: "32px 24px" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "24px 0" }}>
      {TRUST_ITEMS.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 28px",
            borderRight: i < TRUST_ITEMS.length - 1 ? `1px solid ${MIST}` : "none",
          }}
        >
          <span style={{ color: GOLD_DEEP }}>{item.icon}</span>
          <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "14px", fontWeight: 700, color: INK_SOFT, whiteSpace: "nowrap" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

/* ── Category Cover Image ── */
const CategoryCoverImage = ({ category }: { category: ProductCategory }) => {
  const [failed, setFailed] = useState(false);
  if (!category.coverImage || failed) {
    return <span style={{ fontSize: 56, lineHeight: 1 }} aria-hidden>{category.icon}</span>;
  }
  return (
    <img
      src={category.coverImage}
      alt={category.name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "contain", transition: "transform 0.5s ease" }}
    />
  );
};

/* ── Product Card ── */
const ProductCardItem = ({ product, categorySlug }: { product: ProductVariant & { categorySlug: string }; categorySlug?: string }) => {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const badge = categorySlug ? categoryBadgePalette[categorySlug] : null;
  const productRoute = `/products/${categorySlug || product.categorySlug}/${product.id}`;

  return (
    <>
      <style>{`
        .pm-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid ${MIST};
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s cubic-bezier(0.4,0,0.2,1), border-color 0.28s ease;
          box-shadow: 0 4px 24px rgba(26,20,16,0.07);
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          text-align: left;
        }
        .pm-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(26,20,16,0.13); border-color: ${GOLD}; }
        .pm-card:hover .pm-card-img { transform: scale(1.05); }
        .pm-card-img { transition: transform 0.4s ease; }
      `}</style>
      <button type="button" className="pm-card" onClick={() => navigate(productRoute)}>
        {product.popular && (
          <span style={{ position: "absolute", top: 14, right: 14, zIndex: 2, background: GOLD, color: INK, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.05em" }}>
            BEST SELLER
          </span>
        )}
        {badge && categorySlug && (
          <span style={{ position: "absolute", top: 14, left: 14, zIndex: 2, background: badge.bg, color: badge.color, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {categoryNameFromSlug(categorySlug)}
          </span>
        )}
        <div style={{ background: SMOKE, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 20 }}>
          {product.image && !imageFailed ? (
            <img src={product.image} alt={product.title} loading="lazy" decoding="async" className="pm-card-img" onError={() => setImageFailed(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span className="pm-card-img" style={{ fontSize: 72, display: "block", textAlign: "center" }}>{product.emoji}</span>
          )}
        </div>
        <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
          <h3 style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 17, fontWeight: 800, color: INK, marginBottom: 6, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
            {product.title}
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 20, fontWeight: 800, color: GOLD_DEEP, letterSpacing: "-0.02em" }}>{product.price}</span>
            {product.originalPrice && (
              <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, color: TEXT_MUTED, textDecoration: "line-through" }}>{product.originalPrice}</span>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${MIST}`, marginBottom: 12 }} />
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", flex: 1 }}>
            {product.features.slice(0, 3).map((f, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, fontWeight: 500, color: TEXT_SEC }}>
                <Shield size={13} style={{ color: GOLD_DEEP, flexShrink: 0, marginTop: 2 }} />
                {f}
              </li>
            ))}
          </ul>
          <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12, fontWeight: 600, color: TEXT_MUTED, margin: 0, letterSpacing: "0.02em" }}>
            Tap to see product details and checkout.
          </p>
        </div>
      </button>
    </>
  );
};

/* ═══════════════════════════════════ MAIN ═══════════════════════════════════ */
const Products = () => {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const navigate = useNavigate();
  const selectedCategory = categorySlug ? normalizeCategorySlug(categorySlug) : null;
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [categoryMetadata, setCategoryMetadata] = useState<Record<string, { name?: string; description?: string; icon?: string; coverImage?: string; gradient?: string }>>({});
  const [filterSlug, setFilterSlug] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("featured");

  useEffect(() => {
    const unsub = subscribeToProducts((latest) => setDbProducts(latest), (err) => console.error(err));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToProductCategories((map) => setCategoryMetadata(map), (err) => console.error(err));
    return unsub;
  }, []);

  const categories = useMemo(() => {
    const groups = new Map<string, DbProduct[]>();
    dbProducts.forEach((p) => {
      const slug = normalizeCategorySlug(p.categorySlug) || "uncategorized";
      groups.set(slug, [...(groups.get(slug) || []), p]);
    });
    const allSlugs = new Set([...groups.keys(), ...Object.keys(categoryMetadata)]);
    return Array.from(allSlugs).map((slug) => {
      const products = groups.get(slug) || [];
      const meta = categoryMetadata[slug] || {};
      const name = meta.name || categoryNameFromSlug(slug);
      return {
        slug, name,
        description: meta.description || categoryDescriptionFromName(name),
        icon: meta.icon?.trim() || categoryEmojiBySlug[slug] || categoryIconFromProducts(products),
        coverImage: meta.coverImage || categoryCoverImageFromProducts(products),
        gradient: meta.gradient || categoryGradientFromSlug(slug),
        products: products.sort((a, b) => {
          if (a.popular !== b.popular) return a.popular ? -1 : 1;
          const aC = /car\s?(sticker|tag)/i.test(a.title);
          const bC = /car\s?(sticker|tag)/i.test(b.title);
          if (aC && !bC) return -1; if (!aC && bC) return 1;
          return a.title.localeCompare(b.title);
        }),
      };
    }).sort((a, b) => { if (a.slug === "car-tags") return -1; if (b.slug === "car-tags") return 1; return a.name.localeCompare(b.name); });
  }, [dbProducts, categoryMetadata]);

  const activeCategory = categories.find((c) => c.slug === selectedCategory);
  const activeTutorial = useMemo(() => (activeCategory ? buildGenericCategoryTutorial(activeCategory.name) : null), [activeCategory]);

  const displayedProducts = useMemo(() => {
    if (!activeCategory) return [];
    let list = [...activeCategory.products];
    if (sortOrder === "price-asc") list.sort((a, b) => parseFloat(a.price.replace(/[^\d.]/g, "")) - parseFloat(b.price.replace(/[^\d.]/g, "")));
    else if (sortOrder === "price-desc") list.sort((a, b) => parseFloat(b.price.replace(/[^\d.]/g, "")) - parseFloat(a.price.replace(/[^\d.]/g, "")));
    return list;
  }, [activeCategory, sortOrder]);

  const displayedCategories = useMemo(() => filterSlug === "all" ? categories : categories.filter((c) => c.slug === filterSlug), [categories, filterSlug]);

  return (
    <MainLayout>
      <style>{`
        .pm-page { background: ${SMOKE}; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; }

        .pm-cat-card {
          background: #ffffff; border-radius: 16px; border: 1px solid ${MIST}; overflow: hidden; cursor: pointer;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s cubic-bezier(0.4,0,0.2,1), border-color 0.28s ease;
          box-shadow: 0 4px 24px rgba(26,20,16,0.07); text-align: left; display: flex; flex-direction: column;
        }
        .pm-cat-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(26,20,16,0.13); border-color: ${GOLD}; }
        .pm-cat-card:hover .pm-cat-img { transform: scale(1.07); }
        .pm-cat-img { transition: transform 0.5s ease; }

        .pm-tab {
          border: 1px solid ${MIST}; border-radius: 999px; padding: 7px 18px;
          font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s;
          background: transparent; color: ${TEXT_MUTED}; white-space: nowrap;
        }
        .pm-tab:hover { border-color: ${GOLD_DEEP}; color: ${INK}; }
        .pm-tab-active { background: ${GOLD} !important; color: ${INK} !important; border-color: ${GOLD} !important; }

        .pm-select {
          border: 1px solid ${MIST}; border-radius: 8px; padding: 7px 32px 7px 12px;
          font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 700; color: ${INK};
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a89880' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center;
          appearance: none; cursor: pointer; transition: border-color 0.2s;
        }
        .pm-select:hover { border-color: ${GOLD_DEEP}; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .pm-fade { animation: fadeUp 0.55s ease both; }
        .pm-fade-1 { animation-delay: 0.05s; }
        .pm-fade-2 { animation-delay: 0.13s; }
        .pm-fade-3 { animation-delay: 0.21s; }
        .pm-fade-4 { animation-delay: 0.29s; }

        .pm-rule { display: flex; align-items: center; gap: 12px; justify-content: center; margin: 20px auto 28px; max-width: 320px; }
        .pm-rule::before, .pm-rule::after { content: ''; flex: 1; height: 1px; background: ${MIST}; }

        .pm-product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
        .pm-category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }

        @media (max-width: 640px) {
          .pm-filter-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .pm-filter-scroll::-webkit-scrollbar { display: none; }
        }
      `}</style>

      <div className="pm-page">

        {/* ── Hero ── */}
        <section style={{ paddingTop: "clamp(60px, 10vw, 100px)", paddingBottom: "clamp(32px, 6vw, 60px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, ${MIST} 1px, transparent 1px)`, backgroundSize: "28px 28px", opacity: 0.45, pointerEvents: "none" }} />
          <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
            <span className="pm-fade" style={{ display: "inline-block", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 16 }}>
              {selectedCategory ? "Browse Category" : "Browse Our Collection"}
            </span>
            <h1
              className="pm-fade pm-fade-1"
              onClick={() => selectedCategory && navigate("/products")}
              style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900, color: INK, lineHeight: 1.1, marginBottom: 16, cursor: selectedCategory ? "pointer" : "default", letterSpacing: "-0.03em" }}
            >
              {selectedCategory ? activeCategory?.name || categoryNameFromSlug(selectedCategory) : "Privacy-First Products"}
            </h1>
            <p className="pm-fade pm-fade-2" style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "clamp(15px, 2vw, 18px)", fontWeight: 400, color: TEXT_SEC, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>
              {selectedCategory
                ? activeCategory?.description || "No products are available in this category yet."
                : "QR and NFC tags designed to help people reach you — without exposing your personal details."}
            </p>
            <div className="pm-rule pm-fade pm-fade-3">
              <span style={{ color: GOLD_DEEP, fontSize: 14 }}>◆</span>
            </div>
            <div className="pm-fade pm-fade-4"><Ticker /></div>
          </div>
        </section>

        {/* ── Filter Bar — NOT sticky ── */}
        {!selectedCategory && categories.length > 0 && (
          <div style={{ background: "rgba(249,244,236,0.98)", borderBottom: `1px solid ${MIST}`, padding: "14px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div className="pm-filter-scroll" style={{ display: "flex", gap: 8, flex: 1 }}>
                <button className={`pm-tab${filterSlug === "all" ? " pm-tab-active" : ""}`} onClick={() => setFilterSlug("all")}>All Products</button>
                {categories.map((c) => (
                  <button key={c.slug} className={`pm-tab${filterSlug === c.slug ? " pm-tab-active" : ""}`} onClick={() => setFilterSlug(c.slug)}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
              <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12, fontWeight: 600, color: TEXT_MUTED, whiteSpace: "nowrap", flexShrink: 0 }}>
                {displayedCategories.length} categor{displayedCategories.length !== 1 ? "ies" : "y"}
              </span>
            </div>
          </div>
        )}

        {selectedCategory && (
          <div style={{ background: "rgba(249,244,236,0.98)", borderBottom: `1px solid ${MIST}`, padding: "14px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/products")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14, fontWeight: 700, color: TEXT_SEC, padding: 0 }}>
                <ArrowLeft size={16} /> Back to All Categories
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>
                  {displayedProducts.length} design{displayedProducts.length !== 1 ? "s" : ""}
                </span>
                <select className="pm-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>

          {/* Category Grid */}
          {!selectedCategory && (
            categories.length === 0 ? (
              <div style={{ borderRadius: 16, border: `1.5px dashed ${MIST}`, padding: "64px 24px", textAlign: "center" }}>
                <h2 style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 24, fontWeight: 800, color: INK, marginBottom: 8 }}>Products are coming soon</h2>
                <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: TEXT_MUTED }}>No product categories available yet. Check back shortly.</p>
              </div>
            ) : (
              <div className="pm-category-grid">
                {displayedCategories.map((cat, idx) => (
                  <button key={cat.slug} className={`pm-cat-card pm-fade pm-fade-${Math.min(idx + 1, 4)}`} onClick={() => navigate(`/products/${cat.slug}`)} style={{ width: "100%", padding: 0 }}>
                    <div style={{ background: SMOKE_DEEP, aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 24 }}>
                      <CategoryCoverImage category={cat} />
                    </div>
                    <div style={{ padding: "20px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20 }} aria-hidden>{cat.icon}</span>
                          <h3 style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 18, fontWeight: 800, color: INK, margin: 0, letterSpacing: "-0.02em" }}>{cat.name}</h3>
                        </div>
                        <ChevronRight size={18} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
                      </div>
                      {cat.products.length > 0 && (
                        <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, fontWeight: 700, color: GOLD_DEEP, marginBottom: 6 }}>
                          Starting at {startingPriceFromProducts(cat.products)}
                        </span>
                      )}
                      <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, fontWeight: 400, color: TEXT_SEC, lineHeight: 1.5, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {cat.description}
                      </p>
                      <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12, fontWeight: 600, color: GOLD_DEEP, marginTop: "auto" }}>
                        {cat.products.length} design{cat.products.length !== 1 ? "s" : ""} available
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Category Not Found */}
          {selectedCategory && !activeCategory && (
            <div style={{ borderRadius: 16, border: `1.5px dashed ${MIST}`, padding: "64px 24px", textAlign: "center" }}>
              <h2 style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 24, fontWeight: 800, color: INK, marginBottom: 8 }}>Category not found</h2>
              <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: TEXT_MUTED }}>This category has no products right now.</p>
            </div>
          )}

          {/* Product Grid */}
          {selectedCategory && activeCategory && (
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {activeTutorial && (
                <div style={{ borderRadius: 16, border: `1px solid ${GOLD}`, background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, #ffffff 100%)`, padding: "clamp(24px, 4vw, 40px)" }}>
                  <h2 style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "clamp(20px, 4vw, 30px)", fontWeight: 800, color: INK, marginBottom: 8, letterSpacing: "-0.02em" }}>{activeTutorial.title}</h2>
                  <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 15, color: TEXT_SEC, marginBottom: 28, maxWidth: 600 }}>{activeTutorial.subtitle}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
                    {activeTutorial.steps.map((step, idx) => (
                      <div key={idx} style={{ background: "#ffffff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: GOLD_LIGHT, color: GOLD_DEEP, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</span>
                        <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, fontWeight: 500, color: TEXT_SEC, lineHeight: 1.5, margin: 0 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderRadius: 10, border: `1px solid ${GOLD}`, background: GOLD_LIGHT, padding: "12px 16px", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, color: INK_SOFT }}>
                    <strong style={{ color: INK, fontWeight: 800 }}>Pro Tip:</strong> {activeTutorial.tip}
                  </div>
                </div>
              )}
              <div className="pm-product-grid">
                {displayedProducts.map((product, idx) => (
                  <div key={product.id} className={`pm-fade pm-fade-${Math.min(idx + 1, 4)}`} style={{ height: "100%" }}>
                    <ProductCardItem product={product} categorySlug={selectedCategory || undefined} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <TrustStrip />
        <FAQAccordion />

      </div>
    </MainLayout>
  );
};

export default Products;
