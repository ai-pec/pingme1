import { useEffect, useMemo, useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import { Users, Target, Shield, Heart, MapPin, Phone, Mail } from "lucide-react";
import { getCachedPublicStats, refreshPublicStats } from "@/lib/publicStatsService";

const STATIC_CITIES_COVERED = 3;
const STATIC_GOOGLE_RATING = 4.0;

const animateNumber = (
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void
) => {
  const start = performance.now();

  const frame = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (to - from) * eased);
    onUpdate(value);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  };

  requestAnimationFrame(frame);
};

const About = () => {
  const cachedStats = useMemo(() => getCachedPublicStats(), []);
  const [happyCustomers, setHappyCustomers] = useState(cachedStats?.happyCustomers || 0);
  const [vehiclesProtected, setVehiclesProtected] = useState(cachedStats?.vehiclesProtected || 0);
  const [isLoaded, setIsLoaded] = useState(false);

  const aboutStats = useMemo(() => ({
    citiesCovered: STATIC_CITIES_COVERED,
    googleRating: STATIC_GOOGLE_RATING,
  }), []);

  useEffect(() => {
    let alive = true;

    if (cachedStats) {
      setIsLoaded(true);
    }

    const loadStats = async () => {
      const stats = await refreshPublicStats();
      if (!alive) return;

      const fromHappyCustomers = cachedStats?.happyCustomers || 0;
      const fromVehiclesProtected = cachedStats?.vehiclesProtected || 0;

      animateNumber(fromHappyCustomers, stats.happyCustomers, 700, (value) => {
        if (alive) setHappyCustomers(value);
      });
      animateNumber(fromVehiclesProtected, stats.vehiclesProtected, 700, (value) => {
        if (alive) setVehiclesProtected(value);
      });

      setIsLoaded(true);
    };

    void loadStats();

    return () => {
      alive = false;
    };
  }, [cachedStats]);

  return (
    <MainLayout>
      <div className="py-16">
        <div className="container">
          <p className="section-eyebrow">About Us</p>
          <h1 className="section-title text-4xl">The story behind privacy-first vehicle contact</h1>

          <div className="mx-auto max-w-6xl">
            <div className="prose prose-lg mb-12">
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                We started PingME because we saw a simple problem: how do you let someone contact you about your parked
                vehicle without giving away your phone number? Whether it's wrong parking, an emergency, or just someone
                trying to help—you should be reachable without compromising your privacy.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Our solution is a beautifully designed QR code card that hangs on your vehicle. When scanned, it allows
                the person to send you predefined alerts or make a privacy-protected call—all without ever seeing your
                number.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Our Mission</h3>
                  <p className="text-muted-foreground">
                    To create a world where vehicle owners can be contacted safely and privately, without the fear of
                    spam or harassment.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Privacy First</h3>
                  <p className="text-muted-foreground">
                    Your phone number is never shared. All calls are masked and you control who can reach you.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Community Driven</h3>
                  <p className="text-muted-foreground">
                    Built with feedback from thousands of vehicle owners across 3+ cities in India.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Made in India</h3>
                  <p className="text-muted-foreground">
                    Proudly designed and manufactured in Chandigarh, India, for Indian vehicle owners.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-primary rounded-2xl p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-foreground">{happyCustomers}+</div>
                  <div className="text-sm text-foreground/80">Happy Customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{vehiclesProtected}+</div>
                  <div className="text-sm text-foreground/80">Vehicles Protected</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{aboutStats.citiesCovered}+</div>
                  <div className="text-sm text-foreground/80">Cities Explored</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{aboutStats.googleRating.toFixed(1)}★</div>
                  <div className="text-sm text-foreground/80">Google Rating</div>
                </div>
              </div>
              {!isLoaded && (
                <p className="mt-4 text-center text-xs text-foreground/70">
                  Loading live stats...
                </p>
              )}
            </div>

            {/* Office Address */}
            <div className="mt-12 rounded-2xl border border-border/60 bg-background/90 p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4">Our Office</h2>
              <address className="not-italic text-muted-foreground leading-7">
                <strong>Ping IFF LLP</strong><br />
                745, Burail, Ekta Market, Burail Village,<br />
                Sector 45, Chandigarh &ndash; 160047, India<br />
                Phone: <a href="tel:+917347340007" className="hover:underline">+91 73473 40007</a><br />
                Email: <a href="mailto:contact@pingiff.ai" className="hover:underline">contact@pingiff.ai</a>
              </address>
            </div>
          </div>
        </div>
      </div>

      {/* Find Us / Our Office Section */}
      <div className="bg-[#FAF7F2] py-16 border-t border-border/30">
        <div className="container">
          <div className="mx-auto max-w-6xl">

            <h2 className="text-3xl font-extrabold text-foreground mb-8">Our Office</h2>

            <div className="border-t border-border/40 pt-7">
              <p className="font-bold text-base text-foreground mb-2">Ping IFF LLP</p>

              <div className="flex flex-col gap-1.5 text-muted-foreground text-[15px]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6A2E]" />
                  <span>
                    745, Burail, Ekta Market, Burail Village,<br />
                    Sector 45, Chandigarh – 160047, India
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0 text-[#8B6A2E]" />
                  <span>+91 73473 40007</span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0 text-[#8B6A2E]" />
                  <a
                    href="mailto:contact@pingiff.ai"
                    className="hover:text-foreground transition-colors"
                  >
                    contact@pingiff.ai
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default About;