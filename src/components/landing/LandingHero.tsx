import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";

import carcardFront from "@/assets/product-card.png";
import backpackSticker from "@/assets/pingwebsite-2.webp";
import nfcFront from "@/assets/pingprocard_logo.jpeg";
import petSafetyTag from "@/assets/pingprocard.jpeg";
import heroDemoVideoMp4 from "@/assets/IMG_9847.mp4";
import heroDemoVideoWebm from "@/assets/IMG_9847.webm";
import { subscribeToProducts, type DbProduct } from "@/lib/productService";
import { normalizeCategorySlug } from "@/lib/productCatalog";

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

type HeroProduct = {
  categorySlug: string;
  title: string;
  image?: string;
  popular?: boolean;
};

const getBestSellingImage = (products: DbProduct[], categorySlug: string, fallback?: string): string | undefined => {
  const categoryProducts = products.filter(
    (product): product is DbProduct & HeroProduct =>
      normalizeCategorySlug(product.categorySlug) === categorySlug && typeof (product as HeroProduct).image === "string" && Boolean((product as HeroProduct).image)
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
    image: getBestSellingImage(products, "backpack-stickers", hasProductSnapshot ? backpackSticker : undefined),
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
  },
  {
    icon: Zap,
    title: "Effortless Experience",
    text: "No downloads or setup for the person reaching you.",
  },
  {
    icon: Fingerprint,
    title: "Contextual Communication",
    text: "Predefined alerts keep every interaction clear and purposeful.",
  },
  {
    icon: Globe2,
    title: "Built for Scale",
    text: "A platform shaped for everyday use across multiple product lines.",
  },
];

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

      <div className="container relative py-10 md:py-14 lg:py-12 space-y-16 lg:space-y-24">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/products">
                <Button size="lg" className="group w-full sm:w-auto">
                  Explore Products
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="#what-we-offer" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full">
                  See What PingME Does
                </Button>
              </a>
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

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-white/20 to-transparent blur-2xl" />
            <div className="relative rounded-[2rem] border border-border/60 bg-background/85 p-4 shadow-[0_30px_90px_rgba(81,60,9,0.16)] backdrop-blur-md md:p-6">
              <div className="overflow-hidden rounded-3xl border border-border/50 bg-black shadow-sm">

                <div className="relative aspect-[9/16] w-full bg-black sm:aspect-[4/5] lg:aspect-[3/4]">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-contain"
                    playsInline
                    loop
                    muted
                    preload="metadata"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  >
                    <source src={heroDemoVideoMp4} type="video/mp4" />
                    <source src={heroDemoVideoWebm} type="video/webm" />
                    Your browser does not support this video format.
                  </video>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white">
                    <div className="flex items-end gap-3">
                      <button
                        type="button"
                        onClick={handleVideoToggle}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-colors hover:bg-white/25"
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                      </button>

                      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-white/10 px-3 py-2 backdrop-blur-md">
                        <button
                          type="button"
                          onClick={handleMuteToggle}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                          aria-label={isMuted || volume === 0 ? "Unmute video" : "Mute video"}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-4 w-4" />
                          ) : volume < 50 ? (
                            <Volume1 className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={volume}
                          onChange={handleVolumeChange}
                          aria-label="Video volume"
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white"
                        />

                        <span className="w-10 text-right text-xs font-medium tabular-nums text-white/80">
                          {volume}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              
            </div>
          </div>
        </section>

        <section id="what-we-offer" className="space-y-8">
          <div className="max-w-3xl">
            <p className="section-eyebrow text-left">What We Offer</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Built for the everyday moments where privacy matters most.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              PingME is designed around real-world scenarios where instant communication is useful, but direct exposure
              is not. The homepage now explains the full system in one place so the value is clear from the first visit.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
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
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[1.75rem] border border-border/60 bg-background/90 p-6 shadow-[0_18px_50px_rgba(81,60,9,0.08)]">
            <p className="section-eyebrow text-left">Why PingME Is Different</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Meaningful connection, on your terms.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              PingME was built around a simple question: why should accessibility require exposure? The answer is a
              contact system that keeps communication secure, relevant, and private.
            </p>

            <div className="mt-6 space-y-4 rounded-3xl bg-primary/10 p-5">
              <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-brown">
                <Shield className="h-4 w-4" />
                No friction, no unnecessary access
              </div>
              <p className="text-sm leading-7 text-foreground/80">
                A user can scan or tap, choose the relevant action, and connect through the secure system without ever
                seeing personal contact details.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {differentiators.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-[1.5rem] border border-border/60 bg-background/85 p-5 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="rounded-[1.75rem] border border-border/60 bg-background/90 p-6 shadow-[0_18px_50px_rgba(81,60,9,0.08)] md:p-8">
            <p className="section-eyebrow text-left">Our Mission</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">To make everyday interactions safer, simpler, and private.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              We are building PingME to be the layer that helps people communicate when it matters most, without asking
              them to trade away personal privacy in the process.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-background/90 p-6 shadow-[0_18px_50px_rgba(81,60,9,0.08)] md:p-8">
            <p className="section-eyebrow text-left">What We Stand For</p>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>Privacy-first contact experiences for real-world use cases.</li>
              <li>Flexible QR and NFC products that work across vehicle and non-vehicle scenarios.</li>
              <li>A scalable product system that can expand with partners and new use cases.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LandingHero;
