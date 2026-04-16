import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Tag, ArrowRight, Check } from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Contact without sharing phone numbers",
  },
  {
    icon: Zap,
    title: "Instant Contact",
    description: "Quick connection via QR scan",
  },
  {
    icon: Tag,
    title: "Premium Tags",
    description: "Durable, weatherproof quality",
  },
];

const trustIndicators = ["Works on any vehicle", "Lifetime QR activation", "Free shipping"];

const LandingHero = () => {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-cream overflow-auto flex">
      <div className="container flex py-6 md:py-8 lg:py-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-14 items-center w-full">
          {/* Left Column - Hero Content */}
          <section className="order-1 lg:order-1 space-y-4 lg:space-y-8">
            {/* Headline */}
            <div className="space-y-3 lg:space-y-4">
              <h1 className="text-3xl md:text-4xl lg:text-[3.5rem] font-extrabold leading-[1.2] tracking-tight text-foreground">
                Smart QR Tags
                <span className="block mt-2">
                  <span className="text-[0.95em]">
                    for{" "}
                    <span className="relative inline-block">
                      <span className="relative z-10">Your Vehicles</span>
                      <span className="absolute -bottom-1 left-0 w-full h-3 bg-primary/40 -z-0 rounded-sm"></span>
                    </span>
                  </span>
                </span>
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-lg">
                Enable instant contact without sharing phone numbers. Perfect for cars, bikes, laptops, and more.
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="hidden md:flex flex-wrap gap-4">
              {trustIndicators.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>

            {/* Benefits Grid */}
            <div className="hidden md:grid sm:grid-cols-3 gap-4 pt-2">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={index}
                    className="group p-4 rounded-xl bg-background/60 border border-border/50 hover:border-primary/30 hover:bg-background transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary/25 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column - CTA Card */}
          <section className="order-2 lg:order-2">
            <div className="relative bg-background rounded-2xl lg:rounded-3xl p-6 md:p-8 lg:p-10 shadow-xl border-2 border-primary/20 overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">Order Your Tags</h2>
                  <p className="text-muted-foreground">Premium QR tags starting at just ₹179</p>
                </div>

                {/* Value Props */}
                <div className="space-y-3 py-4 border-y border-border/50">
                  {["Durable weatherproof material", "Lifetime QR code activation", "Works on cars, bikes, laptops & more"].map(
                    (item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{item}</span>
                      </div>
                    ),
                  )}
                </div>

                {/* CTA Buttons */}
                <div className="space-y-4">
                  <Link to="/products" className="block">
                    <Button size="full" className="group text-base font-bold">
                      Browse Products
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>

                  <Link to="/booking?product=pingme-car-card" className="block">
                    <Button size="full" variant="outline" className="text-base font-bold">
                      Pre-book Car Card - ₹499
                    </Button>
                  </Link>
                </div>

                {/* Trust Badge */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Secure checkout • Free shipping</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LandingHero;
