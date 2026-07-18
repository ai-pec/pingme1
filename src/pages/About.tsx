import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import MainLayout from "@/layouts/MainLayout";
import {
  Users, Target, Shield, Heart, MapPin, Phone, Mail,
  ArrowRight, Zap, Lock, Globe, Star, ChevronDown, Play, Pause,
  CheckCircle, TrendingUp, Award, Sparkles,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMELINE = [
  { year: "2024", title: "First Tag Ships", description: "PingME v1 launched in Chandigarh. Our first 100 customers gave us feedback that shaped everything that came after.", icon: "🚀" },
  { year: "2025", title: "Expanding the Ecosystem", description: "Lost & Found and Pet Safety tags join the product family. NFC smart cards bring tap-to-contact to everyday life.", icon: "🌱" },
  { year: "2026", title: "Privacy at Scale", description: "Thousands of vehicles, belongings, and pets protected. We're just getting started.", icon: "🔒" },
];

const VALUES = [
  { icon: Target, label: "Our Mission", description: "To make every person reachable — through their vehicle, belongings, or pet — without ever compromising their privacy.", color: "#FF6B35" },
  { icon: Shield, label: "Privacy First", description: "Your phone number is never shared. All calls are masked and you control exactly who can reach you.", color: "#4ECDC4" },
  { icon: Users, label: "Community Driven", description: "Built with feedback from thousands of customers across 3+ cities in India — and growing every day.", color: "#A78BFA" },
  { icon: Heart, label: "Made in India", description: "Proudly designed and manufactured in India, built for everyday Indian life and beyond.", color: "#F59E0B" },
];

const PRODUCTS = [
  { emoji: "🚗", label: "Vehicle Tags", tag: "Most Popular", description: "Durable QR/NFC tags for your car mirror or dashboard. When someone needs to reach you — wrong parking, damage alert, emergency — they scan the tag and you get an instant notification. Private, secure, and no app required for them.", href: "/products/car-tags", accent: "#FF6B35" },
  { emoji: "🎒", label: "Lost & Found Tags", tag: null, description: "Weatherproof stickers for bags, laptops, keys, electronics, and valuables. If someone finds your item, they scan the QR code or tap the NFC chip to contact you immediately. Your personal details stay hidden — they reach you through PingME's secure platform.", href: "/products/keychain-tags", accent: "#4ECDC4" },
  { emoji: "🐾", label: "Pet Safety Tags", tag: null, description: "Lightweight, pet-friendly tags for collars and harnesses. If your pet gets lost, anyone who finds them can instantly contact you through our secure channel. No engraving needed, no phone number exposed — just pure recovery power when it matters most.", href: "/products/pet-tags", accent: "#A78BFA" },
  { emoji: "📲", label: "Smart Keychain Tags", tag: "Dual Tech", description: "Compact tags combining QR code + NFC technology. Attach to keys, bags, or wallets. Finders can either scan or tap to reach you. Durable, water-resistant, and backed by a 2-year guarantee. Your lost keychain just became your security backup.", href: "/products/nfc-cards", accent: "#F59E0B" },
];

const TESTIMONIALS = [
  { name: "Rahul S.", city: "Chandigarh", text: "Someone hit my car in a mall parking lot and used the PingME tag to reach me instantly. Got it sorted without any drama. 10/10!", rating: 5, emoji: "🚗" },
  { name: "Priya M.", city: "Mohali", text: "My dog ran out and a neighbour found him. They scanned the tag and I got a call within minutes. This product is a lifesaver!", rating: 5, emoji: "🐾" },
  { name: "Arun K.", city: "Panchkula", text: "Lost my bag at the airport. The finder scanned my tag and called me — all without ever seeing my number. Incredible.", rating: 5, emoji: "🎒" },
  { name: "Sneha R.", city: "Delhi", text: "The NFC card is so sleek. I tap it to share my contact at events. No more fumbling for my phone. Privacy intact.", rating: 5, emoji: "📲" },
];

const FAQ_ITEMS = [
  { q: "Does the finder see my phone number?", a: "Never. PingME routes all communication through a masked channel. Your real number is never revealed to anyone who scans your tag — whether it's a vehicle tag, lost item tag, pet tag, or smart keychain tag." },
  { q: "Can I use Lost & Found Tags on any item?", a: "Yes! Attach them to bags, laptops, cameras, bicycles, sports equipment, electronics, or any valuable you want to protect. They're weatherproof and designed to last for years." },
  { q: "How do Pet Tags work differently from regular ID tags?", a: "Unlike engraved tags, Pet Tags use QR codes and NFC technology. Finders scan or tap to contact you instantly through PingME — your pet's identity and location stay private until you choose to share." },
  { q: "What are Smart Keychain Tags and why do I need one?", a: "Smart Keychain Tags combine QR codes and NFC chips in one compact device. Attach to keys or bags — if lost, finders can scan OR tap their phone to reach you. Water-resistant, durable, backed by a 2-year guarantee." },
  { q: "Do finders need an app or special technology?", a: "No. Any smartphone camera can scan QR codes. For NFC tapping, most modern phones (iPhone 11+, Android 4.1+) have built-in readers. The finder doesn't install anything — they just reach you securely through our platform." },
  { q: "Can I track my lost item in real-time?", a: "Tags don't provide GPS tracking, but when someone finds your item and scans the tag, you get their location and message through PingME, helping you coordinate recovery." },
  { q: "What happens if my tag gets damaged?", a: "You can instantly deactivate it through the app and link a replacement. Your information is always linked to your account, regardless of how many physical tags you use." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const animateNumber = (from: number, to: number, duration: number, onUpdate: (v: number) => void) => {
  const start = performance.now();
  const frame = (now: number) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 4);
    onUpdate(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
};

const useMouseParallax = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e: MouseEvent) => setPos({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 });
    window.addEventListener("mousemove", h, { passive: true });
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return pos;
};

// ─── Particle canvas ──────────────────────────────────────────────────────────
const ParticleField = ({ mouse }: { mouse: { x: number; y: number } }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef(mouse);
  useEffect(() => { mouseRef.current = mouse; }, [mouse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 48 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = (mouseRef.current.x * 0.5 + 0.5) * canvas.width;
      const my = (mouseRef.current.y * 0.5 + 0.5) * canvas.height;

      pts.forEach(p => {
        // Gentle mouse repulsion
        const dx = p.x - mx; const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) { p.vx += (dx / dist) * 0.04; p.vy += (dy / dist) * 0.04; }
        p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,120,30,${p.opacity})`; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x; const dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110) { ctx.beginPath(); ctx.strokeStyle = `rgba(180,120,30,${0.09 * (1 - d / 110)})`; ctx.lineWidth = 0.6; ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.65 }} />;
};

// ─── Magnetic button ──────────────────────────────────────────────────────────
const MagneticBtn = ({ href, children, className, style }: { href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setOff({ x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3 });
  };
  return (
    <a ref={ref} href={href} className={className} style={{ ...style, transform: `translate(${off.x}px,${off.y}px)`, transition: "transform 0.18s ease", display: "inline-flex", alignItems: "center", gap: 8 }}
      onMouseMove={onMove} onMouseLeave={() => setOff({ x: 0, y: 0 })}>
      {children}
    </a>
  );
};

// ─── Typewriter ───────────────────────────────────────────────────────────────
const Typewriter = ({ words }: { words: string[] }) => {
  const [idx, setIdx] = useState(0); const [ci, setCi] = useState(0); const [del, setDel] = useState(false); const [text, setText] = useState("");
  useEffect(() => {
    const w = words[idx];
    const t = setTimeout(() => {
      if (!del) { setText(w.slice(0, ci + 1)); if (ci + 1 === w.length) setTimeout(() => setDel(true), 1900); else setCi(c => c + 1); }
      else { setText(w.slice(0, ci - 1)); if (ci - 1 === 0) { setDel(false); setIdx(i => (i + 1) % words.length); setCi(0); } else setCi(c => c - 1); }
    }, del ? 50 : 80);
    return () => clearTimeout(t);
  }, [idx, ci, del, words]);
  return (
    <span style={{ color: "hsl(var(--primary))" }}>
      {text}<span style={{ display: "inline-block", width: 2, height: "1em", background: "hsl(var(--primary))", marginLeft: 2, verticalAlign: "middle", animation: "blink 0.9s step-end infinite" }} />
    </span>
  );
};

// ─── Scroll progress ──────────────────────────────────────────────────────────
const ScrollBar = () => {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const h = () => { const max = document.documentElement.scrollHeight - window.innerHeight; setPct(max > 0 ? (window.scrollY / max) * 100 : 0); };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${pct}%`, background: "linear-gradient(90deg, hsl(var(--primary)), #f59e0b, hsl(var(--primary)))", backgroundSize: "200% 100%", animation: "shimmerBar 2s linear infinite", zIndex: 9999, borderRadius: "0 2px 2px 0", transition: "width 0.08s ease" }} />;
};

// ─── Floating pill ────────────────────────────────────────────────────────────
const Pill = ({ icon: Icon, text, style }: { icon: React.ElementType; text: string; style?: React.CSSProperties }) => (
  <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", backdropFilter: "blur(10px)", color: "hsl(var(--muted-foreground))", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none", animation: "floatIn 0.8s ease both", ...style }}>
    <Icon style={{ width: 12, height: 12, color: "hsl(var(--primary))" }} />{text}
  </div>
);

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ value, suffix = "+", label, delay = 0, inView }: { value: number | string; suffix?: string; label: string; delay?: number; inView: boolean }) => {
  const [d, setD] = useState(0);
  const isNum = typeof value === "number";
  useEffect(() => { if (!inView || !isNum) return; const t = setTimeout(() => animateNumber(0, value as number, 1500, setD), delay); return () => clearTimeout(t); }, [inView, value, delay, isNum]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: inView ? 1 : 0, transform: inView ? "translateY(0) scale(1)" : "translateY(24px) scale(0.92)", transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      <span style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 900, color: "#FFF8E3", lineHeight: 1, letterSpacing: "-0.02em" }}>{isNum ? d : value}{suffix}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,248,227,0.55)", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
};

// ─── Value card ───────────────────────────────────────────────────────────────
const ValueCard = ({ icon: Icon, label, description, color, index, inView }: (typeof VALUES)[0] & { index: number; inView: boolean }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "hsl(var(--card))", border: `1.5px solid ${hov ? color + "55" : "hsl(var(--border))"}`, borderRadius: 20, padding: 24, cursor: "default", opacity: inView ? 1 : 0, transform: inView ? (hov ? "translateY(-5px)" : "translateY(0)") : "translateY(28px)", transition: `opacity 0.5s ease ${index * 120 + 100}ms, transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease`, boxShadow: hov ? `0 16px 48px ${color}22` : "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 52, height: 52, background: color + "18", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: hov ? "scale(1.15) rotate(6deg)" : "scale(1)", transition: "transform 0.3s ease", border: `1.5px solid ${color}30` }}>
        <Icon style={{ width: 22, height: 22, color }} />
      </div>
      <div>
        <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 6, color: "hsl(var(--foreground))" }}>{label}</h3>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, lineHeight: 1.65 }}>{description}</p>
      </div>
    </div>
  );
};

// ─── Product card ─────────────────────────────────────────────────────────────
const ProductCard = ({ emoji, label, tag, description, href, accent, index, inView }: (typeof PRODUCTS)[0] & { index: number; inView: boolean }) => {
  const [hov, setHov] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setRipple({ x: e.clientX - r.left, y: e.clientY - r.top, key: Date.now() });
  };
  return (
    <a href={href} onClick={handleClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: "relative", display: "flex", flexDirection: "column", borderRadius: 20, border: `1.5px solid ${hov ? accent + "55" : "hsl(var(--border))"}`, background: "hsl(var(--card))", padding: 24, textDecoration: "none", overflow: "hidden", cursor: "pointer", opacity: inView ? 1 : 0, transform: inView ? (hov ? "translateY(-9px) scale(1.02)" : "translateY(0) scale(1)") : "translateY(32px) scale(0.96)", transition: `opacity 0.5s ease ${index * 90 + 100}ms, transform 0.35s ease, box-shadow 0.35s ease, border-color 0.3s ease`, boxShadow: hov ? `0 24px 56px ${accent}28, 0 4px 16px rgba(0,0,0,0.06)` : "0 2px 10px rgba(0,0,0,0.05)" }}>
      {tag && <span style={{ position: "absolute", top: 16, right: 16, fontSize: 9, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", background: accent + "18", color: accent, padding: "3px 9px", borderRadius: 999, border: `1px solid ${accent}30` }}>{tag}</span>}
      <div style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, background: accent + "18", border: `1.5px solid ${accent}33`, fontSize: 24, transform: hov ? "scale(1.18) rotate(-5deg)" : "scale(1)", transition: "transform 0.3s ease" }}>{emoji}</div>
      <h3 style={{ fontWeight: 800, fontSize: 16, color: "hsl(var(--foreground))", marginBottom: 8 }}>{label}</h3>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, lineHeight: 1.65, flex: 1 }}>{description}</p>
      <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: accent, opacity: hov ? 1 : 0, transform: hov ? "translateX(0)" : "translateX(-10px)", transition: "opacity 0.25s, transform 0.25s" }}>
        Learn more <ArrowRight style={{ width: 12, height: 12 }} />
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},transparent)`, borderRadius: "0 0 18px 18px", opacity: hov ? 1 : 0, transition: "opacity 0.3s" }} />
      {ripple && (
        <span key={ripple.key} style={{ position: "absolute", left: ripple.x, top: ripple.y, width: 200, height: 200, borderRadius: "50%", background: accent + "22", transform: "translate(-50%,-50%) scale(0)", animation: "rippleOut 0.6s ease-out forwards", pointerEvents: "none" }} />
      )}
    </a>
  );
};

// ─── Timeline ─────────────────────────────────────────────────────────────────
const TimelineItem = ({ year, title, description, icon, index, inView, isLast }: (typeof TIMELINE)[0] & { index: number; inView: boolean; isLast: boolean }) => {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: "flex", gap: 20, position: "relative", opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(-32px)", transition: `opacity 0.55s ease ${index * 140}ms, transform 0.55s ease ${index * 140}ms` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{ width: 36, height: 36, borderRadius: "50%", background: hov ? "hsl(var(--primary))" : "hsl(var(--primary)/0.15)", border: "2.5px solid hsl(var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.3s, transform 0.3s", transform: hov ? "scale(1.2)" : "scale(1)", boxShadow: hov ? "0 0 0 6px hsl(var(--primary)/0.15)" : "none", fontSize: 16, cursor: "default" }}>{icon}</div>
        {!isLast && <div style={{ flex: 1, width: 2, marginTop: 6, background: "linear-gradient(to bottom, hsl(var(--primary)/0.5), hsl(var(--primary)/0.05))" }} />}
      </div>
      <div style={{ paddingBottom: 36, paddingTop: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "hsl(var(--primary))" }}>{year}</span>
        <h4 style={{ fontWeight: 800, fontSize: 16, margin: "4px 0 6px", color: "hsl(var(--foreground))" }}>{title}</h4>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, lineHeight: 1.65, maxWidth: 280 }}>{description}</p>
      </div>
    </div>
  );
};

// ─── Testimonial card ─────────────────────────────────────────────────────────
const TestiCard = ({ name, city, text, rating, emoji, index, inView }: (typeof TESTIMONIALS)[0] & { index: number; inView: boolean }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "hsl(var(--card))", borderRadius: 20, padding: 24, border: "1.5px solid hsl(var(--border))", display: "flex", flexDirection: "column", gap: 12, cursor: "default", opacity: inView ? 1 : 0, transform: inView ? (hov ? "translateY(-6px)" : "translateY(0)") : "translateY(28px)", transition: `opacity 0.55s ease ${index * 100 + 100}ms, transform 0.35s ease, box-shadow 0.3s ease`, boxShadow: hov ? "0 20px 50px rgba(0,0,0,0.15)" : "0 2px 10px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "hsl(var(--primary)/0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "1.5px solid hsl(var(--primary)/0.2)" }}>{emoji}</div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 14, color: "hsl(var(--foreground))" }}>{name}</p>
          <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{city}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 2 }}>{Array.from({ length: rating }).map((_, i) => <Star key={i} style={{ width: 14, height: 14, fill: "#F59E0B", color: "#F59E0B" }} />)}</div>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>"{text}"</p>
    </div>
  );
};

// ─── FAQ accordion item ───────────────────────────────────────────────────────
const FAQItem = ({ q, a, index, inView }: { q: string; a: string; index: number; inView: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "hsl(var(--card))", borderRadius: 16, border: `1.5px solid ${open ? "hsl(var(--primary)/0.4)" : "hsl(var(--border))"}`, overflow: "hidden", transition: "border-color 0.3s", opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition2: `opacity 0.5s ease ${index * 80 + 100}ms, transform 0.5s ease ${index * 80 + 100}ms` } as React.CSSProperties}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "hsl(var(--foreground))", flex: 1 }}>{q}</span>
        <ChevronDown style={{ width: 18, height: 18, color: "hsl(var(--primary))", flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease" }} />
      </button>
      <div style={{ maxHeight: open ? 200 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)" }}>
        <p style={{ padding: "0 22px 18px", color: "hsl(var(--muted-foreground))", fontSize: 14, lineHeight: 1.7 }}>{a}</p>
      </div>
    </div>
  );
};

// ─── Live ping ticker ─────────────────────────────────────────────────────────
const PingTicker = () => {
  const EVENTS = ["🚗 Vehicle pinged in Sector 22", "🐾 Pet found near IT Park", "🎒 Bag recovered at Bus Stand", "📲 NFC card tapped at Elante Mall", "🚗 Parking alert triggered in Phase 7", "🐾 Dog tag scanned in Mohali", "🎒 Luggage ping at Chandigarh Airport"];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => { setVisible(false); setTimeout(() => { setIdx(i => (i + 1) % EVENTS.length); setVisible(true); }, 400); }, 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "hsl(var(--card))", border: "1.5px solid hsl(var(--primary)/0.25)", borderRadius: 999, padding: "8px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", marginBottom: 24 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "dotPulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--muted-foreground))", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.35s, transform 0.35s", whiteSpace: "nowrap" }}>{EVENTS[idx]}</span>
    </div>
  );
};

// ─── Tilt card wrapper ────────────────────────────────────────────────────────
const TiltCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width; const ny = (e.clientY - r.top) / r.height;
    setTilt({ rx: (ny - 0.5) * -18, ry: (nx - 0.5) * 18, gx: nx * 100, gy: ny * 100 });
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })}
      style={{ ...style, transform: `perspective(700px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transition: "transform 0.18s ease", transformStyle: "preserve-3d", position: "relative" }}>
      {/* Gloss overlay */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.18) 0%, transparent 60%)`, pointerEvents: "none", zIndex: 2 }} />
      {children}
    </div>
  );
};

// ─── Testimonials auto-slider ─────────────────────────────────────────────────
const TestimonialsSection = ({ inView }: { inView: boolean }) => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 3500);
    return () => clearInterval(t);
  }, [paused]);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {TESTIMONIALS.map((t, i) => (
          <div key={t.name} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
            style={{ outline: active === i ? "2px solid hsl(var(--primary))" : "none", outlineOffset: 2, borderRadius: 22, transition: "outline 0.3s" }}>
            <TestiCard {...t} index={i} inView={inView} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        {TESTIMONIALS.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? 24 : 8, height: 8, borderRadius: 999, background: i === active ? "hsl(var(--primary))" : "hsl(var(--primary)/0.25)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.35s ease" }} />
        ))}
        <button onClick={() => setPaused(p => !p)} style={{ width: 28, height: 28, borderRadius: "50%", background: "hsl(var(--primary)/0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
          {paused ? <Play style={{ width: 10, height: 10, color: "hsl(var(--primary))" }} /> : <Pause style={{ width: 10, height: 10, color: "hsl(var(--primary))" }} />}
        </button>
      </div>
    </div>
  );
};

// ─── Eyebrow ──────────────────────────────────────────────────────────────────
const Eyebrow = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "hsl(var(--primary))", marginBottom: 12, ...style }}>
    <span style={{ display: "block", width: 20, height: 2, background: "hsl(var(--primary))", borderRadius: 2 }} />
    {children}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const About = () => {
  const mouse = useMouseParallax();

  const heroV = useInView(0.1);
  const storyV = useInView(0.15);
  const productsV = useInView(0.08);
  const valuesV = useInView(0.1);
  const timelineV = useInView(0.1);
  const testiV = useInView(0.1);
  const faqV = useInView(0.1);
  const officeV = useInView(0.2);
  const ctaV = useInView(0.2);

  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=745+First+Floor+Rani+Boutique+Kesho+Ram+Complex+Near+By+Ram+Electricals+Sector+45+Burail+Chandigarh+Chandigarh+160047+India";

  return (
    <MainLayout>
      <ScrollBar />
      <style>{`
        @keyframes blink        { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes shimmerBar   { 0%{background-position:0% 0%} 100%{background-position:200% 0%} }
        @keyframes slideUp      { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatTag     { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-14px) rotate(1deg)} }
        @keyframes scan         { 0%{top:8%;opacity:0} 6%{opacity:1} 94%{opacity:1} 100%{top:88%;opacity:0} }
        @keyframes pingRing     { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(3.2);opacity:0} }
        @keyframes signalDash   { 0%,100%{opacity:.15;transform:scaleX(.4)} 50%{opacity:1;transform:scaleX(1)} }
        @keyframes gradShift    { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes revealW      { from{width:0} to{width:100%} }
        @keyframes shimmerTxt   { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes floatIn      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotPulse     { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.7);opacity:.5} }
        @keyframes glowPulse    { 0%,100%{box-shadow:0 0 0 0 hsl(var(--primary)/.2)} 50%{box-shadow:0 0 0 10px hsl(var(--primary)/0)} }
        @keyframes rippleOut    { to{transform:translate(-50%,-50%) scale(3);opacity:0} }
        @keyframes marquee      { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes countUp      { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes orbFloat1    { 0%,100%{transform:translate(0,0)} 33%{transform:translate(30px,-20px)} 66%{transform:translate(-20px,30px)} }
        @keyframes orbFloat2    { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-25px,15px)} 66%{transform:translate(20px,-25px)} }

        .hero-a{animation:slideUp .7s cubic-bezier(.22,1,.36,1) .05s both}
        .hero-b{animation:slideUp .7s cubic-bezier(.22,1,.36,1) .18s both}
        .hero-c{animation:slideUp .7s cubic-bezier(.22,1,.36,1) .32s both}
        .hero-d{animation:slideUp .7s cubic-bezier(.22,1,.36,1) .46s both}
        .tag-float{animation:floatTag 5s ease-in-out infinite}
        .scan-line{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,hsl(var(--primary)),transparent);box-shadow:0 0 8px 2px hsl(var(--primary)/.4);animation:scan 2.8s ease-in-out infinite}
        .ping-ring{animation:pingRing 2.4s cubic-bezier(0,0,.2,1) infinite}
        .sig-dash{animation:signalDash 1.4s ease-in-out infinite}

        .g-text{background:linear-gradient(135deg,hsl(var(--primary)),#c07000,hsl(var(--primary)));background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmerTxt 4s linear infinite}

        .about-root{background:hsl(var(--background));min-height:100vh;color:hsl(var(--foreground))}

        .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:hsl(var(--primary));margin-bottom:12px}

        .hero-bg{position:relative;overflow:hidden;border-radius:28px;background:linear-gradient(135deg,hsl(var(--card)) 0%,hsl(var(--muted)) 50%,hsl(var(--card)) 100%);background-size:200% 200%;animation:gradShift 9s ease infinite;padding:52px 44px;margin-bottom:72px}
        .hero-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 70% 50%,hsl(var(--primary)/.08) 0%,transparent 65%);pointer-events:none}

        .pm-sec{margin-bottom:72px}
        @media(max-width:768px){.pm-sec{margin-bottom:48px}.hero-bg{padding:32px 20px}}

        .btn-pri{background:hsl(var(--primary));color:hsl(var(--primary-foreground));padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;text-decoration:none;transition:opacity .2s,box-shadow .2s;box-shadow:0 4px 20px hsl(var(--primary)/.4);display:inline-flex;align-items:center;gap:8px}
        .btn-pri:hover{opacity:.9;box-shadow:0 8px 36px hsl(var(--primary)/.5)}
        .btn-sec{background:transparent;color:hsl(var(--primary));padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;text-decoration:none;transition:background .2s,box-shadow .2s;border:2px solid hsl(var(--primary));display:inline-flex;align-items:center;gap:8px}
        .btn-sec:hover{background:hsl(var(--primary)/.08);box-shadow:0 4px 20px hsl(var(--primary)/.15)}

        .story-block{background:hsl(var(--card));border-radius:20px;border-left:4px solid hsl(var(--primary));padding:28px 28px 28px 32px;box-shadow:0 4px 24px rgba(0,0,0,.05)}

        .stats-bg{background:linear-gradient(135deg,hsl(var(--ping-brown)) 0%,hsl(30 75% 18%) 100%);border-radius:28px;padding:52px 36px;position:relative;overflow:hidden}
        .stats-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,hsl(var(--primary)/.35) 0%,transparent 60%);pointer-events:none}

        .cta-bg{background:hsl(var(--card));border-radius:28px;padding:72px 44px;text-align:center;position:relative;overflow:hidden;border:1.5px solid hsl(var(--border))}
        .cta-bg::before{content:'';position:absolute;top:-70px;right:-70px;width:240px;height:240px;border-radius:50%;background:hsl(var(--primary)/.12);filter:blur(40px)}
        .cta-bg::after{content:'';position:absolute;bottom:-70px;left:-70px;width:200px;height:200px;border-radius:50%;background:hsl(var(--primary)/.08);filter:blur(35px)}

        .office-card{background:hsl(var(--card));border-radius:24px;padding:34px;box-shadow:0 4px 24px rgba(0,0,0,.06);border:1.5px solid hsl(var(--border))}
        .c-row{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;transition:transform .2s}
        .c-row:hover{transform:translateX(5px)}
        .c-icon{width:38px;height:38px;background:hsl(var(--primary)/.1);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

        .page-title{position:relative;display:inline-block;font-size:clamp(38px,5.5vw,56px);font-weight:900;letter-spacing:-.03em;padding:4px 0}
        .page-title-bar{position:absolute;bottom:-4px;left:0;height:4px;width:100%;background:linear-gradient(90deg,hsl(var(--primary)),hsl(var(--primary)/.3));border-radius:2px;animation:revealW .9s cubic-bezier(.22,1,.36,1) .4s both}

        .ping-diag{position:relative;border-radius:20px;border:1.5px solid hsl(var(--border));background:hsl(var(--muted));padding:28px;overflow:hidden}

        .faq-item{background:hsl(var(--card));border-radius:16px;border:1.5px solid hsl(var(--border));overflow:hidden;transition:border-color .3s}
        .faq-item:hover{border-color:hsl(var(--primary)/.35)}
        .faq-btn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 22px;background:none;border:none;cursor:pointer;text-align:left;gap:12px}

        .trust-badge{display:inline-flex;align-items:center;gap:8px;background:hsl(var(--card));border:1.5px solid hsl(var(--border));border-radius:999px;padding:8px 16px;font-size:12px;font-weight:600;color:hsl(var(--muted-foreground));box-shadow:0 2px 10px rgba(0,0,0,.05)}

        @media(max-width:640px){
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .hero-ctas{flex-direction:column;align-items:flex-start}
        }
      `}</style>

      <div className="about-root py-8 md:py-16">
        <div className="container">

          {/* PAGE TITLE */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h2 className="page-title"><span className="g-text">About Us</span><div className="page-title-bar" /></h2>
          </div>

          {/* HERO ─────────────────────────────────────────────────────────── */}
          <section ref={heroV.ref} className="pm-sec">
            <div className="hero-bg">
              <ParticleField mouse={mouse} />
              {/* Decorative orbs */}
              <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "hsl(var(--primary)/.06)", filter: "blur(50px)", pointerEvents: "none", animation: "orbFloat1 12s ease-in-out infinite" }} />
              <div style={{ position: "absolute", bottom: -40, left: "30%", width: 200, height: 200, borderRadius: "50%", background: "hsl(var(--primary)/.05)", filter: "blur(40px)", pointerEvents: "none", animation: "orbFloat2 15s ease-in-out infinite" }} />

              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16" style={{ position: "relative", zIndex: 1 }}>
                {/* Left */}
                <div style={{ flex: 1, maxWidth: 560 }}>
                  {/* Live ticker */}
                  <div className="hero-a"><PingTicker /></div>

                  <div className="hero-a eyebrow">Privacy-first connectivity</div>
                  <h1 className="hero-b" style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 900, lineHeight: 1.16, marginBottom: 18, letterSpacing: "-0.02em", color: "hsl(var(--foreground))" }}>
                    Reach people,{" "}
                    <Typewriter words={["not their data.", "always safely.", "without fear.", "on your terms."]} />
                    <br />
                    <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "clamp(16px,2vw,20px)", fontWeight: 600 }}>For every moment that matters.</span>
                  </h1>

                  <p className="hero-c" style={{ color: "hsl(var(--muted-foreground))", fontSize: 16, lineHeight: 1.75, marginBottom: 28, maxWidth: 420 }}>
                    PingME protects your privacy across vehicles, belongings, and pets — one scan or tap is all it takes to reach you, without ever exposing your number.
                  </p>

                  <div className="hero-d hero-ctas" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <MagneticBtn href="/products" className="btn-pri">Get Your Tag <ArrowRight style={{ width: 16, height: 16 }} /></MagneticBtn>
                    <MagneticBtn href="#how-it-works" className="btn-sec">How It Works <ChevronDown style={{ width: 16, height: 16 }} /></MagneticBtn>
                  </div>

                  {/* Trust badges */}
                  <div className="hero-d" style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                    {[{ icon: CheckCircle, text: "No app needed" }, { icon: Award, text: "Made in India" }, { icon: TrendingUp, text: "4.0★ rated" }].map(b => (
                      <div key={b.text} className="trust-badge"><b.icon style={{ width: 13, height: 13, color: "hsl(var(--primary))" }} />{b.text}</div>
                    ))}
                  </div>
                </div>

                {/* Right: 3-D tilt QR card */}
                <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative", padding: "44px 44px", transform: `translate(${mouse.x * -8}px, ${mouse.y * -5}px)`, transition: "transform 0.5s ease-out" }}>
                  <TiltCard style={{ width: 200 }}>
                    <div className="tag-float" style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))", borderRadius: 28, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, boxShadow: "0 28px 64px rgba(0,0,0,0.13), 0 6px 18px rgba(0,0,0,0.06)" }}>
                      {/* QR */}
                      <div style={{ position: "relative", width: 112, height: 112, borderRadius: 12, overflow: "hidden", background: "hsl(var(--card))", padding: 10, border: "1.5px solid hsl(var(--border))" }}>
                        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
                          <rect x="5" y="5" width="28" height="28" rx="3" fill="#111" /><rect x="9" y="9" width="20" height="20" rx="2" fill="white" /><rect x="12" y="12" width="14" height="14" rx="1" fill="#111" />
                          <rect x="67" y="5" width="28" height="28" rx="3" fill="#111" /><rect x="71" y="9" width="20" height="20" rx="2" fill="white" /><rect x="74" y="12" width="14" height="14" rx="1" fill="#111" />
                          <rect x="5" y="67" width="28" height="28" rx="3" fill="#111" /><rect x="9" y="71" width="20" height="20" rx="2" fill="white" /><rect x="12" y="74" width="14" height="14" rx="1" fill="#111" />
                          {[[40, 40], [46, 40], [58, 40], [46, 46], [52, 46], [40, 52], [52, 52], [58, 52], [46, 58], [52, 58]].map(([x, y], i) => <rect key={i} x={x} y={y} width="4" height="4" rx="1" fill="#111" />)}
                          {[[52, 40], [40, 46], [58, 46], [46, 52], [40, 58], [58, 58]].map(([x, y], i) => <rect key={i} x={x} y={y} width="4" height="4" rx="1" fill="white" />)}
                          <rect x="67" y="67" width="28" height="28" rx="3" fill="hsl(var(--primary)/.12)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                          <text x="81" y="85" textAnchor="middle" fontSize="11" fill="hsl(var(--primary))" fontWeight="bold">PM</text>
                        </svg>
                        <div className="scan-line" />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontWeight: 800, fontSize: 14, color: "hsl(var(--foreground))" }}>PingME Tag</p>
                        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginTop: 2 }}>Scan to ping safely</p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[1, 0.55, 0.25].map((o, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: `hsl(var(--primary)/${o})`, animation: `dotPulse 1.6s ease-in-out ${i * 0.3}s infinite` }} />)}
                      </div>
                    </div>
                  </TiltCard>
                  <Pill icon={Zap} text="Instant Alert" style={{ top: -18, left: -30, animationDelay: "0.2s" }} />
                  <Pill icon={Lock} text="Number Hidden" style={{ top: -18, right: -22, animationDelay: "0.4s" }} />
                  <Pill icon={Globe} text="Works Anywhere" style={{ bottom: -16, right: -18, animationDelay: "0.6s" }} />
                  <Pill icon={Sparkles} text="Privacy First" style={{ bottom: -16, left: -28, animationDelay: "0.8s" }} />
                </div>
              </div>
            </div>
          </section>

          {/* MARQUEE TRUST STRIP ─────────────────────────────────────────── */}
          <div style={{ overflow: "hidden", marginBottom: 72, borderTop: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))", padding: "14px 0", background: "hsl(var(--card))" }}>
            <div style={{ display: "flex", gap: 0, animation: "marquee 22s linear infinite", width: "max-content" }}>
              {[...Array(2)].map((_, gi) => (
                <div key={gi} style={{ display: "flex", gap: 48, alignItems: "center", paddingRight: 48 }}>
                  {["🔒 Privacy Protected", "📱 No App Needed", "🇮🇳 Made in India", "⚡ Instant Alerts", "🚗 Vehicle Safety", "🐾 Pet Safety", "🎒 Bag Recovery", "✨ Masked Calls"].map(t => (
                    <span key={t} style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>{t}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* STORY ──────────────────────────────────────────────────────── */}
          <section ref={storyV.ref} className="pm-sec" style={{ maxWidth: 900 }}>
            <Eyebrow style={{ opacity: storyV.inView ? 1 : 0, transition: "opacity .5s" }}>Why We Built This</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 28, color: "hsl(var(--foreground))", opacity: storyV.inView ? 1 : 0, transform: storyV.inView ? "none" : "translateY(18px)", transition: "opacity .55s ease .08s, transform .55s ease .08s" }}>
              You shouldn't have to choose between  <span className="g-text">privacy and connection.</span>
            </h2>
            <div style={{ opacity: storyV.inView ? 1 : 0, transform: storyV.inView ? "none" : "translateY(16px)", transition: "opacity .6s ease .18s, transform .6s ease .18s" }}>
              <div className="story-block">
                <div className="grid md:grid-cols-2 gap-6">
                  <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 16, lineHeight: 1.78 }}>It started with a blocked car and a stranger who needed to reach the owner — but had no safe way to do it. We realised the same problem plays out everywhere: a lost bag, a wandering pet, a delivery gone wrong.</p>
                  <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 16, lineHeight: 1.78 }}>PingME fixes that with advanced designed QR and NFC smart tags for vehicles, belongings, and pets. One scan connects the finder to you through a privacy-protected channel — masked calls, predefined alerts, no app needed. Your number stays yours. Always.</p>
                </div>
              </div>
            </div>
          </section>

          {/* PRODUCTS ───────────────────────────────────────────────────── */}
          <section ref={productsV.ref} className="pm-sec" id="how-it-works" style={{ borderTop: "1.5px solid hsl(var(--border))", paddingTop: 52 }}>
            <Eyebrow style={{ opacity: productsV.inView ? 1 : 0, transition: "opacity .5s" }}>What We Make</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 8, color: "hsl(var(--foreground))", opacity: productsV.inView ? 1 : 0, transform: productsV.inView ? "none" : "translateY(16px)", transition: "opacity .55s ease .08s, transform .55s ease .08s" }}>
              One platform. <span className="g-text">Every situation.</span>
            </h2>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 16, marginBottom: 36, maxWidth: 440, opacity: productsV.inView ? 1 : 0, transform: productsV.inView ? "none" : "translateY(16px)", transition: "opacity .6s ease .16s, transform .6s ease .16s" }}>
              Privacy-first contact for every moment life throws at you — vehicles, belongings, pets, and daily carry items.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PRODUCTS.map((p, i) => <ProductCard key={p.label} {...p} index={i} inView={productsV.inView} />)}
            </div>

            {/* Product Details Grid */}
            <div style={{ marginTop: 52, paddingTop: 36, borderTop: "1.5px solid hsl(var(--border))" }}>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Lost & Found Details */}
                <div style={{ opacity: productsV.inView ? 1 : 0, transform: productsV.inView ? "none" : "translateY(20px)", transition: "opacity .55s ease .1s, transform .55s ease .1s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 28 }}>🎒</span>
                    <h3 style={{ fontWeight: 800, fontSize: 18, color: "hsl(var(--foreground))" }}>Lost & Found Stickers</h3>
                  </div>
                  <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, lineHeight: 1.75, marginBottom: 12 }}>
                    Attach weatherproof stickers to any valuable: laptops, cameras, bicycles, musical instruments, sports equipment, or luggage. If lost, the finder simply scans the QR code or taps the NFC chip to contact you securely. No personal info exposed — just connection.
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {["✓ Works on any item", "✓ Waterproof & UV-resistant", "✓ 2-3 year lifespan", "✓ Custom recovery messages"].map(t => (
                      <li key={t} style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "hsl(var(--primary))" }}>{t.split(" ")[0]}</span> {t.slice(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pet Tags Details */}
                <div style={{ opacity: productsV.inView ? 1 : 0, transform: productsV.inView ? "none" : "translateY(20px)", transition: "opacity .55s ease .14s, transform .55s ease .14s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 28 }}>🐾</span>
                    <h3 style={{ fontWeight: 800, fontSize: 18, color: "hsl(var(--foreground))" }}>Pet Safety Tags</h3>
                  </div>
                  <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, lineHeight: 1.75, marginBottom: 12 }}>
                    Lightweight, pet-friendly tags for collars, harnesses, or microchip housings. If your dog, cat, or pet goes missing, anyone who finds them can instantly contact you through our secure platform. Unlike engraved tags, your details stay private.
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {["✓ Safe for all pets", "✓ Comfortable daily wear", "✓ Instant alert system", "✓ Secondary contacts support"].map(t => (
                      <li key={t} style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "hsl(var(--primary))" }}>{t.split(" ")[0]}</span> {t.slice(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Smart Keychain Tags Details */}
                <div style={{ opacity: productsV.inView ? 1 : 0, transform: productsV.inView ? "none" : "translateY(20px)", transition: "opacity .55s ease .18s, transform .55s ease .18s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 28 }}>🔑</span>
                    <h3 style={{ fontWeight: 800, fontSize: 18, color: "hsl(var(--foreground))" }}>Smart Keychain Tags</h3>
                  </div>
                  <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, lineHeight: 1.75, marginBottom: 12 }}>
                    Compact dual-technology tags combining QR codes and NFC in one device. Attach to keys, bags, or wallets. Finders can scan OR tap their phone — both ways lead to secure contact. Water-resistant, durable, and built to last 2+ years.
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {["✓ QR + NFC dual tech", "✓ Water-resistant (IP67)", "✓ Military-grade durability", "✓ Multi-item tracking per account"].map(t => (
                      <li key={t} style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "hsl(var(--primary))" }}>{t.split(" ")[0]}</span> {t.slice(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Comparison Highlight */}
                <div style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--primary)/.2)", borderRadius: 16, padding: 24, opacity: productsV.inView ? 1 : 0, transform: productsV.inView ? "none" : "translateY(20px)", transition: "opacity .55s ease .22s, transform .55s ease .22s" }}>
                  <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: "hsl(var(--foreground))" }}>Why Privacy Matters</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ color: "hsl(var(--primary))", fontWeight: 800 }}>❌</span>
                      <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Engraved tags expose your phone number to anyone</span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ color: "hsl(var(--primary))", fontWeight: 800 }}>❌</span>
                      <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Dashboard stickers invite theft and harassment</span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ color: "hsl(var(--primary))", fontWeight: 800 }}>✅</span>
                      <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>PingME keeps your number hidden while enabling instant recovery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* VALUES ─────────────────────────────────────────────────────── */}
          <section ref={valuesV.ref} className="pm-sec">
            <Eyebrow style={{ opacity: valuesV.inView ? 1 : 0, transition: "opacity .5s" }}>What We Stand For</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 36, color: "hsl(var(--foreground))", opacity: valuesV.inView ? 1 : 0, transform: valuesV.inView ? "none" : "translateY(16px)", transition: "opacity .55s ease .08s, transform .55s ease .08s" }}>
              Principles we don't <span className="g-text">compromise on.</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-5 items-start">
              {VALUES.map((v, i) => <ValueCard key={v.label} {...v} index={i} inView={valuesV.inView} />)}
            </div>
          </section>

          {/* TIMELINE ──────────────────────────────────────────────────── */}
          <section ref={timelineV.ref} className="pm-sec" style={{ borderTop: "1.5px solid hsl(var(--border))", paddingTop: 52 }}>
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <div style={{ opacity: timelineV.inView ? 1 : 0, transform: timelineV.inView ? "none" : "translateX(-28px)", transition: "opacity .55s ease, transform .55s ease" }}>
                <Eyebrow>Our Journey</Eyebrow>
                <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 10, color: "hsl(var(--foreground))" }}>
                  Small idea. <span className="g-text">Big impact.</span>
                </h2>
                <p style={{ color: "hsl(var(--muted-foreground))", lineHeight: 1.72, marginBottom: 32, fontSize: 15 }}>From a single frustrating parking incident to thousands of protected vehicles across India.</p>

                {/* Ping diagram */}
                <div className="ping-diag">
                  <div style={{ position: "absolute", left: 36, top: "50%", transform: "translateY(-50%)" }}>
                    {[0, .65, 1.3].map((d, i) => <span key={i} className="ping-ring" style={{ position: "absolute", inset: 0, display: "inline-flex", width: 44, height: 44, borderRadius: "50%", background: `hsl(var(--primary)/${0.22 - i * 0.06})`, animationDelay: `${d}s` }} />)}
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ width: 46, height: 46, background: "hsl(var(--primary)/.12)", border: "1.5px solid hsl(var(--primary)/.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "hsl(var(--primary))" }}><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" /></svg>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sig-dash" style={{ height: 2, flex: 1, borderRadius: 2, background: "hsl(var(--primary))", animationDelay: `${i * .14}s` }} />)}
                    </div>
                    <div style={{ width: 46, height: 46, background: "hsl(var(--primary)/.12)", border: "1.5px solid hsl(var(--primary)/.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "hsl(var(--primary))" }}><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" /></svg>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>Your vehicle</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--primary))" }}>Private ping →</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>Your phone</span>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(var(--primary))", animation: "dotPulse 1.5s ease-in-out infinite" }} />
                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Number never revealed · Works on any device · No app needed</span>
                  </div>
                </div>
              </div>
              <div style={{ paddingTop: 8 }}>
                {TIMELINE.map((item, i) => (
                  <TimelineItem key={item.year} {...item} index={i} inView={timelineV.inView} isLast={i === TIMELINE.length - 1} />
                ))}
              </div>
            </div>
          </section>
          {/* TESTIMONIALS ───────────────────────────────────────────────── */}
          <section ref={testiV.ref} className="pm-sec" style={{ borderTop: "1.5px solid hsl(var(--border))", paddingTop: 52 }}>
            <Eyebrow style={{ opacity: testiV.inView ? 1 : 0, transition: "opacity .5s" }}>Real Stories</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 36, color: "hsl(var(--foreground))", opacity: testiV.inView ? 1 : 0, transform: testiV.inView ? "none" : "translateY(16px)", transition: "opacity .55s ease .08s, transform .55s ease .08s" }}>
              People who've been <span className="g-text">pinged safely.</span>
            </h2>
            <TestimonialsSection inView={testiV.inView} />
          </section>

          {/* FAQ ────────────────────────────────────────────────────────── */}
          <section ref={faqV.ref} className="pm-sec" style={{ borderTop: "1.5px solid hsl(var(--border))", paddingTop: 52 }}>
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <Eyebrow style={{ opacity: faqV.inView ? 1 : 0, transition: "opacity .5s" }}>Got Questions?</Eyebrow>
                <h2 style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 12, color: "hsl(var(--foreground))", opacity: faqV.inView ? 1 : 0, transform: faqV.inView ? "none" : "translateY(16px)", transition: "opacity .55s ease .08s, transform .55s ease .08s" }}>
                  Frequently asked <span className="g-text">questions.</span>
                </h2>
                <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 15, lineHeight: 1.7, opacity: faqV.inView ? 1 : 0, transition: "opacity .6s ease .16s" }}>
                  Everything you need to know about how PingME keeps you connected and safe.
                </p>
                <div style={{ marginTop: 28, opacity: faqV.inView ? 1 : 0, transition: "opacity .65s ease .24s" }}>
                  <MagneticBtn href="/contact" className="btn-sec" style={{ fontSize: 14, padding: "12px 26px" }}>
                    Still curious? Contact us <ArrowRight style={{ width: 14, height: 14 }} />
                  </MagneticBtn>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} style={{ opacity: faqV.inView ? 1 : 0, transform: faqV.inView ? "translateY(0)" : "translateY(20px)", transition: `opacity .5s ease ${i * 80 + 100}ms, transform .5s ease ${i * 80 + 100}ms` }}>
                    <FAQItem {...item} index={i} inView={faqV.inView} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* OFFICE ─────────────────────────────────────────────────────── */}
          <section ref={officeV.ref} className="pm-sec" style={{ borderTop: "1.5px solid hsl(var(--border))", paddingTop: 52 }}>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="office-card" style={{ opacity: officeV.inView ? 1 : 0, transform: officeV.inView ? "none" : "translateY(22px)", transition: "opacity .55s ease, transform .55s ease" }}>
                <Eyebrow style={{ marginBottom: 4 }}>Find Us</Eyebrow>
                <h3 style={{ fontWeight: 900, fontSize: 28, marginBottom: 24, color: "hsl(var(--foreground))" }}>Our Office</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="c-row" style={{ alignItems: "flex-start" }}>
                    <div className="c-icon"><MapPin style={{ width: 16, height: 16, color: "hsl(var(--primary))" }} /></div>
                    <div>
                      <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", lineHeight: 1.6 }}>
                        745, First Floor, Rani Boutique,<br />
                        Kesho Ram Complex, Near By Ram Electricals,<br />
                        Sector 45, Burail, Chandigarh - 160047, India
                      </p>
                      <span style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "hsl(var(--primary))" }}>Open in Maps <ArrowRight style={{ width: 11, height: 11 }} /></span>
                    </div>
                  </a>
                  <div style={{ height: 1, background: "hsl(var(--border))" }} />
                  <a href="tel:+917347340007" className="c-row"><div className="c-icon"><Phone style={{ width: 16, height: 16, color: "hsl(var(--primary))" }} /></div><span style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>+91 73473 40007</span></a>
                  <a href="mailto:contact@pingiff.ai" className="c-row"><div className="c-icon"><Mail style={{ width: 16, height: 16, color: "hsl(var(--primary))" }} /></div><span style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>contact@pingiff.ai</span></a>
                </div>
              </div>
              <div style={{ borderRadius: 22, overflow: "hidden", height: 340, border: "1.5px solid hsl(var(--border))", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", opacity: officeV.inView ? 1 : 0, transform: officeV.inView ? "none" : "translateX(24px)", transition: "opacity .6s ease .12s, transform .6s ease .12s" }}>
                <iframe title="PingME Office" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3431.9!2d76.7495!3d30.6905!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390fef!2sBurail%2C%20Sector%2045%2C%20Chandigarh!5e0!3m2!1sen!2sin!4v1" width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
          </section>

          {/* CTA ────────────────────────────────────────────────────────── */}
          <section ref={ctaV.ref}>
            <div className="cta-bg" style={{ opacity: ctaV.inView ? 1 : 0, transform: ctaV.inView ? "none" : "translateY(24px)", transition: "opacity .65s ease, transform .65s ease" }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <Eyebrow style={{ justifyContent: "center" }}>Join The Movement</Eyebrow>
                <h2 style={{ fontSize: "clamp(28px,4.5vw,48px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14, color: "hsl(var(--foreground))" }}>
                  Your number. <span className="g-text">Your rules.</span> Always.
                </h2>
                <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 17, marginBottom: 36, maxWidth: 420, margin: "0 auto 36px", lineHeight: 1.72 }}>
                  Whether it's your car, your bag, or your pet — PingME keeps you reachable without compromise.
                </p>
                <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                  <MagneticBtn href="/products" className="btn-pri">Explore Products <ArrowRight style={{ width: 16, height: 16 }} /></MagneticBtn>
                  <MagneticBtn href="/contact" className="btn-sec">Talk to Us <ArrowRight style={{ width: 16, height: 16 }} /></MagneticBtn>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </MainLayout>
  );
};

export default About;
