import { useEffect, useRef } from "react";
import MainLayout from "@/layouts/MainLayout";
import Seo from "@/components/Seo";
import { blogArticles } from "@/lib/blogContent";
import { ArrowRight, CalendarDays, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "PingME Blog",
  description: "Blog posts about vehicle tags, pet tags, lost and found tags, door tags, privacy, and guides.",
  blogPost: blogArticles.map((article, index) => ({
    "@type": "BlogPosting",
    position: index + 1,
    headline: article.title,
    description: article.excerpt,
    keywords: article.focusKeywords.join(", "),
  })),
};

// Hook: fires callback when element enters viewport
function useScrollReveal(selector: string) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(selector);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("sr-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selector]);
}

const Blog = () => {
  useScrollReveal(".sr-item");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  return (
    <MainLayout>
      <Seo
        title="Blog | PingME"
        description="Helpful PingME blogs about vehicle tags, pet tags, lost and found tags, door tags, privacy, and setup guides."
        canonicalPath="/blog"
        jsonLd={blogSchema}
      />

      <style>{`
        /* Scroll reveal base states */
        .sr-item {
          opacity: 0;
          transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1);
          will-change: transform, opacity;
        }
        .sr-from-left  { transform: translateX(-56px); }
        .sr-from-right { transform: translateX( 56px); }
        .sr-from-below { transform: translateY( 40px); }
        .sr-item.sr-visible {
          opacity: 1 !important;
          transform: none !important;
        }

        /* Stagger delays */
        .sr-delay-1 { transition-delay: 0.08s; }
        .sr-delay-2 { transition-delay: 0.18s; }
        .sr-delay-3 { transition-delay: 0.28s; }

        /* Organic blob shape on category pill */
        .blob-pill {
          border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
        }

        /* Decorative dot grid */
        .dot-grid {
          background-image: radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        /* Number counter style */
        .counter-num {
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
      `}</style>

      <main className="overflow-hidden pb-20">

        {/* ── HERO ── */}
        <section className="relative dot-grid bg-cream pt-12 pb-16 md:pt-16 md:pb-20">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-10 right-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-4 h-48 w-48 rounded-full bg-amber-200/40 blur-2xl" />

          <div className="container relative">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  PingME Blog
                </span>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl leading-normal md:leading-[1.45]">
  Smart tag stories,<br />
  <span className="text-primary">guides &amp; ideas.</span>
</h1>
                <p className="max-w-xl text-base leading-8 text-muted-foreground">
                  Everything you need to know about vehicle tags, pet tags, lost &amp; found tags, and privacy-first contact.
                </p>
              </div>

              {/* Stats row */}
              <div className="flex shrink-0 gap-4 lg:flex-col lg:gap-3">
                {[
                  { n: blogArticles.length, label: "Articles" },
                  { n: "5+", label: "Topics" },
                  { n: "2 min", label: "Avg. read" },
                ].map(({ n, label }) => (
                  <div key={label} className="rounded-2xl border border-border/60 bg-background/80 px-5 py-3 text-center shadow-sm">
                    <p className="counter-num text-2xl font-extrabold text-primary">{n}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── ARTICLES ── */}
        <section className="container mt-14 space-y-20 md:mt-18">

          {blogArticles.map((article, index) => {
            const isEven = index % 2 === 0;
            // Even articles slide in from left, odd from right
            const revealClass = isEven ? "sr-from-left" : "sr-from-right";

            return (
              <article
                key={article.slug}
                className={`sr-item ${revealClass} group`}
              >
                <div className={`grid gap-0 overflow-hidden rounded-[2rem] border border-border/60 bg-background shadow-[0_20px_60px_rgba(81,60,9,0.08)] transition-shadow hover:shadow-[0_30px_80px_rgba(81,60,9,0.14)] lg:grid-cols-[1fr_1fr] ${isEven ? "" : "lg:[direction:rtl]"}`}>

                  {/* LEFT / accent panel */}
                  <div className={`relative flex flex-col justify-between gap-6 bg-gradient-to-br p-6 md:p-8 lg:[direction:ltr] ${
                    index % 4 === 0 ? "from-amber-400/20 to-yellow-100/10" :
                    index % 4 === 1 ? "from-emerald-400/20 to-teal-100/10" :
                    index % 4 === 2 ? "from-sky-400/20 to-blue-100/10" :
                                      "from-rose-400/20 to-pink-100/10"
                  }`}>
                    {/* Subtle number watermark */}
                    <span className="pointer-events-none absolute right-4 top-2 text-[6rem] font-black leading-none text-foreground/5 select-none">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="space-y-4">
                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                          {article.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {article.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {article.readTime}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary md:text-3xl">
                        {article.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm leading-7 text-muted-foreground line-clamp-3">
                        {article.excerpt}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {article.focusKeywords.slice(0, 4).map((kw) => (
                        <span key={kw} className="rounded-full border border-border/50 bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT / content panel */}
                  <div className="flex flex-col justify-between gap-5 border-t border-border/40 p-6 md:p-8 lg:border-l lg:border-t-0 lg:[direction:ltr]">

                    {/* Why it matters */}
                    <div className="rounded-2xl bg-muted/40 p-4">
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Why this matters</p>
                      <p className="text-sm leading-7 text-foreground/75">{article.intro}</p>
                    </div>

                    {/* Takeaways */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key takeaways</p>
                      <div className="grid gap-2 sm:grid-cols-1">
                        {article.takeaways.slice(0, 3).map((t) => (
                          <div key={t} className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-background px-3 py-2.5">
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="text-sm leading-5 text-foreground/80">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* ── CTA BAND ── */}
        <div className="sr-item sr-from-below mt-20 container">
          <div className="relative overflow-hidden rounded-[2rem] bg-foreground px-8 py-12 text-center md:py-16">
            <div className="pointer-events-none absolute inset-0 dot-grid opacity-10" />
            <div className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <p className="mb-3 inline-block rounded-full border border-white/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white/50">
                Explore our products
              </p>
              <h2 className="text-3xl font-extrabold text-white md:text-4xl">
                Ready to protect what matters?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/50">
                Browse our range of smart QR &amp; NFC tags — built for vehicles, pets, and everyday belongings.
              </p>
              <Link
                to="/products"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
              >
                Browse Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

      </main>
    </MainLayout>
  );
};

export default Blog;