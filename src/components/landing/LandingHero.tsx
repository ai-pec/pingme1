import { useEffect, useRef, useState, type ChangeEvent } from "react";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  Pause,
  Play,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Volume1,
  Volume2,
  VolumeX,
  Zap,
  Lock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

import carcardFront from "@/assets/product-card.png";
import backpackSticker from "@/assets/pingwebsite-2.webp";
import pingMeLogo from "@/assets/ping-me-logo.png";
import nfcFront from "@/assets/pingprocard_logo.jpeg";
import petSafetyTag from "@/assets/pingprocard.jpeg";
import heroDemoVideoMp4 from "@/assets/IMG_9847.mp4";
import heroDemoVideoWebm from "@/assets/IMG_9847.webm";
import { subscribeToProducts, type DbProduct } from "@/lib/productService";
import { normalizeCategorySlug, buildProductImageUrl } from "@/lib/productCatalog";
import LandingDownloadSection from "./LandingDownloadSection";
import LandingReviews from "../LandingReviews";

const heroImagePath = import.meta.env.VITE_HERO_IMAGE_PATH || "products/hero_i.PNG";
const heroImageUrl = buildProductImageUrl(heroImagePath);

const quickFacts = [
  {
    icon: ShieldCheck,
    title: "Privacy by design",
    description: "Personal information stays protected behind masked communication.",
  },
  {
    icon: ScanLine,
    title: "No app required",
    description: "A simple scan or tap is enough for someone to reach you when it matters.",
  },
  {
    icon: MapPinned,
    title: "Built for real life",
    description: "Made for parking lots, lost items, and unpredictable everyday situations.",
  },
  {
    icon: Sparkles,
    title: "Made in India",
    description: "Designed and developed locally, with a platform built to scale.",
  },
];

const dunsProfileUrl = "https://dunsregistered.dnb.com/DunsRegisteredProfileAnywhere.aspx?Key1=3202565&PaArea=Email";
const dunsLogoUrl = "https://profiles.dunsregistered.com/newimages/logo-dnb-white.svg";

type HeroProduct = {
  categorySlug: string;
  title: string;
  image?: string;
  popular?: boolean;
};

const getBestSellingImage = (products: DbProduct[], categorySlug: string, fallback?: string): string | undefined => {
  const normalizedTarget = normalizeCategorySlug(categorySlug);
  const categoryProducts = products.filter(
    (product): product is DbProduct & HeroProduct =>
      normalizeCategorySlug(product.categorySlug) === normalizedTarget && typeof (product as HeroProduct).image === "string" && Boolean((product as HeroProduct).image)
  );

  if (!categoryProducts.length) {
    return fallback;
  }

  const bestSeller = [...categoryProducts].sort((left, right) => {
    const leftItem = left as HeroProduct;
    const rightItem = right as HeroProduct;

    if (leftItem.popular !== rightItem.popular) {
      return leftItem.popular ? -1 : 1;
    }

    return leftItem.title.localeCompare(rightItem.title);
  })[0];

  return (bestSeller as HeroProduct).image || fallback;
};

const getOfferings = (products: DbProduct[], hasProductSnapshot: boolean) => [
  {
    categorySlug: "car-tags",
    icon: CarFront,
    title: "Vehicle Tags",
    description: "Let others notify you about parking issues, damage, or emergencies without exposing your number.",
    image: getBestSellingImage(products, "car-tags", hasProductSnapshot ? carcardFront : undefined),
    imageFrameClass: "md:h-[210px]",
    accent: "from-amber-400/30 to-yellow-200/10",
    points: ["Car and bike use cases", "Secure masked contact", "Instant parking issue alerts"],
  },
  {
    categorySlug: "backpack-stickers",
    icon: PackageSearch,
    title: "Lost & Found Tags",
    description: "Backpacks, laptops, keychains, and everyday essentials can find their way back faster.",
    image: getBestSellingImage(
      products,
      "backpack-stickers",
      hasProductSnapshot ? buildProductImageUrl("products/backpack-stickers/backpack_sticker2.png") : undefined
    ),
    imageFrameClass: "md:h-[250px]",
    accent: "from-slate-400/30 to-zinc-200/10",
    points: ["For bags, laptops, and accessories", "Easy scan for the finder", "Private return flow"],
  },
  {
    categorySlug: "pet-tags",
    icon: PawPrint,
    title: "Pet Safety Tags",
    description: "Help anyone who finds your pet reach you instantly and safely.",
    image: getBestSellingImage(products, "pet-tags", hasProductSnapshot ? petSafetyTag : undefined),
    imageFrameClass: "md:h-[250px]",
    accent: "from-emerald-400/30 to-teal-200/10",
    points: ["Fast reunion when pets wander", "Visible and durable tag format", "Owner details stay private"],
  },
  {
    categorySlug: "nfc-cards",
    icon: Nfc,
    title: "NFC Smart Cards",
    description: "Tap-enabled cards for quick, seamless, private information exchange.",
    image: getBestSellingImage(products, "nfc-cards", hasProductSnapshot ? nfcFront : undefined),
    imageFrameClass: "md:h-[250px]",
    accent: "from-sky-400/30 to-blue-200/10",
    points: ["Tap to share", "Modern digital contact experience", "Works alongside QR-enabled profiles"],
  },
];

const differentiators = [
  {
    icon: Shield,
    title: "Privacy First",
    text: "Your phone number is never the public entry point.",
    color: "from-amber-400/20 to-yellow-200/5",
    iconBg: "bg-amber-400/20",
    num: "01",
  },
  {
    icon: Zap,
    title: "Effortless Experience",
    text: "No downloads or setup for the person reaching you.",
    color: "from-sky-400/20 to-blue-200/5",
    iconBg: "bg-sky-400/20",
    num: "02",
  },
  {
    icon: Fingerprint,
    title: "Contextual Communication",
    text: "Predefined alerts keep every interaction clear and purposeful.",
    color: "from-violet-400/20 to-purple-200/5",
    iconBg: "bg-violet-400/20",
    num: "03",
  },
  {
    icon: Globe2,
    title: "Built for Scale",
    text: "A platform shaped for everyday use across multiple product lines.",
    color: "from-emerald-400/20 to-teal-200/5",
    iconBg: "bg-emerald-400/20",
    num: "04",
  },
];

const standForItems = [
  {
    icon: Lock,
    text: "Privacy-first contact experiences for real-world use cases.",
  },
  {
    icon: Zap,
    text: "Flexible QR and NFC products that work across vehicle and non-vehicle scenarios.",
  },
  {
    icon: TrendingUp,
    text: "A scalable product system that can expand with partners and new use cases.",
  },
];

/* ── Reusable scroll-reveal wrapper ── */
const FadeUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ── Animated mission bar ── */
const MissionBar: React.FC<{ pct: number; delay: number }> = ({ pct, delay }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className="h-full rounded-full bg-primary"
      initial={{ width: "0%" }}
      animate={inView ? { width: `${pct}%` } : {}}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: delay + 0.2 }}
    />
  );
};

const LandingHero = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [hasProductSnapshot, setHasProductSnapshot] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (latest) => {
        setProducts(latest);
        setHasProductSnapshot(true);
      },
      (error) => {
        console.error("Failed to load products for hero", error);
        setHasProductSnapshot(true);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume / 100;
    video.muted = isMuted || volume === 0;
  }, [isMuted, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          try {
            await video.play();
            setIsPlaying(true);
          } catch {
            setIsPlaying(false);
          }
          return;
        }

        video.pause();
        setIsPlaying(false);
      },
      { threshold: 0.55 }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleVideoToggle = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const handleMuteToggle = () => {
    setIsMuted((currentMuted) => {
      const nextMuted = !currentMuted;
      if (!nextMuted && volume === 0) {
        setVolume(80);
      }
      return nextMuted;
    });
  };

  const offerings = getOfferings(products, hasProductSnapshot);

  return (
    <main className="relative overflow-hidden bg-cream">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-24 right-[-4rem] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-[-5rem] h-80 w-80 rounded-full bg-orange-100/60 blur-3xl" />
      </div>

      <div className="w-full px-4 md:px-6 lg:px-8 relative pt-4 pb-10 md:pt-6 md:pb-14 lg:pt-4 lg:pb-12 space-y-16 lg:space-y-24">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-8">
            <div className="space-y-4 max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brown shadow-sm">
                Privacy-first contact ecosystem
              </p>
              <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Reach people, not their personal data.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg lg:text-xl">
                PingME connects people to vehicles, belongings, and pets through elegantly designed QR and NFC-enabled
                smart tags. It solves the real-world need for contact without exposing your phone number, identity, or
                unnecessary access.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/products">
                <Button size="lg" className="group w-full sm:w-auto">
                  Get Your Tag
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="https://app.plzpingme.com" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full">
                  Register Your Tag
                </Button>
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickFacts.map((fact) => {
                const Icon = fact.icon;

                return (
                  <div
                    key={fact.title}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-[0_10px_30px_rgba(81,60,9,0.06)] backdrop-blur-sm"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{fact.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{fact.description}</p>
                  </div>
                );
              })}
            </div>

            

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {[
                "No apps",
                "Masked communication",
                "QR + NFC enabled",
                "Designed for vehicles, belongings, and pets",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-full bg-background/70 px-4 py-2 shadow-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-start justify-center lg:justify-end">
            <div className="w-full max-w-[820px] overflow-hidden lg:max-w-[1040px]">
              <div className="relative aspect-[6/7] w-full overflow-hidden rounded-3xl border border-white/20 bg-transparent">  
                {heroImageUrl ? (
                  <img
                    src={heroImageUrl}
                    alt="PingME hero"
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-8">
                    <img src={pingMeLogo} alt="PingME" className="max-h-[70%] max-w-[70%] object-contain" />
                  </div>
                )
                }
              </div>
            </div>
          </div>
          
        
        </section>

        
        

        <section id="what-we-offer" className="space-y-8">
          <div
          className="h-0.5 mb-12"
          style={{
          background:
          "linear-gradient(90deg, transparent, hsl(var(--ping-yellow) / 10.5), transparent)",
  }}
/>
          <div className="max-w-3xl justify-self-center space-y-4 text-center">
            <p className="section-eyebrow">What We Offer</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Built for the everyday moments where privacy matters most.
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-lg leading-8 text-muted-foreground">
              PingME is designed around real-world scenarios where instant communication is useful, but direct exposure
              is not. The homepage gives visitors a clear view of how PingME protects privacy while keeping contact fast
              and simple.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:gap-20 lg:grid-cols-2">
            {offerings.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/90 shadow-[0_18px_50px_rgba(81,60,9,0.08)] cursor-pointer transition-all hover:shadow-[0_25px_60px_rgba(81,60,9,0.15)] hover:border-primary/40 hover:scale-[1.02]" onClick={() => navigate(`/products/${item.categorySlug}`)}>
                  <div className={`bg-gradient-to-br ${item.accent} p-5 md:p-6`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 shadow-sm">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">{item.title}</h3>
                          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">{item.description}</p>
                        </div>
                      </div>
                      <Tag className="h-5 w-5 text-foreground/40" />
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 md:grid-cols-[180px_1fr] md:p-6">
                    <div className={`flex h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-white/70 p-3 ${item.imageFrameClass || ""}`}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-muted/30">
                          <Icon className="h-10 w-10 text-foreground/45" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {item.points.map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                          <span className="text-sm leading-6 text-foreground/80">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div
  className="h-0.5 mb-12"
  style={{
    background:
      "linear-gradient(90deg, transparent, hsl(var(--ping-yellow) / 10.5), transparent)",
  }}
/>
          
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          
          {/* ── Why PingME Is Different ── */}
          <FadeUp>
            <motion.div
              whileHover={{ scale: 1.015 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative h-full overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/90 p-6 shadow-[0_18px_50px_rgba(81,60,9,0.08)]"
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
              <p className="section-eyebrow text-left mb-3">Why PingME Is Different</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Meaningful connection,{" "}
                <span className="text-primary">on your terms.</span>
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                PingME was built around a simple question: why should accessibility require exposure? The answer is a
                contact system that keeps communication secure, relevant, and private.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 space-y-4 rounded-2xl bg-primary/10 p-5"
              >
                <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-brown">
                  {/* animated shield pulse */}
                  <span className="relative flex h-8 w-8 items-center justify-center">
                    <motion.span
                      animate={{ scale: [1, 1.55], opacity: [0.4, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full bg-primary/30"
                    />
                    <Shield className="relative h-4 w-4 text-primary" />
                  </span>
                  No friction, no unnecessary access
                </div>
                <p className="text-sm leading-7 text-foreground/80">
                  A user can scan or tap, choose the relevant action, and connect through the secure system without ever
                  seeing personal contact details.
                </p>
              </motion.div>
            </motion.div>
          </FadeUp>

          {/* ── 4 differentiator cards ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            {differentiators.map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeUp key={item.title} delay={0.08 + i * 0.07}>
                  <motion.article
                    whileHover={{ y: -5, boxShadow: "0 20px 44px rgba(81,60,9,0.12)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className={`relative h-full overflow-hidden rounded-[1.5rem] border border-border/60 bg-gradient-to-br ${item.color} bg-background/85 p-5 shadow-sm`}
                  >
                    <span className="absolute right-3 top-2 text-5xl font-black text-foreground/5 select-none leading-none">{item.num}</span>
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg}`}>
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </motion.article>
                </FadeUp>
              );
            })}
          </div>
        </section>

        {/* ── Mission + What We Stand For ── */}
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          {/* Mission */}
          <FadeUp delay={0}>
            <motion.div
              whileHover={{ scale: 1.012 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative h-full overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/90 p-6 shadow-[0_18px_50px_rgba(81,60,9,0.08)] md:p-8"
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
              <p className="section-eyebrow text-left mb-3">Our Mission</p>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl">
                To make everyday interactions{" "}
                <span className="text-primary">safer, simpler,</span> and private.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                We are building PingME to be the layer that helps people communicate when it matters most, without asking
                them to trade away personal privacy in the process.
              </p>

              {/* animated progress bars */}
              <div className="mt-8 space-y-3">
                {[
                  { label: "Privacy protection", pct: 100 },
                  { label: "Ease of use", pct: 95 },
                  { label: "Real-world reliability", pct: 90 },
                ].map((bar, i) => (
                  <div key={bar.label}>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>{bar.label}</span><span>{bar.pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                      <MissionBar pct={bar.pct} delay={i * 0.18} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </FadeUp>

          {/* What We Stand For */}
          <FadeUp delay={0.12}>
            <motion.div
              whileHover={{ scale: 1.012 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative h-full overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/90 p-6 shadow-[0_18px_50px_rgba(81,60,9,0.08)] md:p-8"
            >
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />
              <p className="section-eyebrow text-left mb-3">What We Stand For</p>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl">
                Values that drive{" "}
                <span className="text-primary">every decision.</span>
              </h2>

              <ul className="mt-7 space-y-4">
                {standForItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.14 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-start gap-4 rounded-2xl border border-border/40 bg-muted/30 p-4"
                    >
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm leading-7 text-foreground/80">{item.text}</p>
                    </motion.li>
                  );
                })}
              </ul>

              <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400 }} className="mt-7">
                <Link to="/about" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Learn more about us <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </FadeUp>
        </section>

        <div className="h-0.5 mb-12" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--ping-yellow) / 10.5), transparent)" }} />
        <LandingReviews />

        {/* Find Us block */}
        <div className="mx-auto max-w-6xl mt-6">
          <div className="h-0.5 mb-12" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--ping-yellow) / 10.5), transparent)" }} />
          
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Find us</p>
            <h3 className="font-bold text-2xl mt-2">Our Office</h3>
            <a
              href="https://www.google.com/maps/search/?api=1&query=745+Burail+Ekta+Market+Burail+Village+Sector+45+Chandigarh+160047"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm font-light text-muted-foreground block"
            >
              Ping IFF LLP<br/>
              745, Burail, Ekta Market,<br/>
              Burail Village, Sector 45,<br/>
              Chandigarh – 160047
            </a>
            <div className="mt-3 text-sm font-light text-muted-foreground space-y-1">
              <div>Phone: <a href="tel:+917347340007" className="text-muted-foreground">+91 73473 40007</a></div>
              <div>Email: <a href="mailto:contact@pingiff.ai" className="text-muted-foreground">contact@pingiff.ai</a></div>
            </div>
          </div>
        </div>

        {/* Download Section */}
        <LandingDownloadSection />
      </div>
    </main>
  );
};

export default LandingHero;