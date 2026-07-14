'use client';

import { useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Copy,
  Handshake,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
const pingMeLogo = { src: "/collab-logo.jpeg" };
const collaborationCard = {src: "/pingme-collab.jpeg"};

const programHighlights = [
  {
    icon: Rocket,
    title: "Pilot Program Launch",
    description:
      "Pro Ultimate Gym Chain is our first official collaborator for testing high-traffic safety communication use cases.",
  },
  {
    icon: Users,
    title: "Member Safety Experience",
    description:
      "The pilot introduces privacy-first owner alerts to improve response time and member support around parked vehicles.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by Design",
    description:
      "All interactions are built on PingME's masked communication framework to protect personal contact details.",
  },
];

const outcomes = [
  "Pilot onboarding for Pro Ultimate locations",
  "Operational feedback loop between gym teams and PingME",
  "Measure notification response and issue resolution time",
  "Prepare a scalable partnership rollout model",
];

const stats = [
  { value: "1", label: "Pilot Partner Onboarded" },
  { value: "100%", label: "Contact Details Masked" },
  { value: "24/7", label: "Alert Availability" },
  { value: "0", label: "Personal Numbers Shared" },
];

const faqs = [
  {
    question: "What does a pilot partnership involve?",
    answer:
      "We work with your team to roll out PingME's masked alert system at your locations, gather feedback from staff and members, and measure how quickly issues get resolved.",
  },
  {
    question: "Is there a cost to become a pilot partner?",
    answer:
      "Pilot partnerships are evaluated case by case. Reach out through the form below and our team will walk you through what's involved for your locations.",
  },
  {
    question: "How does PingME protect personal contact details?",
    answer:
      "All communication is routed through PingME's masking layer, so phone numbers and personal details are never exposed to the other party during an alert or conversation.",
  },
  {
    question: "What kinds of businesses can partner with PingME?",
    answer:
      "Gyms, residential societies, offices, and any high-traffic space that manages parking or visitor access can benefit from PingME's alert and communication tools.",
  },
];

const contactDetails = [
  {
    label: "Company",
    value: "Ping IFF LLP",
    icon: Building2,
    copyable: false,
  },
  {
    label: "Address",
    value: "745, First Floor, Rani Boutique, Kesho Ram Complex, Near By Ram Electricals, Sector 45, Burail, Chandigarh, Chandigarh, 160047, India",
    icon: MapPin,
    copyable: true,
  },
  {
    label: "Phone",
    value: "+91 73473 40007",
    icon: Phone,
    href: "tel:+917347340007",
    copyable: true,
  },
  {
    label: "Email",
    value: "contact@pingiff.ai",
    icon: Mail,
    href: "mailto:contact@pingiff.ai",
    copyable: true,
  },
];

type FormStatus = "idle" | "submitting" | "success" | "error";

const Partners = () => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formError, setFormError] = useState("");

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField((current) => (current === label ? null : current)), 1800);
    } catch {
      // Clipboard access may be blocked; fail silently.
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.businessName || !form.contactName || !form.email || !form.message) {
      setFormStatus("error");
      setFormError("Please fill in the required fields before sending your request.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.email)) {
      setFormStatus("error");
      setFormError("Please enter a valid email address.");
      return;
    }

    setFormStatus("submitting");
    setFormError("");

    // Placeholder submission. Wire this up to your API route / form handler.
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setFormStatus("success");
      setForm({ businessName: "", contactName: "", email: "", phone: "", message: "" });
    } catch {
      setFormStatus("error");
      setFormError("Something went wrong. Please try again or email us directly.");
    }
  };

  return (
    <MainLayout>
      <section className="relative overflow-hidden py-14 md:py-20 bg-background text-foreground">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(250,204,21,0.08)_0%,rgba(250,204,21,0.02)_20%,rgba(0,0,0,0)_42%,rgba(0,0,0,0)_58%,rgba(239,68,68,0.02)_80%,rgba(239,68,68,0.08)_100%)]" />
          <div className="absolute -left-40 top-10 h-[40rem] w-[40rem] rounded-full bg-yellow-300/30 blur-[170px] opacity-60" />
          <div className="absolute -left-8 bottom-[-10rem] h-[28rem] w-[28rem] rounded-full bg-amber-400/20 blur-[140px] opacity-50" />
          <div className="absolute -right-32 top-8 h-[42rem] w-[42rem] rounded-full bg-red-500/20 blur-[180px] opacity-60" />
          <div className="absolute right-[-4rem] bottom-[-7rem] h-[30rem] w-[30rem] rounded-full bg-rose-600/20 blur-[150px] opacity-50" />
        </div>

        <div className="container relative space-y-12">
          {/* -- HERO -- */}
          <div className="mx-auto max-w-4xl text-center space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary shadow-sm backdrop-blur-sm">
              Partners
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Building Safer Experiences Through Strategic Collaboration
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-8 text-muted-foreground">
              PingME is proud to announce a pilot partnership with{" "}
              <span className="font-semibold text-primary">Pro Ultimate Gym Chain</span>, our first collaborator. This
              program validates how privacy-first communication can improve member safety and day-to-day operations.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="mt-8 flex justify-center">
              <a
                href="#partner-form"
                role="button"
                className="inline-block w-full sm:w-auto text-center bg-primary/20 hover:bg-primary/30 border border-primary/40 text-foreground font-extrabold text-2xl md:text-3xl px-6 py-4 rounded-2xl shadow-md transition-colors"
              >
                Want to collaborate with us? Contact us
              </a>
            </div>
          </div>

          {/* -- STATS STRIP -- */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 text-center shadow-sm"
              >
                <p className="text-2xl font-extrabold text-primary md:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* -- PILOT PARTNER + SNAPSHOT -- */}
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[1.75rem] border border-border bg-card/80 p-6 shadow-lg backdrop-blur-xl md:p-8">
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-2xl border border-border bg-card p-2 shadow-md">
                  <img src={pingMeLogo.src} alt="PingME logo" className="h-12 w-auto object-contain rounded-xl" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500/25 to-primary/20 text-primary shadow-sm">
                  <Handshake className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Collaboration Partner</p>
                  <h2 className="text-2xl font-bold text-foreground">Pro Ultimate Gym Chain</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {programHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 shadow-sm">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-primary/20 shadow-sm">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  <BadgeCheck className="h-4 w-4 text-red-500" />
                  Pilot Program Objectives
                </div>
                <ul className="space-y-2">
                  {outcomes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-red-400 to-amber-400 shadow-none" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <aside className="rounded-[1.75rem] border border-border bg-card/80 p-6 shadow-lg backdrop-blur-xl md:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-primary/20">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Partnership Preview</p>
                  <h3 className="text-xl font-bold text-foreground">Collaboration Snapshot</h3>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-muted">
                <img src={collaborationCard.src} alt="PingME collaboration card" className="w-full object-cover" />
              </div>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                This pilot marks the beginning of PingME's partnership track. We are working closely with Pro Ultimate Gym
                Chain to shape reliable, privacy-first communication at scale.
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Want to collaborate with us?{" "}
                <a href="#partner-form" className="font-semibold text-primary hover:underline">
                  Fill out the form below
                </a>
                .
              </p>
            </aside>
          </div>

          {/* -- FAQ ACCORDION -- */}
          <div className="rounded-[1.75rem] border border-border bg-card/80 p-6 shadow-lg backdrop-blur-xl md:p-8">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Good to Know</p>
              <h2 className="text-xl font-bold text-foreground">Partnership FAQs</h2>
            </div>

            <div className="divide-y divide-border">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={faq.question} className="py-3">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="text-sm font-semibold text-foreground">{faq.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* -- BECOME A PARTNER -- */}
          <div className="rounded-[1.75rem] border border-border bg-card/80 p-6 shadow-lg backdrop-blur-xl md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-primary/20 shadow-sm">
                <Handshake className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Get Started</p>
                <h2 className="text-xl font-bold text-foreground">Become a Partner</h2>
              </div>
            </div>

            <p className="mb-6 text-sm leading-7 text-muted-foreground">
              Interested in bringing PingME to your gym, society, or office? Reach out to us and let's build something
              together.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {contactDetails.map(({ label, value, href, copyable, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </p>
                    {copyable && (
                      <button
                        type="button"
                        onClick={() => handleCopy(label, value)}
                        aria-label={`Copy ${label.toLowerCase()}`}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {copiedField === label ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  {href ? (
                    <a
                      href={href}
                      className="break-all text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="break-words text-sm font-medium leading-5 text-muted-foreground">{value}</p>
                  )}
                  {copiedField === label && (
                    <p className="mt-1 text-[10px] font-medium text-emerald-500">Copied to clipboard</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* -- PARTNER INQUIRY FORM -- */}
          <div id="partner-form" className="rounded-[1.75rem] border border-border bg-card/80 p-6 shadow-lg backdrop-blur-xl md:p-8">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Let's Talk</p>
              <h2 className="text-xl font-bold text-foreground">Tell Us About Your Business</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Share a few details and our partnerships team will get back to you about next steps.
              </p>
            </div>

            {formStatus === "success" ? (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Thanks — your request has been received.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Our team will reach out to the email you provided shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormStatus("idle")}
                    className="mt-3 text-sm font-semibold text-emerald-500 underline hover:text-emerald-400"
                  >
                    Submit another request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="businessName" className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                    Business Name *
                  </label>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    value={form.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Pro Ultimate Gym Chain"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contactName" className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                    Your Name *
                  </label>
                  <input
                    id="contactName"
                    name="contactName"
                    type="text"
                    value={form.contactName}
                    onChange={handleChange}
                    placeholder="Full name"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                    Phone (optional)
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 00000 00000"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="message" className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                    How would you like to collaborate? *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us about your locations and what you'd like to pilot with PingME."
                    className="resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {formStatus === "error" && (
                  <p className="sm:col-span-2 text-sm font-medium text-destructive">{formError}</p>
                )}

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={formStatus === "submitting"}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formStatus === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {formStatus === "submitting" ? "Sending..." : "Send Partnership Request"}
                    {formStatus !== "submitting" && <span>→</span>}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              Prefer email or a call? Reach us directly at{" "}
              <a href="mailto:contact@pingiff.ai" className="font-semibold text-primary hover:underline">
                contact@pingiff.ai
              </a>{" "}
              or{" "}
              <a href="tel:+917347340007" className="font-semibold text-primary hover:underline">
                +91 73473 40007
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Partners;