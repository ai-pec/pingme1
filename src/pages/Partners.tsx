import MainLayout from "@/layouts/MainLayout";
import { Link } from "react-router-dom";
import { BadgeCheck, Building2, Handshake, Rocket, ShieldCheck, Users } from "lucide-react";
import pingMeLogo from "@/assets/pingprocard_logo.jpeg";
import collaborationCard from "@/assets/pingprocard.jpeg";

const programHighlights = [
  {
    icon: Rocket,
    title: "Pilot Program Launch",
    description: "Pro Ultimate Gym Chain is our first official collaborator for testing high-traffic safety communication use cases.",
  },
  {
    icon: Users,
    title: "Member Safety Experience",
    description: "The pilot introduces privacy-first owner alerts to improve response time and member support around parked vehicles.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by Design",
    description: "All interactions are built on PingME's masked communication framework to protect personal contact details.",
  },
];

const outcomes = [
  "Pilot onboarding for Pro Ultimate locations",
  "Operational feedback loop between gym teams and PingME",
  "Measure notification response and issue resolution time",
  "Prepare a scalable partnership rollout model",
];

const Partners = () => {
  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-neutral-950 py-14 md:py-20 text-stone-100">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,7,0.64),rgba(5,5,7,0.84))]" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_12px)] opacity-40 mix-blend-soft-light" />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(250,204,21,0.12)_0%,rgba(250,204,21,0.04)_20%,rgba(0,0,0,0)_42%,rgba(0,0,0,0)_58%,rgba(239,68,68,0.04)_80%,rgba(239,68,68,0.12)_100%)]" />
          <div className="absolute -left-40 top-10 h-[40rem] w-[40rem] rounded-full bg-yellow-300/55 blur-[170px] mix-blend-screen opacity-95" />
          <div className="absolute -left-8 bottom-[-10rem] h-[28rem] w-[28rem] rounded-full bg-amber-400/35 blur-[140px] mix-blend-screen opacity-90" />
          <div className="absolute -right-32 top-8 h-[42rem] w-[42rem] rounded-full bg-red-500/55 blur-[180px] mix-blend-screen opacity-95" />
          <div className="absolute right-[-4rem] bottom-[-7rem] h-[30rem] w-[30rem] rounded-full bg-rose-600/35 blur-[150px] mix-blend-screen opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_48%,rgba(250,204,21,0.28),transparent_24%),radial-gradient(circle_at_82%_48%,rgba(239,68,68,0.28),transparent_26%),radial-gradient(circle_at_center,rgba(0,0,0,0.1),rgba(0,0,0,0.72))]" />
        </div>

        <div className="container relative space-y-12">
          <div className="mx-auto max-w-4xl text-center space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200 shadow-[0_0_30px_rgba(239,68,68,0.12)] backdrop-blur-sm">
              Partners
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Building Safer Experiences Through Strategic Collaboration
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-8 text-stone-300">
              PingME is proud to announce a pilot partnership with <span className="font-semibold text-amber-200">Pro Ultimate Gym Chain</span>, our
              first collaborator. This program validates how privacy-first communication can improve member safety and day-to-day operations.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="mt-8 flex justify-center">
              <Link
                to="/contact"
                role="button"
                className="inline-block w-full sm:w-auto text-center bg-amber-200/8 hover:bg-amber-200/12 border border-amber-300/20 text-amber-50 hover:text-amber-200 font-extrabold text-2xl md:text-3xl px-6 py-4 rounded-2xl shadow-lg"
              >
                Want to collaborate with us? Contact us
              </Link>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[1.75rem] border border-white/10 bg-black/70 p-6 shadow-[0_0_50px_rgba(239,68,68,0.12),0_0_80px_rgba(250,204,21,0.08)] backdrop-blur-xl md:p-8">
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
                  <img src={pingMeLogo} alt="PingME logo" className="h-12 w-auto object-contain rounded-xl" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500/25 to-amber-400/20 text-amber-200 shadow-[0_0_18px_rgba(239,68,68,0.18)]">
                  <Handshake className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">Collaboration Partner</p>
                  <h2 className="text-2xl font-bold text-white">Pro Ultimate Gym Chain</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {programHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-amber-400/20 shadow-[0_0_20px_rgba(239,68,68,0.12)]">
                        <Icon className="h-5 w-5 text-amber-200" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-stone-300">{item.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-amber-300/15 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                  <BadgeCheck className="h-4 w-4 text-red-400" />
                  Pilot Program Objectives
                </div>
                <ul className="space-y-2">
                  {outcomes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-stone-300">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-gradient-to-r from-red-400 to-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.35)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <aside className="rounded-[1.75rem] border border-white/10 bg-black/70 p-6 shadow-[0_0_50px_rgba(250,204,21,0.08),0_0_80px_rgba(239,68,68,0.1)] backdrop-blur-xl md:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-amber-400/20">
                  <Building2 className="h-5 w-5 text-amber-200" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">Partnership Preview</p>
                  <h3 className="text-xl font-bold text-white">Collaboration Snapshot</h3>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80">
                <img
                  src={collaborationCard}
                  alt="PingME collaboration card"
                  className="w-full object-cover"
                />
              </div>

              <p className="mt-4 text-sm leading-7 text-stone-300">
                This pilot marks the beginning of PingME's partnership track. We are working closely with Pro Ultimate Gym Chain
                to shape reliable, privacy-first communication at scale.
              </p>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                Want to collaborate with us?{' '}
                <Link to="/contact" className="font-semibold text-amber-200 hover:underline">
                  Contact us
                </Link>
                .
              </p>
            </aside>
          </div>
          <div className="mt-10 rounded-2xl border border-border/60 bg-background/90 p-6">
            <h2 className="text-lg font-bold mb-3">Become a Partner</h2>
            <p className="text-muted-foreground mb-4">Interested in bringing PingME to your gym, society, or office? Contact us:</p>
            <address className="not-italic text-muted-foreground leading-7">
              <strong className="text-foreground">Ping IFF LLP</strong><br />
              745, Burail, Ekta Market, Burail Village,<br />
              Sector 45, Chandigarh &ndash; 160047, India<br />
              Phone: <a href="tel:+917347340007" className="hover:underline">+91 73473 40007</a><br />
              Email: <a href="mailto:contact@pingiff.ai" className="hover:underline">contact@pingiff.ai</a>
            </address>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Partners;