import MainLayout from "@/layouts/MainLayout";
import { Users, Target, Shield, Heart } from "lucide-react";

const About = () => {
  return (
    <MainLayout>
      <div className="py-16">
        <div className="container">
          <p className="section-eyebrow">About Us</p>
          <h1 className="section-title text-4xl">The story behind privacy-first vehicle contact</h1>

          <div className="max-w-4xl mx-auto">
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
                    Built with feedback from thousands of vehicle owners across 5+ cities in India.
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
                    Proudly designed and manufactured in India, for Indian vehicle owners.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-primary rounded-2xl p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-foreground">100+</div>
                  <div className="text-sm text-foreground/80">Happy Customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">200+</div>
                  <div className="text-sm text-foreground/80">Vehicles Protected</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">3+</div>
                  <div className="text-sm text-foreground/80">Cities Covered</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">4.0★</div>
                  <div className="text-sm text-foreground/80">Google Rating</div>
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
