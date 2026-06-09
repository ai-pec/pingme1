import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Nfc,
  Zap,
  Share2,
  UserCheck,
  Smartphone,
  Globe,
  BadgeCheck,
  ChevronRight,
  Star,
  QrCode,
  Pencil,
  CreditCard,
  MapPin,
  Link as LinkIcon,
} from "lucide-react";

/* ── helpers ── */
const PRODUCTS_NFC_URL = "https://plzpingme.com/products/nfc-cards";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".localhost"));

function useCountUp(target: number, duration = 1800) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let start = 0;
    const step = target / (duration / 16);
    const tick = () => {
      start = Math.min(start + step, target);
      if (ref.current) ref.current.textContent = Math.floor(start).toLocaleString("en-IN");
      if (start < target) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return ref;
}

const features = [
  {
    icon: Zap,
    title: "Instant Tap-to-Share",
    desc: "One tap on any NFC-enabled phone shares your full business profile — no app required for the receiver.",
  },
  {
    icon: Pencil,
    title: "Edit Anytime",
    desc: "Your card details live in the cloud. Update your links, address, or UPI ID without reprinting the card.",
  },
  {
    icon: Globe,
    title: "Public Profile URL",
    desc: "Every card gets a unique public link — shareable anywhere, works without NFC too.",
  },
  {
    icon: QrCode,
    title: "QR Code Backup",
    desc: "Even if the receiver's NFC is off, the embedded QR code opens your profile instantly.",
  },
  {
    icon: CreditCard,
    title: "UPI & Payment Links",
    desc: "Add your UPI ID or Razorpay link so customers can pay you directly from your NFC profile.",
  },
  {
    icon: MapPin,
    title: "Company Address & Maps",
    desc: "Pin your business location — tapping the address opens Google Maps for instant navigation.",
  },
  {
    icon: Share2,
    title: "Social & Portfolio",
    desc: "Showcase LinkedIn, Instagram, YouTube, your portfolio projects and downloadable documents in one place.",
  },
  {
    icon: UserCheck,
    title: "Save Contact (vCard)",
    desc: "Visitors can save your contact directly to their phone with one tap on the Save Contact button.",
  },
];

const steps = [
  {
    number: "01",
    title: "Order Your NFC Card",
    desc: "Pick your design from our catalog and place an order. Setup takes under 5 minutes.",
  },
  {
    number: "02",
    title: "Set Up Your Profile",
    desc: "Fill in your name, role, contact, social links, payment details and company address during checkout.",
  },
  {
    number: "03",
    title: "Receive & Tap",
    desc: "Card is shipped to your door. Start sharing your profile instantly by tapping any smartphone.",
  },
  {
    number: "04",
    title: "Edit Anytime",
    desc: "Log in to your account and update profile fields — the live link reflects changes immediately.",
  },
];

const useCases = [
  { emoji: "🤝", label: "Networking Events" },
  { emoji: "🏪", label: "Retail & Shops" },
  { emoji: "💼", label: "Sales Professionals" },
  { emoji: "🩺", label: "Doctors & Clinics" },
  { emoji: "🏗️", label: "Real Estate Agents" },
  { emoji: "🎨", label: "Freelancers & Artists" },
  { emoji: "🍽️", label: "Restaurants & Cafés" },
  { emoji: "📦", label: "Logistics & Delivery" },
];

export default function NFCLanding() {
  const navigate = useNavigate();

  const customersRef = useCountUp(1200);
  const cardsRef     = useCountUp(3400);
  const citiesRef    = useCountUp(28);

  const handleBuyNFC = () => {
    if (typeof window !== "undefined" && window.location.hostname.startsWith("nfc.")) {
      // On NFC subdomain — go to main site (or localhost in dev)
      const base = isLocalhost
        ? `http://localhost:${window.location.port || 8080}`
        : "https://plzpingme.com";
      window.location.href = `${base}/products/nfc-cards`;
    } else {
      navigate("/products/nfc-cards");
    }
  };

  return (
    <MainLayout>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-6 pb-20 md:pt-10 md:pb-28">
        {/* decorative blobs */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, hsl(45 100% 75%), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(45 100% 65%), transparent 70%)" }}
        />

        <div className="container relative z-10 flex flex-col items-center text-center gap-6">
          {/* eyebrow */}
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brown">
            <Nfc className="h-3.5 w-3.5" />
            PingME NFC Business Cards
          </span>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl"
              style={{ color: "hsl(var(--ping-dark))" }}>
            Share Everything About Your{" "}
            <span className="highlight-yellow highlight-underline">Business</span>
            {" "}With One Tap
          </h1>

          <p className="max-w-xl text-base text-ash md:text-lg leading-relaxed">
            PingME NFC cards give you a living digital profile — update it anytime, share it everywhere.
            No app required for the person you're sharing with.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button
              size="lg"
              className="h-14 px-8 text-base font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform"
              onClick={handleBuyNFC}
            >
              <Nfc className="mr-2 h-5 w-5" />
              Buy an NFC Card
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-semibold rounded-xl"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              See How It Works
            </Button>
          </div>

          {/* stats */}
          <div className="mt-8 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card/80 backdrop-blur px-2 py-4 shadow-sm">
            {[
              { ref: customersRef, suffix: "+", label: "Happy Customers" },
              { ref: cardsRef,     suffix: "+", label: "Cards Delivered" },
              { ref: citiesRef,    suffix: "+", label: "Cities" },
            ].map(({ ref, suffix, label }) => (
              <div key={label} className="stat-card">
                <p className="text-2xl font-extrabold tracking-tight" style={{ color: "hsl(var(--primary))" }}>
                  <span ref={ref}>0</span>{suffix}
                </p>
                <p className="text-xs font-medium text-ash">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What is an NFC Card ── */}
      <section className="bg-cream py-16 md:py-20">
        <div className="container max-w-4xl">
          <p className="section-eyebrow">What is it?</p>
          <h2 className="section-title">Your Business Card — But Alive</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-bold" style={{ color: "hsl(var(--ping-dark))" }}>Physical Card + Digital Profile</h3>
              <p className="text-sm leading-relaxed text-ash">
                A premium PVC card with an embedded NFC chip. When someone taps it with their phone,
                they instantly see your full digital profile — no app, no friction.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-bold" style={{ color: "hsl(var(--ping-dark))" }}>Always Up to Date</h3>
              <p className="text-sm leading-relaxed text-ash">
                Unlike a paper business card, your NFC card never goes out of date. Changed your number?
                New website? Just update it in your account — the card stays the same.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 md:py-24">
        <div className="container">
          <p className="section-eyebrow">Features</p>
          <h2 className="section-title">Everything on One Tap</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 text-sm font-bold" style={{ color: "hsl(var(--ping-dark))" }}>{title}</h3>
                <p className="text-xs leading-relaxed text-ash">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="bg-cream py-16 md:py-24">
        <div className="container">
          <p className="section-eyebrow">How It Works</p>
          <h2 className="section-title">Up & Running in 4 Simple Steps</h2>
          <div className="relative grid gap-8 md:grid-cols-4">
            {/* connector line (desktop) */}
            <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden h-0.5 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20 md:block" />

            {steps.map(({ number, title, desc }) => (
              <div key={number} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-card text-xl font-extrabold shadow-md"
                     style={{ color: "hsl(var(--primary))" }}>
                  {number}
                </div>
                <h3 className="mb-1.5 text-sm font-bold" style={{ color: "hsl(var(--ping-dark))" }}>{title}</h3>
                <p className="text-xs leading-relaxed text-ash">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="py-16 md:py-20">
        <div className="container">
          <p className="section-eyebrow">Who Is It For?</p>
          <h2 className="section-title">Perfect For Every Professional</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {useCases.map(({ emoji, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5"
                style={{ color: "hsl(var(--ping-dark))" }}
              >
                {emoji} {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / Why PingME ── */}
      <section className="bg-cream py-16 md:py-20">
        <div className="container max-w-3xl text-center">
          <p className="section-eyebrow">Why PingME</p>
          <h2 className="section-title">Built for Indian Businesses</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Made in India", desc: "Designed, printed, and shipped from India with fast domestic delivery." },
              { icon: Star,       title: "Premium Quality", desc: "Thick PVC cards with reliable NFC chips tested for 10,000+ taps." },
              { icon: Zap,        title: "Instant Support", desc: "Dedicated support over WhatsApp — we help you set up your profile." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 text-sm font-bold" style={{ color: "hsl(var(--ping-dark))" }}>{title}</h3>
                <p className="text-xs leading-relaxed text-ash">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 md:py-28">
        <div className="container flex flex-col items-center text-center gap-5">
          <div className="hazard-stripe-thin h-1.5 w-12 rounded-full" />
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ color: "hsl(var(--ping-dark))" }}>
            Ready to Make a Lasting Impression?
          </h2>
          <p className="max-w-md text-sm text-ash md:text-base">
            Order your PingME NFC card today. Set up your profile in minutes and start sharing
            everything about your business with a single tap.
          </p>
          <Button
            size="lg"
            className="mt-2 h-14 px-10 text-base font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform"
            onClick={handleBuyNFC}
          >
            <Nfc className="mr-2 h-5 w-5" />
            Buy an NFC Card
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="text-xs text-ash">
            Free profile setup · Delivered to your doorstep · Edit anytime
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
