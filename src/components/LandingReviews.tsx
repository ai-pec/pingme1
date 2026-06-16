/**
 * LandingReviews.tsx
 * Mobile-first, fully responsive reviews section for PingME.
 *
 * Design:
 * - Dual-track infinite marquee (opposite directions) on desktop
 * - Single swipeable card slider on mobile (touch drag + pagination dots)
 * - RAF-based animation, pauses on hover/touch — no jitter
 * - Respects prefers-reduced-motion
 * - Zero horizontal overflow on any viewport
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

/* ----------------------------------------------------------------
   DESIGN TOKENS (matches LandingHero)
---------------------------------------------------------------- */
const GOLD     = "#C8820A";
const GOLD_MID = "#F5A623";
const CREAM    = "#FFF9EB";
const CREAM_2  = "#FFF3D6";

/* ----------------------------------------------------------------
   REVIEW DATA
---------------------------------------------------------------- */
type Review = {
  id: number;
  name: string;
  location: string;
  avatar: string;
  stars: number;
  tag: string;
  text: string;
  useCase: string;
};

const REVIEWS: Review[] = [
  {
    id: 1,
    name: "Rajesh Verma",
    location: "Delhi",
    avatar: "RV",
    stars: 5,
    tag: "Vehicle Tag",
    text: "Bhai, parking wala scene toh ab stress-free ho gaya. Koi bhi scan karta hai aur directly ping aa jaati hai — bina number share kiye! Ekdum mast product hai.",
    useCase: "Car blocked in apartment parking",
  },
  {
    id: 2,
    name: "Priya Sharma",
    location: "Bengaluru",
    avatar: "PS",
    stars: 5,
    tag: "Lost & Found",
    text: "My laptop bag was left in an Ola cab. The driver scanned the PingME sticker and I got a ping within minutes. Number never shared, reunited same day. Absolutely love it!",
    useCase: "Lost bag in rideshare",
  },
  {
    id: 3,
    name: "Suresh Iyer",
    location: "Chennai",
    avatar: "SI",
    stars: 5,
    tag: "Pet Tag",
    text: "Bruno bhaag gaya tha colony se. Kisi ne PingME tag scan kiya aur mujhe turant message aaya. 2 ghante mein Bruno ghar wapas! Privacy bhi rahi, tension bhi khatam.",
    useCase: "Lost Labrador found by neighbour",
  },
  {
    id: 4,
    name: "Anika Mehta",
    location: "Mumbai",
    avatar: "AM",
    stars: 5,
    tag: "NFC Card",
    text: "Conference mein business cards distribute karna band kar diya. Ab ek tap mein sab share ho jaata hai. Clients impress, aur mera number bhi safe — win-win!",
    useCase: "Startup networking event",
  },
  {
    id: 5,
    name: "Karan Bhatia",
    location: "Gurugram",
    avatar: "KB",
    stars: 5,
    tag: "Vehicle Tag",
    text: "Office parking mein roz drama hota tha. PingME tag lagayi bike pe — ab koi directly ping karta hai. Smooth hai ekdum. No awkward confrontations.",
    useCase: "Bike blocked in office lot",
  },
  {
    id: 6,
    name: "Deepa Nair",
    location: "Kochi",
    avatar: "DN",
    stars: 5,
    tag: "Lost & Found",
    text: "My daughter's school bag was left at a park. Another parent scanned the tag and I got an instant ping. So relieved — and they never had to know my number. Brilliant!",
    useCase: "Child's bag found at park",
  },
  {
    id: 7,
    name: "Arjun Singhania",
    location: "Pune",
    avatar: "AS",
    stars: 5,
    tag: "Vehicle Tag",
    text: "Society mein 3 cars thi aur meri car beech mein block ho gayi. Scan kiya unhone, 4 min mein resolve. Itna smooth never expected. PingME rocks!",
    useCase: "Triple-parked car situation",
  },
  {
    id: 8,
    name: "Neha Kulkarni",
    location: "Hyderabad",
    avatar: "NK",
    stars: 5,
    tag: "Pet Tag",
    text: "Mittoo (meri cat) kabhi kabhi bahar nikal jaati thi. Ab tag pe ping aata hai, main jaan jaati hoon kahan hai. Peace of mind mil gayi — genuinely.",
    useCase: "Indoor cat wandered outside",
  },
  {
    id: 9,
    name: "Vikram Rathi",
    location: "Jaipur",
    avatar: "VR",
    stars: 5,
    tag: "NFC Card",
    text: "Freelancer hoon — client meetings mein pehle hesitate karta tha number dene mein. Ab NFC card hai, safe bhi aur professional bhi. Game changer for me.",
    useCase: "Freelancer client meetings",
  },
  {
    id: 10,
    name: "Smitha Reddy",
    location: "Vizag",
    avatar: "SR",
    stars: 5,
    tag: "Vehicle Tag",
    text: "Hospital parking mein emergency thi aur meri car block thi. PingME se instant ping aayi aur unka car 2 minutes mein hat gaya. Critical situation mein worked perfectly!",
    useCase: "Hospital emergency parking",
  },
];

/* ----------------------------------------------------------------
   STAR RATING
---------------------------------------------------------------- */
const StarRow: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
    ))}
  </div>
);

/* ----------------------------------------------------------------
   REVIEW CARD
---------------------------------------------------------------- */
const ReviewCard: React.FC<{ review: Review; style?: React.CSSProperties }> = ({
  review,
  style,
}) => (
  <div
    className="relative flex-shrink-0 w-[280px] sm:w-[300px] rounded-3xl bg-white/90 p-5 flex flex-col gap-3"
    style={{
      boxShadow: "0 4px 28px rgba(81,60,9,0.09), 0 1px 4px rgba(0,0,0,0.04)",
      border: "1px solid rgba(245,166,35,0.13)",
      backdropFilter: "blur(12px)",
      ...style,
    }}
  >
    {/* Quote icon */}
    <div
      className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-xl opacity-25"
      style={{ background: "rgba(245,166,35,0.12)" }}
    >
      <Quote className="h-3.5 w-3.5 text-amber-600" />
    </div>

    {/* Header */}
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-black text-white"
        style={{
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_MID} 100%)`,
          boxShadow: `0 4px 12px rgba(200,130,10,0.28)`,
        }}
      >
        {review.avatar}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-foreground leading-tight truncate">{review.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{review.location}</p>
      </div>
    </div>

    {/* Stars + tag */}
    <div className="flex items-center justify-between">
      <StarRow count={review.stars} />
      <span
        className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
        style={{
          background: "rgba(245,166,35,0.10)",
          color: GOLD,
          border: "1px solid rgba(200,130,10,0.18)",
        }}
      >
        {review.tag}
      </span>
    </div>

    {/* Review text */}
    <p
      className="text-xs leading-6 text-muted-foreground"
      style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
    >
      {review.text}
    </p>

    {/* Use-case badge */}
    <div
      className="mt-auto rounded-2xl px-3 py-2 text-[10px] font-semibold text-muted-foreground"
      style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}
    >
      📍 {review.useCase}
    </div>
  </div>
);

/* ----------------------------------------------------------------
   MARQUEE TRACK (desktop)
   Uses RAF for buttery smooth, jitter-free animation.
---------------------------------------------------------------- */
type MarqueeTrackProps = {
  reviews: Review[];
  direction?: "left" | "right";
  speed?: number; /** px/sec */
};

const MarqueeTrack: React.FC<MarqueeTrackProps> = ({
  reviews,
  direction = "left",
  speed = 38,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const xRef    = useRef(0);
  const rafRef  = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const pausedRef = useRef(false);

  // Tripled so seamless loop is always possible regardless of card width
  const items = [...reviews, ...reviews, ...reviews];

  const animate = useCallback((ts: number) => {
    if (!trackRef.current) return;
    const dt = lastRef.current ? Math.min(ts - lastRef.current, 40) : 0;
    lastRef.current = ts;

    if (!pausedRef.current && !prefersReducedMotion) {
      const sign = direction === "left" ? -1 : 1;
      xRef.current += sign * speed * (dt / 1000);

      // Reset when one full set has scrolled through
      const singleWidth = trackRef.current.scrollWidth / 3;
      if (direction === "left" && xRef.current <= -singleWidth) {
        xRef.current += singleWidth;
      } else if (direction === "right" && xRef.current >= 0) {
        xRef.current -= singleWidth;
      }

      trackRef.current.style.transform = `translateX(${xRef.current}px)`;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [direction, speed, prefersReducedMotion]);

  useEffect(() => {
    // Seed rightward track offset so it starts mid-way
    if (direction === "right" && trackRef.current) {
      const singleWidth = trackRef.current.scrollWidth / 3;
      xRef.current = -singleWidth / 2;
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate, direction]);

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={() => { pausedRef.current = true; }}
      onTouchEnd={() => { pausedRef.current = false; }}
    >
      <div ref={trackRef} className="flex gap-4 will-change-transform">
        {items.map((r, i) => (
          <ReviewCard key={`${r.id}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   MOBILE SWIPE SLIDER
   Touch drag + pagination dots + arrow buttons
---------------------------------------------------------------- */
const MobileSlider: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const total = reviews.length;

  const goTo = (idx: number) => setActiveIdx((idx + total) % total);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStart === null) return;
    const delta = e.changedTouches[0].clientX - dragStart;
    if (Math.abs(delta) > 40) goTo(delta < 0 ? activeIdx + 1 : activeIdx - 1);
    setDragStart(null);
  };

  return (
    <div className="relative w-full">
      {/* Cards */}
      <div
        className="relative w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, x: 48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -48, scale: 0.96 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="px-4"
          >
            {/* Full-width card on mobile */}
            <div
              className="relative rounded-3xl bg-white/90 p-5 flex flex-col gap-3 w-full"
              style={{
                boxShadow: "0 4px 28px rgba(81,60,9,0.09), 0 1px 4px rgba(0,0,0,0.04)",
                border: "1px solid rgba(245,166,35,0.13)",
              }}
            >
              {/* Quote */}
              <div
                className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-xl opacity-25"
                style={{ background: "rgba(245,166,35,0.12)" }}
              >
                <Quote className="h-3.5 w-3.5 text-amber-600" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_MID} 100%)`,
                    boxShadow: `0 4px 12px rgba(200,130,10,0.28)`,
                  }}
                >
                  {reviews[activeIdx].avatar}
                </div>
                <div>
                  <p className="text-base font-extrabold text-foreground leading-tight">
                    {reviews[activeIdx].name}
                  </p>
                  <p className="text-xs text-muted-foreground">{reviews[activeIdx].location}</p>
                </div>
              </div>

              {/* Stars + tag */}
              <div className="flex items-center justify-between">
                <StarRow count={reviews[activeIdx].stars} />
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
                  style={{
                    background: "rgba(245,166,35,0.10)",
                    color: GOLD,
                    border: "1px solid rgba(200,130,10,0.18)",
                  }}
                >
                  {reviews[activeIdx].tag}
                </span>
              </div>

              {/* Text — full on mobile (no clamp) */}
              <p className="text-sm leading-7 text-muted-foreground">{reviews[activeIdx].text}</p>

              {/* Use case */}
              <div
                className="rounded-2xl px-3 py-2 text-[11px] font-semibold text-muted-foreground"
                style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}
              >
                📍 {reviews[activeIdx].useCase}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow buttons */}
      <div className="flex items-center justify-between px-4 mt-5">
        <button
          onClick={() => goTo(activeIdx - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/40 bg-white/80 shadow-sm active:scale-95 transition-transform"
          aria-label="Previous review"
        >
          <ChevronLeft className="h-4 w-4 text-amber-600" />
        </button>

        {/* Pagination dots */}
        <div className="flex items-center gap-1.5">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to review ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIdx ? 20 : 6,
                height: 6,
                background: i === activeIdx ? GOLD : "rgba(200,130,10,0.25)",
              }}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(activeIdx + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/40 bg-white/80 shadow-sm active:scale-95 transition-transform"
          aria-label="Next review"
        >
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </button>
      </div>

      {/* Counter */}
      <p className="text-center mt-3 text-xs font-bold text-muted-foreground">
        {activeIdx + 1} / {total}
      </p>
    </div>
  );
};

/* ----------------------------------------------------------------
   SUMMARY ROW — aggregate rating + pill stats
---------------------------------------------------------------- */
const SummaryRow: React.FC = () => (
  <div
    className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-3xl px-6 py-5 sm:px-8 mx-auto max-w-2xl"
    style={{
      background: "rgba(255,255,255,0.72)",
      border: "1px solid rgba(245,166,35,0.14)",
      boxShadow: "0 4px 24px rgba(81,60,9,0.07)",
      backdropFilter: "blur(14px)",
    }}
  >
    {/* Big rating */}
    <div className="flex flex-col items-center sm:items-start sm:border-r sm:border-amber-200/40 sm:pr-6">
      <span
        className="text-5xl font-black leading-none"
        style={{
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_MID} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        5.0
      </span>
      <StarRow count={5} />
      <p className="text-[11px] font-semibold text-muted-foreground mt-1">Average rating</p>
    </div>

    {/* Pills */}
    <div className="flex flex-wrap justify-center sm:justify-start gap-2 flex-1">
      {[
        { label: "Privacy loved", emoji: "🔒" },
        { label: "Zero-app scan", emoji: "📲" },
        { label: "Fast response", emoji: "⚡" },
        { label: "Made in India", emoji: "🇮🇳" },
        { label: "10+ cities", emoji: "📍" },
        { label: "100% recommended", emoji: "✅" },
      ].map((p) => (
        <span
          key={p.label}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
          style={{
            background: "rgba(245,166,35,0.09)",
            color: "rgba(120,75,10,0.85)",
            border: "1px solid rgba(200,130,10,0.14)",
          }}
        >
          <span>{p.emoji}</span>
          {p.label}
        </span>
      ))}
    </div>
  </div>
);

/* ----------------------------------------------------------------
   SECTION EYEBROW (local, matches LandingHero)
---------------------------------------------------------------- */
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="flex items-center justify-center gap-2.5"
  >
    <div
      className="h-px w-8"
      style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }}
    />
    <span className="text-xs font-bold uppercase tracking-[0.26em]" style={{ color: GOLD }}>
      {children}
    </span>
    <div
      className="h-px w-8"
      style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }}
    />
  </motion.div>
);

/* ----------------------------------------------------------------
   MAIN EXPORT
---------------------------------------------------------------- */
const LandingReviews: React.FC = () => {
  // Split into two tracks for desktop marquee
  const half  = Math.ceil(REVIEWS.length / 2);
  const row1  = REVIEWS.slice(0, half);
  const row2  = REVIEWS.slice(half);

  return (
    <section className="space-y-8 overflow-hidden">

      {/* Header */}
      <div className="max-w-2xl mx-auto text-center space-y-3 px-4">
        <Eyebrow>Real Reviews</Eyebrow>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.58, delay: 0.06 }}
          className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
        >
          Loved across India.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="text-base leading-7 text-muted-foreground"
        >
          From parking headaches to lost pets — real stories from real people.
        </motion.p>
      </div>

      {/* Summary row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="px-4"
      >
        <SummaryRow />
      </motion.div>

      {/* ── MOBILE: swipeable slider ── */}
      <div className="block md:hidden">
        <MobileSlider reviews={REVIEWS} />
      </div>

      {/* ── TABLET / DESKTOP: dual marquee tracks ── */}
      {/*
          Left/right fade masks via CSS gradient overlay.
          Each row scrolls in opposite directions.
      */}
      <div
        className="hidden md:flex flex-col gap-4"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <MarqueeTrack reviews={row1} direction="left"  speed={36} />
        <MarqueeTrack reviews={row2} direction="right" speed={30} />
      </div>

      {/* Bottom trust note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-center text-xs font-semibold text-muted-foreground px-4"
      >
        All reviews from verified PingME tag owners · Updated regularly
      </motion.p>
    </section>
  );
};

export default LandingReviews;