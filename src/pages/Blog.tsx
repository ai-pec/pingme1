import MainLayout from "@/layouts/MainLayout";
import Seo from "@/components/Seo";
import { blogArticles } from "@/lib/blogContent";
import { ArrowRight, BookOpen, CalendarDays, Clock3, Lightbulb, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "PingME Blog",
  description:
    "Blog posts about vehicle tags, pet tags, lost and found tags, door tags, privacy, and guides.",
  blogPost: blogArticles.map((article, index) => ({
    "@type": "BlogPosting",
    position: index + 1,
    headline: article.title,
    description: article.excerpt,
    keywords: article.focusKeywords.join(", "),
  })),
};

const Blog = () => {
  return (
    <MainLayout>
      <Seo
        title="Blog | PingME"
        description="Helpful PingME blogs about vehicle tags, pet tags, lost and found tags, door tags, privacy, and setup guides."
        canonicalPath="/blog"
        jsonLd={blogSchema}
      />

      <main className="pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="container">
          <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-6 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_35%)]" />
            <div className="relative max-w-4xl space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-0.5 text-xs font-bold uppercase tracking-[0.24em] text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Blog
              </span>
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
                  Smart tag stories, setup guides, and privacy-first ideas.
                </h1>
                <p className="max-w-3xl text-base md:text-lg leading-8 text-muted-foreground">
                  One blog page for everything we want to teach clearly: vehicle tags, pet tags, lost and found tags,
                  door tags, privacy, and practical guides. No attribute categories, no extra pages, just a scalable
                  content hub that is easy to browse and easy to index.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card/80 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <BookOpen className="h-3.5 w-3.5" />
                    </span>
                    Explore Deep Dives
                  </p>
                  <p className="mt-2 text-sm font-medium">Read comprehensive articles designed to know more about our products.</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Lightbulb className="h-3.5 w-3.5" />
                    </span>
                    Quick Insights
                  </p>
                  <p className="mt-2 text-sm font-medium">Get straight to the point with clear, actionable takeaways.</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <RefreshCcw className="h-3.5 w-3.5" />
                    </span>
                    Always Something New
                  </p>
                  <p className="mt-2 text-sm font-medium">We update regularly so you never miss a fresh perspective.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Latest articles</p>
                <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">Best posts for the topics customers ask about most</h2>
              </div>
              <Link
                to="/products"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-foreground px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Browse Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-6">
              {blogArticles.map((article) => (
                <article
                  key={article.slug}
                  className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="grid md:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-6 md:border-b-0 md:border-r">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{article.category}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {article.date}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {article.readTime}
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold tracking-tight leading-tight group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>

                      <p className="mt-4 text-sm leading-7 text-muted-foreground">{article.excerpt}</p>

                      
                    </div>

                    <div className="p-6 md:p-7">
                      <div className="rounded-2xl bg-secondary/40 p-4 md:p-5">
                        <p className="text-sm font-semibold text-foreground">Why this matters</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{article.intro}</p>
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-3">
                        {article.takeaways.map((takeaway) => (
                          <div key={takeaway} className="flex gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-foreground/85">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="leading-6">{takeaway}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {article.focusKeywords.map((keyword) => (
                          <span key={keyword} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </MainLayout>
  );
};

export default Blog;