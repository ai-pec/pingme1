import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, Compass, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[hsl(var(--secondary))] to-[hsl(var(--background))]">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full bg-primary/8 blur-[100px] animate-pulse [animation-delay:1s]" />
        <div className="absolute -bottom-40 left-1/3 h-[350px] w-[350px] rounded-full bg-primary/6 blur-[90px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        {/* Animated 404 Circle */}
        <div className="relative mx-auto mb-8 h-40 w-40">
          <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/30 animate-spin [animation-duration:12s]" />
          <div className="absolute inset-3 flex items-center justify-center rounded-full border border-primary/20 bg-primary/5">
            <Compass className="h-14 w-14 text-primary" strokeWidth={1.5} />
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90 shadow-lg">
              <span className="text-xs font-bold text-white">404</span>
            </div>
          </div>
        </div>

        {/* Lost text */}
        <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-6xl">
          Lost in space?
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-2 max-w-md text-lg font-medium text-[hsl(var(--muted-foreground))]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <p className="mb-9 font-mono text-xs tracking-wider text-primary/70">
          /{location.pathname.replace(/^\/+/, "").slice(0, 60) || "home"}
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="gap-2 rounded-xl px-6 py-5 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            <a href="/">
              <Home size={18} />
              Back to Home
            </a>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
            className="gap-2 rounded-xl px-6 py-5 text-sm font-semibold border-primary/20 hover:border-primary/40 transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </Button>
        </div>

        {/* Quick links */}
        <div className="mt-14">
          <p className="mb-5 text-xs font-semibold tracking-widest text-[hsl(var(--muted-foreground))] uppercase">
            Or explore these pages
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: "Products", href: "/products" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
              { label: "Blog", href: "/blog" },
              { label: "FAQ", href: "/faq" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:ring-primary/20"
              >
                <Zap size={14} className="text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer text */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs font-medium tracking-widest text-[hsl(var(--muted-foreground))]">
          POWERED BY PINGME — A BRAND BY PING IFF LLP
        </p>
      </div>
    </div>
  );
};

export default NotFound;
