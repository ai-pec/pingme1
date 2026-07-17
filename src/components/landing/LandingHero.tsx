import { useEffect, useRef, useState, useCallback } from "react";
import React, { Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  useScroll,
  useVelocity,
  useAnimationFrame,
  wrap,
} from "framer-motion";
import {
  ArrowRight,
  CarFront,
  Check,
  Fingerprint,
  Globe2,
  MapPinned,
  Nfc,
  PackageSearch,
  PawPrint,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Zap,
  Lock,
  TrendingUp,
  ChevronRight,
  Wifi,
  QrCode,
  Star,
  MousePointer2,
  Bell,
  EyeOff,
  CheckCircle2,
  BadgeCheck,
  Activity,
  Scan,
  Phone,
  Key,
} from "lucide-react";

import carcardFront from "@/assets/product-card.png";
import backpackSticker from "@/assets/pingwebsite-2.webp";
import pingMeLogo from "@/assets/ping-me-logo.png";
import nfcFront from "@/assets/pingprocard_logo.jpeg";
import petSafetyTag from "@/assets/pingprocard.jpeg";
import { subscribeToProducts, type DbProduct } from "@/lib/productService";
import { normalizeCategorySlug, buildProductImageUrl } from "@/lib/productCatalog";

// No SSR — these use framer-motion hooks (useScroll, useVelocity) that
// differ between server and client, causing hydration mismatches on mobile.
const LandingDownloadSection = React.lazy(() => import("./LandingDownloadSection"));
const LandingReviews = React.lazy(() => import("../LandingReviews"));

const heroImagePath = import.meta.env.VITE_HERO_IMAGE_PATH || "products/hero_i.PNG";
const heroImageUrl = buildProductImageUrl(heroImagePath);

/* -----------------------------------------------------------------
   DESIGN TOKENS
----------------------------------------------------------------- */

const GOLD = "#C8820A";
const GOLD_MID = "#F5A623";
const GOLD_SOFT = "#E8940F";
const CREAM = "#FFF9EB";
const CREAM_2 = "#FFF3D6";
const DARK_GOLD = "#3D2200";

/* -----------------------------------------------------------------
   DATA
----------------------------------------------------------------- */

type HeroProduct = {
  categorySlug: string;
  title: string;
  image?: string;
  popular?: boolean;
};

const socialProofUsers = [
  { color: "#F5A623" },
  { color: "#4CAF50" },
  { color: "#2196F3" },
  { color: "#E91E63" },
  { color: "#9C27B0" },
];

const getBestSellingImage = (
  products: DbProduct[],
  categorySlug: string,
  fallback?: string,
): string | undefined => {
  const normalizedTarget = normalizeCategorySlug(categorySlug);
  const categoryProducts = products.filter(
    (p): p is DbProduct & HeroProduct =>
      normalizeCategorySlug(p.categorySlug) === normalizedTarget &&
      typeof (p as HeroProduct).image === "string" &&
      Boolean((p as HeroProduct).image),
  );
  if (!categoryProducts.length) return fallback;
  const bestSeller = [...categoryProducts].sort((l, r) => {
    const li = l as HeroProduct;
    const ri = r as HeroProduct;
    if (li.popular !== ri.popular) return li.popular ? -1 : 1;
    return li.title.localeCompare(ri.title);
  })[0];
  return (bestSeller as HeroProduct).image || fallback;
};

const getOfferings = (products: DbProduct[], hasProductSnapshot: boolean) => [
  {
    categorySlug: "car-tags",
    icon: CarFront,
    title: "Vehicle Tags",
    subtitle: "For your car & bike",
    description:
      "Someone blocked your car? They scan the tag on your dashboard and a private ping reaches you instantly — your number stays completely hidden.",
    image: getBestSellingImage(products, "car-tags", hasProductSnapshot ? carcardFront.src : undefined),
    accent: "#C8820A",
    accentMid: "#F5A623",
    accentBg: "rgba(245,166,35,0.09)",
    points: ["Parking & vehicle alerts", "Secure masked contact", "Works for cars & bikes"],
    tag: "Most popular",
  },
  {
    categorySlug: "keychain-tags",
    icon: Key,
    title: "Keychain Tags",
    subtitle: "For keys & everyday items",
    description:
      "Secure your keys, bag, or backpack. If someone finds them, they scan the tag and ping you privately — keeping your personal phone number completely hidden.",
    image: getBestSellingImage(
      products,
      "keychain-tags",
      hasProductSnapshot ? buildProductImageUrl("products/keychain-tags/keychain_fallback.png") : undefined,
    ),
    accent: "#3b50a8",
    accentMid: "#4f65c1",
    accentBg: "rgba(79,101,193,0.09)",
    points: ["Keys, bags & everyday items", "NFC & QR dual technology", "Owner stays anonymous"],
  },
  {
    categorySlug: "smart-keychain-tags",
    icon: Key,
    title: "Smart Keychain Tags",
    subtitle: "Zodiac & religious designs",
    description:
      "Express yourself with premium engraved tags. Scan to activate your secure profile and share contact options instantly.",
    image: getBestSellingImage(
      products,
      "smart-keychain-tags",
      hasProductSnapshot ? buildProductImageUrl("products/smart-keychain-tags/keytag_fallback.png") : undefined,
    ),
    accent: "#7C3AED",
    accentMid: "#8B5CF6",
    accentBg: "rgba(139,92,246,0.09)",
    points: ["Premium engraved metal/leather", "Zodiac & religious designs", "Instant secure contact options"],
    tag: "New designs",
  },
  {
    categorySlug: "pet-tags",
    icon: PawPrint,
    title: "Pet Safety Tags",
    subtitle: "For cats & dogs",
    description:
      "Lost pet reunions happen faster when any stranger can ping you — without knowing your name, number, or home address.",
    image: getBestSellingImage(products, "pet-tags", hasProductSnapshot ? petSafetyTag.src : undefined),
    accent: "#059669",
    accentMid: "#10B981",
    accentBg: "rgba(16,185,129,0.09)",
    points: ["Fast reunion when pets wander", "Durable tag format", "Owner stays anonymous"],
    tag: null,
  },
  {
    categorySlug: "nfc-cards",
    icon: Nfc,
    title: "NFC Smart Cards",
    subtitle: "Tap-to-connect cards",
    description:
      "Hand out your contact details with a single tap. NFC + QR dual mode means it works with every phone, old or new.",
    image: getBestSellingImage(products, "nfc-cards", hasProductSnapshot ? nfcFront.src : undefined),
    accent: "#0284C7",
    accentMid: "#0EA5E9",
    accentBg: "rgba(14,165,233,0.09)",
    points: ["Tap or scan to share", "Digital business card", "NFC + QR dual mode"],
    tag: null,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Tag,
    title: "Attach your tag",
    body: "Stick or clip a PingME tag to your car, bag, pet collar, or anything that needs to stay reachable — takes 10 seconds.",
    iconColor: GOLD,
    bgColor: "rgba(245,166,35,0.12)",
  },
  {
    step: "02",
    icon: Scan,
    title: "Someone scans it",
    body: "A stranger uses any phone camera — no app to download, no account needed. They get a clean, simple contact form.",
    iconColor: "#0EA5E9",
    bgColor: "rgba(14,165,233,0.10)",
  },
  {
    step: "03",
    icon: Bell,
    title: "You get pinged privately",
    body: "A message reaches you instantly. Your real number is never shown. You decide if and how to respond, on your terms.",
    iconColor: "#10B981",
    bgColor: "rgba(16,185,129,0.10)",
  },
];

const FEATURES = [
  {
    icon: EyeOff,
    title: "Always anonymous",
    text: "Your phone number is never shared. Finders see a message form — not your identity.",
    color: GOLD,
    bg: "rgba(200,130,10,0.10)",
  },
  {
    icon: Zap,
    title: "Zero friction",
    text: "No app download or account needed for the person reaching you. Just scan and send.",
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.10)",
  },
  {
    icon: Fingerprint,
    title: "Contextual pings",
    text: "Pre-defined message types keep every interaction clear, relevant, and purposeful.",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.10)",
  },
  {
    icon: Globe2,
    title: "Built to scale",
    text: "One platform across vehicles, lost items, pets, and digital NFC cards.",
    color: "#10B981",
    bg: "rgba(16,185,129,0.10)",
  },
];


/* -----------------------------------------------------------------
   UTILITY COMPONENTS
----------------------------------------------------------------- */


type FadeUpProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

const FadeUp = (props: FadeUpProps) => {
  const { children, delay = 0, className = "" } = props;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const AnimatedNumber: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = "" }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
};

const SectionEyebrow: React.FC<{ children: React.ReactNode; align?: "center" | "left" }> = ({
  children,
  align = "center",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className={`flex items-center gap-2.5 ${align === "center" ? "justify-center" : ""}`}
  >
    <div
      className="h-px w-8"
      style={{
        background: align === "center"
          ? `linear-gradient(90deg, transparent, ${GOLD})`
          : `linear-gradient(90deg, ${GOLD}, transparent)`,
      }}
    />
    <span className="text-xs font-bold uppercase tracking-[0.26em]" style={{ color: GOLD }}>
      {children}
    </span>
    <div
      className="h-px w-8"
      style={{
        background: align === "center"
          ? `linear-gradient(90deg, ${GOLD}, transparent)`
          : `linear-gradient(90deg, transparent, ${GOLD})`,
      }}
    />
  </motion.div>
);

/* -----------------------------------------------------------------
   SCAN STORY — hero right panel
----------------------------------------------------------------- */

const SCAN_PRODUCTS = [
  { label: "Vehicle Tag", icon: CarFront, color: GOLD, bg: "rgba(245,166,35,0.13)" },
  { label: "Lost & Found", icon: PackageSearch, color: "#64748B", bg: "rgba(100,116,139,0.13)" },
  { label: "Pet Tag", icon: PawPrint, color: "#10B981", bg: "rgba(16,185,129,0.13)" },
  { label: "NFC Card", icon: Nfc, color: "#0EA5E9", bg: "rgba(14,165,233,0.13)" },
];

const ScanStory: React.FC<{ offerings: ReturnType<typeof getOfferings> }> = ({ offerings }) => {
  const [activeCard, setActiveCard] = useState(0);
  const [pingVisible, setPingVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPingVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 4);
      setPingVisible(false);
      const t = setTimeout(() => setPingVisible(true), 1000);
      return () => clearTimeout(t);
    }, 3800);
    return () => clearInterval(iv);
  }, []);

  const active = SCAN_PRODUCTS[activeCard];
  const ActiveIcon = active.icon;

  return (
    <div className="relative w-full h-full min-h-[480px] sm:min-h-[560px] flex items-center justify-center select-none px-8 sm:px-4">
      {/* Ambient radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 75% 65% at 50% 48%, rgba(245,166,35,0.09) 0%, transparent 70%)",
        }}
      />

      {/* -- Central animated product card -- */}
      <div className="relative z-10 w-full max-w-[268px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard}
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.94 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] bg-card"
            style={{
              boxShadow: `0 36px 90px rgba(81,60,9,0.15), 0 8px 28px rgba(0,0,0,0.08)`,
              border: "1px solid hsl(var(--border) / 0.6)",
            }}
          >
            {/* Card header */}
            <div className="px-5 pt-5 pb-4" style={{ background: active.bg }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/90"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                  >
                    <ActiveIcon className="h-[18px] w-[18px]" style={{ color: active.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-foreground/90">{active.label}</p>
                    <p className="text-[9px] font-medium text-muted-foreground">PingME Protected</p>
                  </div>
                </div>
                {/* Progress dots */}
                <div className="flex items-center gap-1">
                  {SCAN_PRODUCTS.map((_, i) => (
                    <motion.div
                      key={i}
                      className="rounded-full"
                      animate={{
                        width: i === activeCard ? 14 : 4,
                        background: i === activeCard ? active.color : "rgba(0,0,0,0.15)",
                      }}
                      transition={{ duration: 0.3 }}
                      style={{ height: 4 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Product image zone */}
            <div className="relative mx-5 my-3.5 h-[180px] sm:h-[198px] overflow-hidden rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted) / 0.9)" }}>
              {offerings[activeCard]?.image ? (
                <img
                  src={offerings[activeCard].image}
                  alt={active.label}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <ActiveIcon className="h-16 w-16 opacity-15" style={{ color: active.color }} />
              )}

              {/* Scan beam animation */}
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  height: 2,
                  background: `linear-gradient(90deg, transparent 0%, ${active.color}60 20%, ${active.color} 50%, ${active.color}60 80%, transparent 100%)`,
                  boxShadow: `0 0 14px ${active.color}70`,
                }}
                animate={{ top: ["18%", "80%", "18%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
              />

              {/* Corner scan reticles */}
              {[
                { top: 8, left: 8 },
                { top: 8, right: 8 },
                { bottom: 8, left: 8 },
                { bottom: 8, right: 8 },
              ].map((pos, pi) => (
                <div
                  key={pi}
                  className="absolute h-5 w-5 pointer-events-none"
                  style={{
                    ...pos,
                    borderTop: pi < 2 ? `2px solid ${active.color}60` : "none",
                    borderBottom: pi >= 2 ? `2px solid ${active.color}60` : "none",
                    borderLeft: pi % 2 === 0 ? `2px solid ${active.color}60` : "none",
                    borderRight: pi % 2 === 1 ? `2px solid ${active.color}60` : "none",
                  }}
                />
              ))}
            </div>

            {/* Privacy footer */}
            <div className="mx-5 mb-5 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.5)" }}>
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(245,166,35,0.12)" }}
              >
                <EyeOff className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground/90">Number never revealed</p>
                <p className="text-[10px] text-muted-foreground">Secure masked communication</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* SVG Connector Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible hidden sm:block z-0" viewBox="0 0 268 374">
          {SCAN_PRODUCTS.map((prod, i) => {
            const isActive = activeCard === i;
            let d = "";
            if (i === 0) { // Top-Left
              d = "M -9,30 C 3,30 3,36 15,36";
            } else if (i === 1) { // Top-Right
              d = "M 277,52 C 265,52 265,58 253,58";
            } else if (i === 2) { // Bottom-Left
              d = "M -9,209 C 3,209 3,215 15,215";
            } else if (i === 3) { // Bottom-Right
              d = "M 277,224 C 265,224 265,230 253,230";
            }
            return (
              <g key={i}>
                {/* Glow path */}
                <path
                  d={d}
                  fill="none"
                  stroke={prod.color}
                  strokeWidth={isActive ? 4 : 0}
                  strokeLinecap="round"
                  opacity={isActive ? 0.25 : 0}
                  style={{ transition: "stroke-width 0.4s, opacity 0.4s" }}
                />
                {/* Main line path */}
                <path
                  d={d}
                  fill="none"
                  stroke={isActive ? prod.color : "currentColor"}
                  strokeWidth={isActive ? 1.5 : 1}
                  strokeDasharray={isActive ? "none" : "3,3"}
                  strokeLinecap="round"
                  className={isActive ? "" : "text-foreground/15 dark:text-white/10"}
                  style={{ transition: "stroke 0.4s, stroke-width 0.4s" }}
                />
                {/* Flowing animated dot */}
                {isActive && (
                  <circle
                    r="2.5"
                    fill={prod.color}
                    style={{ filter: `drop-shadow(0 0 3px ${prod.color})` }}
                  >
                    <animateMotion
                      dur="1.8s"
                      repeatCount="indefinite"
                      path={d}
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating product-type chips — hidden on mobile to avoid overflow */}
        {SCAN_PRODUCTS.map((prod, i) => {
          const ProdIcon = prod.icon;
          const chipPositions = [
            { top: "8%", left: "-52%" },
            { top: "14%", right: "-52%" },
            { top: "56%", left: "-52%" },
            { top: "60%", right: "-52%" },
          ];
          const pos = chipPositions[i];
          return (
            <motion.div
              key={i}
              className="absolute z-20 hidden sm:block"
              style={pos}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: i % 2 === 0 ? [-5, 5, -5] : [5, -5, 5],
              }}
              transition={{
                opacity: { delay: 0.6 + i * 0.14, duration: 0.5 },
                scale: { delay: 0.6 + i * 0.14, duration: 0.5 },
                y: { duration: 3.6 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 },
              }}
            >
              <motion.div
                animate={
                  activeCard === i
                    ? { scale: 1.08, borderColor: prod.color + "70" }
                    : { scale: 1, borderColor: "hsl(var(--border) / 0.5)" }
                }
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2 rounded-2xl bg-card/90 px-3.5 py-2.5 whitespace-nowrap"
                style={{
                  backdropFilter: "blur(18px)",
                  boxShadow:
                    activeCard === i
                      ? `0 10px 32px ${prod.color}35, 0 2px 8px rgba(0,0,0,0.07)`
                      : "0 4px 18px rgba(0,0,0,0.08)",
                  border: `1.5px solid ${activeCard === i ? prod.color + "50" : "hsl(var(--border) / 0.5)"}`,
                  transition: "all 0.35s ease",
                }}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: prod.bg }}
                >
                  <ProdIcon className="h-[15px] w-[15px]" style={{ color: prod.color }} />
                </div>
                <span className="text-[11px] font-bold text-foreground/80">{prod.label}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Ping delivered notification */}
      <AnimatePresence>
        {pingVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.72, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-30"
            style={{ bottom: "4%", right: "4%" }}
          >
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center gap-2.5 rounded-2xl bg-card px-4 py-3"
              style={{
                boxShadow: "0 16px 50px rgba(16,185,129,0.22), 0 4px 16px rgba(0,0,0,0.07)",
                border: "1px solid rgba(16,185,129,0.20)",
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground">Ping delivered!</p>
                <p className="text-[10px] text-muted-foreground">Number stayed private</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag scanned badge */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute z-30"
        style={{ top: "2%", left: "4%" }}
      >
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 4.1, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-2 rounded-2xl bg-card/96 px-3.5 py-2.5"
          style={{
            backdropFilter: "blur(14px)",
            boxShadow: "0 8px 30px rgba(200,130,10,0.18), 0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(245,166,35,0.22)",
          }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "rgba(245,166,35,0.12)" }}
          >
            <QrCode className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-foreground">Tag Scanned</p>
            <p className="text-[9px] text-muted-foreground">→ Ping initiated</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

/* -----------------------------------------------------------------
   TRUST TICKER
----------------------------------------------------------------- */

const TrustTicker: React.FC = () => {
  const items = [
    "No apps needed",
    "Masked communication",
    "QR + NFC enabled",
    "Made in India",
    "Privacy by design",
    "2,400+ active tags",
    "Instant contact",
    "Zero data exposure",
  ];

  const baseVelocity = -5;
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);
  const directionFactor = useRef<number>(1);

  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  const doubled = [...items, ...items, ...items, ...items];

  return (
    <div
      className="overflow-hidden py-4 border-y"
      style={{
        background: "hsl(var(--card) / 0.7)",
        backdropFilter: "blur(10px)",
        borderColor: "rgba(200,130,10,0.12)",
      }}
    >
      <motion.div className="flex gap-12 whitespace-nowrap" style={{ x }}>
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-3.5 flex-shrink-0">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: GOLD_MID }} />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.24em]"
              style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}
            >
              {item}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/* -----------------------------------------------------------------
   STATS BAR
----------------------------------------------------------------- */

const StatsBar: React.FC = () => {
  const stats = [
    { value: 2400, suffix: "+", label: "Tags Active", icon: Activity },
    { value: 98, suffix: "%", label: "Delivery Rate", icon: CheckCircle2 },
    { value: 12, suffix: "s", label: "Avg. Response", icon: Zap },
    { value: 4, suffix: " states", label: "Across India", icon: MapPinned },
  ];

  return (
    <FadeUp delay={0.1}>
      <div className="mx-auto max-w-5xl">
        <div
          className="grid grid-cols-2 sm:grid-cols-4 overflow-hidden rounded-3xl"
          style={{
            background: "hsl(var(--card) / 0.72)",
            backdropFilter: "blur(22px)",
            border: "1px solid rgba(245,166,35,0.14)",
            boxShadow: "0 8px 44px rgba(200,130,10,0.09), 0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={`relative flex flex-col items-center justify-center gap-1.5 px-4 py-6 border-[#F5A623]/10 ${
                  i % 2 === 0 ? "border-r" : ""
                } ${i < 2 ? "border-b" : ""} sm:border-b-0 sm:border-r ${i === 3 ? "sm:border-r-0" : ""}`}
              >
                <div
                  className="mb-1 flex h-9 w-9 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(245,166,35,0.10)" }}
                >
                  <Icon className="h-4 w-4 text-amber-600" />
                </div>
                <span
                  className="text-3xl font-extrabold tracking-tight leading-none"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_MID} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mt-0.5">
                  {s.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </FadeUp>
  );
};

/* -----------------------------------------------------------------
   HOW IT WORKS
----------------------------------------------------------------- */

const HowItWorks: React.FC = () => (
  <section className="space-y-10">
    <div className="max-w-2xl mx-auto text-center space-y-3">
      <SectionEyebrow>How It Works</SectionEyebrow>
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.58 }}
        className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
      >
        Three steps. No friction. Total privacy.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-base leading-8 text-muted-foreground"
      >
        From attaching a tag to getting a private ping — the whole flow takes under 30 seconds.
      </motion.p>
    </div>

    <div className="relative mx-auto max-w-5xl">
      {/* Connecting line (desktop) */}
      <div
        className="absolute top-14 hidden lg:block pointer-events-none"
        style={{
          left: "calc(16.5% + 28px)",
          right: "calc(16.5% + 28px)",
          height: 1,
          background: `linear-gradient(90deg, ${GOLD_MID}40, ${GOLD_MID}50, ${GOLD_MID}40)`,
        }}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = step.icon;
          return (
            <FadeUp key={step.step} delay={i * 0.12}>
              <div
                className="relative flex flex-col items-center text-center p-6 rounded-[1.75rem] border border-border/40 bg-card/75 group cursor-default"
                style={{
                  backdropFilter: "blur(14px)",
                  boxShadow: "0 4px 28px rgba(0,0,0,0.055)",
                  transition: "box-shadow 0.3s ease, transform 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 18px 50px ${step.iconColor}20, 0 4px 16px rgba(0,0,0,0.07)`;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 28px rgba(0,0,0,0.055)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <div
                  className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-3xl"
                  style={{ background: step.bgColor }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-3xl"
                    style={{ background: step.bgColor }}
                    animate={{ scale: [1, 1.28], opacity: [0.55, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: i * 0.45 }}
                  />
                  <Icon className="relative h-6 w-6" style={{ color: step.iconColor }} />
                </div>

                <span
                  className="mb-1.5 text-[10px] font-black tracking-[0.35em]"
                  style={{ color: step.iconColor + "80" }}
                >
                  STEP {step.step}
                </span>

                <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{step.body}</p>

                {i < 2 && (
                  <div className="absolute -right-3 top-14 z-10 hidden lg:flex h-6 w-6 items-center justify-center rounded-full bg-card shadow-sm border border-border/30">
                    <ChevronRight className="h-3 w-3 text-amber-500" />
                  </div>
                )}
              </div>
            </FadeUp>
          );
        })}
      </div>
    </div>
  </section>
);

/* -----------------------------------------------------------------
   OFFERING CARD
----------------------------------------------------------------- */

const OfferingCard: React.FC<{
  item: ReturnType<typeof getOfferings>[0];
  idx: number;
  onClick: () => void;
}> = ({ item, idx, onClick }) => {
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);
  const imageFirst = idx % 2 === 0;

  return (
    <FadeUp delay={idx * 0.07}>
      <motion.article
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="group relative overflow-hidden rounded-[2rem] border border-border/35 bg-card/80 cursor-pointer"
        style={{
          backdropFilter: "blur(18px)",
          boxShadow: hovered
            ? `0 32px 72px ${item.accentMid}22, 0 8px 24px rgba(0,0,0,0.08)`
            : "0 6px 36px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)",
          transition: "box-shadow 0.4s ease",
        }}
        onClick={onClick}
      >
        {item.tag && (
          <div
            className="absolute top-4 right-4 z-20 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_MID})`,
              boxShadow: `0 4px 16px ${GOLD}50`,
            }}
          >
            {item.tag}
          </div>
        )}

        <div className="grid md:grid-cols-2 items-stretch">
          {/* Image panel */}
          <div
            className={`relative flex items-center justify-center overflow-hidden min-h-[180px] md:min-h-[240px] ${
              imageFirst ? "" : "md:order-last"
            }`}
            style={{
              background: `linear-gradient(140deg, ${item.accentBg}, hsl(var(--card) / 0.25))`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle, ${item.accent}20 1px, transparent 1px)`,
                backgroundSize: "22px 22px",
                opacity: 0.6,
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(${imageFirst ? "to right" : "to left"}, transparent 60%, hsl(var(--card) / 0.65) 100%)`,
              }}
            />

            {item.image ? (
              <motion.img
                src={item.image}
                alt={item.title}
                className="relative z-10 h-36 md:h-48 w-full object-contain px-8"
                animate={hovered ? { scale: 1.06, y: -4 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Icon className="relative z-10 h-20 w-20" style={{ color: item.accent, opacity: 0.18 }} />
            )}
          </div>

          {/* Content panel */}
          <div
            className={`flex flex-col justify-center p-5 md:p-8 ${
              imageFirst ? "" : "md:order-first"
            }`}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: item.accentBg, border: `1.5px solid ${item.accent}25` }}
              >
                <Icon className="h-5 w-5" style={{ color: item.accent }} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: item.accent + "CC" }}>
                  {item.subtitle}
                </p>
                <h3 className="text-xl font-extrabold text-foreground leading-tight">{item.title}</h3>
              </div>
            </div>

            <p className="text-sm leading-7 text-muted-foreground mb-5">{item.description}</p>

            <div className="space-y-2 mb-6">
              {item.points.map((point, pi) => (
                <div key={pi} className="flex items-center gap-3">
                  <div
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: item.accentBg }}
                  >
                    <Check className="h-3 w-3" style={{ color: item.accent }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground/72">{point}</span>
                </div>
              ))}
            </div>

            <motion.div
              className="inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: item.accent }}
              animate={hovered ? { x: 5 } : { x: 0 }}
              transition={{ duration: 0.22 }}
            >
              Explore {item.title}
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </div>
        </div>
      </motion.article>
    </FadeUp>
  );
};

/* -----------------------------------------------------------------
   FEATURE STRIP
----------------------------------------------------------------- */

const FeatureStrip: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
    {FEATURES.map((f, i) => {
      const Icon = f.icon;
      return (
        <FadeUp key={f.title} delay={i * 0.08}>
          <motion.div
            whileHover={{ y: -5, boxShadow: `0 18px 44px ${f.color}20` }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative h-full rounded-[1.5rem] border border-border/35 bg-card/70 p-4 md:p-5 cursor-default"
            style={{ backdropFilter: "blur(14px)", boxShadow: "0 2px 14px rgba(0,0,0,0.045)" }}
          >
            <div
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: f.bg }}
            >
              <Icon className="h-5 w-5" style={{ color: f.color }} />
            </div>
            <h3 className="text-sm font-extrabold text-foreground mb-1.5">{f.title}</h3>
            <p className="text-xs leading-6 text-muted-foreground">{f.text}</p>
          </motion.div>
        </FadeUp>
      );
    })}
  </div>
);

/* -----------------------------------------------------------------
   CTA BANNER
----------------------------------------------------------------- */

const CTABanner: React.FC = () => (
  <FadeUp>
    <motion.div
      className="relative overflow-hidden rounded-[2rem] px-6 py-12 text-center md:px-14 md:py-16"
      style={{
        background: `linear-gradient(140deg, ${DARK_GOLD} 0%, #6B3800 45%, ${GOLD} 100%)`,
        boxShadow: `0 36px 88px rgba(200,130,10,0.32)`,
      }}
    >
      <div
        className="absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-18 pointer-events-none"
        style={{ background: "radial-gradient(circle, #F5A623, transparent)" }}
      />
      <div
        className="absolute -bottom-14 -left-14 h-56 w-56 rounded-full opacity-12 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FFF9EB, transparent)" }}
      />
      <div
        className="absolute inset-0 rounded-[2rem] opacity-[0.038] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />
      <div
        className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
        <div
          className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/12 px-4 py-1.5"
          style={{ backdropFilter: "blur(10px)" }}
        >
          <BadgeCheck className="h-3.5 w-3.5 text-amber-200" />
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-100">
            Made in India · Shipped across India
          </span>
        </div>

        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
          Your privacy deserves<br />a real-world layer.
        </h2>

        <p className="text-base leading-7 max-w-md mx-auto" style={{ color: "rgba(255,239,200,0.80)" }}>
          Join 2,400+ users who can be reached anytime — without ever exposing who they are.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <motion.a
            href="/products"
            className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-amber-800 shadow-xl"
            whileHover={{ scale: 1.04, boxShadow: "0 14px 44px rgba(255,255,255,0.30)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            Get Your Tag
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </motion.a>

          <motion.a
            href="https://app.plzpingme.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/28 bg-white/12 px-7 py-3.5 text-sm font-bold text-white"
            style={{ backdropFilter: "blur(10px)" }}
            whileHover={{ scale: 1.025, borderColor: "rgba(255,255,255,0.48)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            Register a Tag
            <ChevronRight className="h-4 w-4" />
          </motion.a>
        </div>
      </div>
    </motion.div>
  </FadeUp>
);

/* -----------------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------------- */

const LandingHero = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [hasProductSnapshot, setHasProductSnapshot] = useState(false);

  const primaryBtnRef = useRef<HTMLAnchorElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 280, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 280, damping: 28 });

  // Cursor-reactive background glow
  const bgGlowX = useMotionValue(50);
  const bgGlowY = useMotionValue(30);
  const smoothBgX = useSpring(bgGlowX, { stiffness: 50, damping: 20 });
  const smoothBgY = useSpring(bgGlowY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const trackBg = (e: MouseEvent) => {
      bgGlowX.set((e.clientX / window.innerWidth) * 100);
      bgGlowY.set((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("mousemove", trackBg);
    return () => window.removeEventListener("mousemove", trackBg);
  }, [bgGlowX, bgGlowY]);

  useEffect(() => {
    const unsub = subscribeToProducts(
      (latest) => { setProducts(latest); setHasProductSnapshot(true); },
      (err) => { console.error("Hero products error", err); setHasProductSnapshot(true); },
    );
    return unsub;
  }, []);

  const handleMagneticMove = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const rect = primaryBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set((e.clientX - (rect.left + rect.width / 2)) * 0.36);
      mouseY.set((e.clientY - (rect.top + rect.height / 2)) * 0.36);
    },
    [mouseX, mouseY],
  );

  const handleMagneticLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const offerings = getOfferings(products, hasProductSnapshot);

  return (
    <main className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--background)) 60%, hsl(var(--secondary)) 100%)" }}>

      {/* -- Global ambient background -- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Noise layer */}
        <div
          className="absolute inset-0 opacity-[0.024]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
        />

        {/* Cursor-reactive glow */}
        <motion.div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 800,
            height: 560,
            top: useTransform(smoothBgY, v => `calc(${v}% - 280px)`),
            left: useTransform(smoothBgX, v => `calc(${v}% - 400px)`),
            background: "radial-gradient(ellipse, rgba(245,166,35,0.13) 0%, transparent 70%)",
          }}
        />

        {/* Top right accent */}
        <div
          className="absolute top-0 right-0 rounded-full pointer-events-none"
          style={{
            width: 680,
            height: 680,
            background: "radial-gradient(ellipse, rgba(245,166,35,0.07) 0%, transparent 68%)",
            transform: "translate(36%, -24%)",
          }}
        />
        {/* Bottom left warmth */}
        <div
          className="absolute bottom-0 left-0 rounded-full pointer-events-none"
          style={{
            width: 560,
            height: 460,
            background: "radial-gradient(ellipse, rgba(251,191,36,0.07) 0%, transparent 70%)",
            transform: "translate(-28%, 28%)",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(200,130,10,0.11) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            opacity: 0.45,
          }}
        />
      </div>

      {/* ============================================================
          CONTENT  — tighter section spacing throughout
      ============================================================ */}
      <div className="w-full px-4 md:px-6 lg:px-10 xl:px-14 relative pt-0 pb-10 md:pt-0 md:pb-14 space-y-14 lg:space-y-18">

        {/* === HERO =============================================== */}
        <section
          className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-center"
          style={{ minHeight: "70vh" }}
        >
          {/* LEFT: Copy */}
          <div className="space-y-6 lg:py-0 max-w-2xl">

            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2"
                style={{ backdropFilter: "blur(12px)" }}
              >
                <motion.div
                  className="h-2 w-2 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.65, 1], opacity: [1, 0.45, 1] }}
                  transition={{ duration: 2.1, repeat: Infinity }}
                />
                <span className="text-xs font-extrabold uppercase tracking-[0.26em]" style={{ color: GOLD }}>
                  Privacy-first contact ecosystem
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <div>
              <h1
                className="font-extrabold tracking-tight text-foreground leading-[1.02]"
                style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.8rem)" }}
              >
                <div className="overflow-hidden pb-1">
                  <motion.span
                    className="block"
                    initial={{ opacity: 0, y: 34 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.68, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    Reach people.
                  </motion.span>
                </div>
                <div className="overflow-hidden pb-2">
                  <motion.span
                    className="block"
                    initial={{ opacity: 0, y: 34 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.68, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_MID} 48%, ${GOLD_SOFT} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Not your data.
                  </motion.span>
                </div>
              </h1>
            </div>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.62, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-lg text-base leading-8 text-muted-foreground md:text-lg"
            >
              PingME smart tags let anyone scan or tap to reach you instantly — for parking issues, lost items, or
              found pets — without ever seeing your phone number or identity.
            </motion.p>

            {/* CTA group */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, delay: 0.50, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              {/* Primary magnetic CTA */}
              <motion.a
                ref={primaryBtnRef}
                href="/products"
                style={{
                  x: springX,
                  y: springY,
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_MID} 60%, ${GOLD_SOFT} 100%)`,
                  boxShadow: `0 6px 32px rgba(200,130,10,0.42)`,
                }}
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
                className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-7 py-3.5 text-sm font-extrabold text-white select-none"
                whileHover={{ scale: 1.04, boxShadow: `0 12px 44px rgba(200,130,10,0.52)` }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
              >
                <motion.div
                  className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20"
                  whileHover={{ translateX: "220%", transition: { duration: 0.55 } }}
                />
                <span className="relative">Get Your Tag</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
              </motion.a>

              {/* Secondary */}
              <motion.a
                href="https://app.plzpingme.com"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card/80 px-7 py-3.5 text-sm font-bold text-foreground/80 transition-colors duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                style={{ backdropFilter: "blur(12px)" }}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                Register Your Tag
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-200" />
              </motion.a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4"
            >
              <div className="flex -space-x-2.5">
                {socialProofUsers.map((u, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.06, duration: 0.35 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-extrabold text-white"
                    style={{
                      background: u.color,
                      borderColor: "hsl(var(--background))",
                      zIndex: socialProofUsers.length - i,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </motion.div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-xs font-extrabold text-foreground">5.0</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">2,400+</span> tags active across India
                </p>
              </div>
            </motion.div>

            {/* Trust pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.80 }}
              className="flex flex-wrap gap-2"
            >
              {[
                { icon: ShieldCheck, label: "No app needed" },
                { icon: EyeOff, label: "Number hidden" },
                { icon: Nfc, label: "QR + NFC" },
                { icon: Sparkles, label: "Made in India" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    whileHover={{ scale: 1.05, borderColor: "rgba(245,166,35,0.45)" }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-card/80 px-3 py-1.5 cursor-default"
                    style={{ backdropFilter: "blur(10px)" }}
                  >
                    <Icon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-foreground/72">{item.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* RIGHT: ScanStory — hidden on mobile */}
          <motion.div
            initial={{ opacity: 0, x: 44 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.95, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden md:flex items-center justify-center"
            style={{ minHeight: 480 }}
          >
            <ScanStory offerings={offerings} />
          </motion.div>
        </section>

        {/* TrustTicker */}
        <TrustTicker />

        {/* === STATS ============================================== */}
        <section>
          <StatsBar />
        </section>

        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,166,35,0.18), transparent)" }}
        />

        {/* === HOW IT WORKS ======================================= */}
        <HowItWorks />

        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,166,35,0.18), transparent)" }}
        />

        {/* === WHAT WE OFFER ====================================== */}
        <section id="what-we-offer" className="space-y-10">
          <div className="max-w-3xl mx-auto space-y-3 text-center">
            <SectionEyebrow>What We Offer</SectionEyebrow>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.58, delay: 0.08 }}
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Built for the moments where privacy matters most.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-lg leading-8 text-muted-foreground max-w-xl mx-auto"
            >
              Real-world use cases where being reachable doesn't mean being exposed.
            </motion.p>
          </div>

          <div className="mx-auto max-w-5xl space-y-5">
            {offerings.map((item, idx) => (
              <OfferingCard
                key={item.title}
                item={item}
                idx={idx}
                onClick={() => navigate(`/products/${item.categorySlug}`)}
              />
            ))}
          </div>
        </section>

        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,166,35,0.18), transparent)" }}
        />

        {/* === WHY PINGME ========================================= */}
        <section className="space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <SectionEyebrow>Why PingME</SectionEyebrow>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.58 }}
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Meaningful contact.{" "}
              <motion.span
                style={{
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD_MID})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                No exposure required.
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg leading-8 text-muted-foreground max-w-lg mx-auto"
            >
              PingME answers one question: why should being reachable require you to expose who you are?
            </motion.p>
          </div>

          <FeatureStrip />
        </section>

        {/* === CTA BANNER ========================================= */}
        <CTABanner />

        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,166,35,0.18), transparent)" }}
        />

        {/* === REVIEWS ============================================ */}
        <Suspense fallback={null}>
          <LandingReviews />
        </Suspense>

        {/* === OFFICE / CONTACT =================================== */}
        <div className="mx-auto max-w-6xl">
          <div
            className="h-px mb-10"
            style={{ background: "linear-gradient(90deg, transparent, rgba(245,166,35,0.15), transparent)" }}
          />

          <FadeUp>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              {/* Address card */}
              <motion.div
                whileHover={{ y: -4, boxShadow: "0 18px 48px rgba(81,60,9,0.09)" }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="rounded-3xl border border-border/35 bg-card/70 p-5 md:p-7"
                style={{ backdropFilter: "blur(14px)", boxShadow: "0 4px 24px rgba(0,0,0,0.055)" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: "rgba(245,166,35,0.11)" }}
                  >
                    <MapPinned className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.26em] mb-1">
                      Find us
                    </p>
                    <h3 className="font-extrabold text-xl text-foreground mb-2">Our Office</h3>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=745+First+Floor+Rani+Boutique+Kesho+Ram+Complex+Near+By+Ram+Electricals+Sector+45+Burail+Chandigarh+Chandigarh+160047+India"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors block leading-7"
                    >
                      745, First Floor, Rani Boutique,<br />
                      Kesho Ram Complex, Near By Ram Electricals,<br />
                      Sector 45, Burail, Chandigarh - 160047, India
                    </a>
                    <div className="mt-3 flex flex-wrap gap-5 text-sm text-muted-foreground">
                      <a
                        href="tel:+917347340007"
                        className="flex items-center gap-1.5 font-semibold hover:text-primary transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        +91 73473 40007
                      </a>
                      <a href="mailto:contact@pingiff.ai" className="font-semibold hover:text-primary transition-colors">
                        contact@pingiff.ai
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick links */}
              <motion.div
                whileHover={{ y: -4, boxShadow: "0 18px 48px rgba(81,60,9,0.09)" }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="flex flex-col gap-3 rounded-3xl border border-border/35 bg-card/70 p-5 md:p-6 min-w-[200px]"
                style={{ backdropFilter: "blur(14px)", boxShadow: "0 4px 24px rgba(0,0,0,0.055)" }}
              >
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.26em] mb-1">
                  Quick links
                </p>
                {[
                  { href: "/products", label: "Browse Tags", external: false },
                  { href: "/about", label: "About Us", external: false },
                  { href: "https://app.plzpingme.com", label: "Register a Tag", external: true },
                ].map((link) => {
                  const LinkOrA = link.external ? "a" : Link;
                  return (
                    <LinkOrA
                      key={link.label}
                      {...(link.external
                        ? { href: link.href, target: "_blank", rel: "noreferrer" }
                        : { to: link.href })}
                      className="group flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-primary transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                      {link.label}
                    </LinkOrA>
                  );
                })}
              </motion.div>
            </div>
          </FadeUp>
        </div>

        {/* === DOWNLOAD =========================================== */}
        <Suspense fallback={null}>
          <LandingDownloadSection />
        </Suspense>
      </div>
    </main>
  );
};

export default LandingHero;