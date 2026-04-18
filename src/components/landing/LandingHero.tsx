import { Link } from "react-router-dom";
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
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";

import carcardFront from "@/assets/products/product-card.png";
import backpackSticker from "@/assets/products/backpack_sticker.png";
import nfcFront from "@/assets/products/nfc_frontcard.png";
import petSafetyTag from "@/assets/products/Pet Tags.jpeg";

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

const offerings = [
  {
    icon: CarFront,
    title: "Vehicle Tags",
    description: "Let others notify you about parking issues, damage, or emergencies without exposing your number.",
    image: carcardFront,
    accent: "from-amber-400/30 to-yellow-200/10",
    points: ["Car and bike use cases", "Secure masked contact", "Instant parking issue alerts"],
  },
  {
    icon: PackageSearch,
    title: "Lost & Found Tags",
    description: "Backpacks, laptops, keychains, and everyday essentials can find their way back faster.",
    image: backpackSticker,
    accent: "from-slate-400/30 to-zinc-200/10",
    points: ["For bags, laptops, and accessories", "Easy scan for the finder", "Private return flow"],
  },
  {
    icon: PawPrint,
    title: "Pet Safety Tags",
    description: "Help anyone who finds your pet reach you instantly and safely.",
    image: petSafetyTag,
    accent: "from-emerald-400/30 to-teal-200/10",
    points: ["Fast reunion when pets wander", "Visible and durable tag format", "Owner details stay private"],
  },
  {
    icon: Nfc,
    title: "NFC Smart Cards",
    description: "Tap-enabled cards for quick, seamless, private information exchange.",
    image: nfcFront,
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
  return (
    <main className="relative overflow-hidden bg-cream">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-24 right-[-4rem] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-[-5rem] h-80 w-80 rounded-full bg-orange-100/60 blur-3xl" />
      </div>

      <div className="container relative py-10 md:py-14 lg:py-20 space-y-16 lg:space-y-24">
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
            <div className="relative grid gap-4 rounded-[2rem] border border-border/60 bg-background/85 p-4 shadow-[0_30px_90px_rgba(81,60,9,0.16)] backdrop-blur-md md:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-brown">
                    <span>Vehicle Tags</span>
                    <CarFront className="h-4 w-4" />
                  </div>
                  <div className="flex h-52 w-full items-center justify-center rounded-2xl bg-white p-2">
                    <img src={carcardFront} alt="PingME car tag" className="h-100 w-100 rounded-xl object-contain" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Reach the owner about parking, damage, or emergencies without exposing private details.
                  </p>
                </article>

                <article className="overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-brown">
                    <span>Lost & Found</span>
                    <PackageSearch className="h-4 w-4" />
                  </div>
                  <img src={backpackSticker} alt="PingME lost and found tag" className="h-44 w-full rounded-2xl object-cover" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Keep bags, laptops, and everyday items connected to a secure return path.
                  </p>
                </article>

                <article className="overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-brown">
                    <span>Pet Safety</span>
                    <PawPrint className="h-4 w-4" />
                  </div>
                  <div className="flex h-52 w-full items-center justify-center rounded-2xl bg-white p-2">
                    <img src={petSafetyTag} alt="PingME pet safety tag" className="h-full w-full rounded-xl object-contain" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Faster reunions for pets through a simple scan that keeps owner details private.
                  </p>
                </article>

                <article className="overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-brown">
                    <span>NFC Smart Cards</span>
                    <Nfc className="h-4 w-4" />
                  </div>
                  <img src={nfcFront} alt="PingME NFC smart card" className="h-44 w-full rounded-2xl object-cover" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Tap-enabled cards for modern, seamless, and private information sharing.
                  </p>
                </article>
              </div>

              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-foreground">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>One system, multiple use cases:</span>
                  <span className="rounded-full bg-background px-3 py-1">vehicles</span>
                  <span className="rounded-full bg-background px-3 py-1">belongings</span>
                  <span className="rounded-full bg-background px-3 py-1">pets</span>
                  <span className="rounded-full bg-background px-3 py-1">NFC cards</span>
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
                <article key={item.title} className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/90 shadow-[0_18px_50px_rgba(81,60,9,0.08)]">
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
                    <img src={item.image} alt={item.title} className="h-210 w-210 rounded-2xl object-cover" />
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
              PingME exists to help people stay reachable for the moments that matter, without turning a contact point
              into a privacy risk. That includes vehicles, lost belongings, and pets, along with modern NFC contact
              sharing.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                "Parking issues",
                "Lost items",
                "Found pets",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm font-medium text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-gradient-to-br from-primary/15 via-white to-amber-50 p-6 shadow-[0_18px_50px_rgba(81,60,9,0.08)] md:p-8">
            <p className="section-eyebrow text-left">Our Vision</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">A world where help reaches you without friction.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Lost things return faster, personal information stays protected, and connected objects work as a simple,
              trustworthy layer between strangers and owners.
            </p>

            <div className="mt-6 rounded-3xl bg-background/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-brown">
                <Sparkles className="h-4 w-4" />
                Designed in India, built for scale
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground/80">
                PingME is proudly designed and developed in India, shaped by real user feedback and built to grow across
                everyday use cases and future categories.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/products">
                <Button className="group">
                  Browse the catalog
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/prebook?product=pingme-car-card">
                <Button variant="outline">Pre-book a car tag</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LandingHero;
