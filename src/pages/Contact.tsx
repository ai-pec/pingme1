import { useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Clock, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { APP_CONFIG } from "@/config/constants";
import { sanitizeText } from "@/lib/prebookService";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 1000;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SUPPORT_ADDRESS = "Ping IFF LLP, 745, Burail, Ekta Market, Burail Village, Sector 45, Chandigarh, 160047";

const buildGoogleMapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const buildTelUrl = (phone: string) =>
  `tel:${phone.replace(/[^+\d]/g, "")}`;

const buildGmailComposeUrl = (email: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;

const businessHours = [
  { day: "Monday – Friday", hours: "9:00 am – 8:00 pm" },
  { day: "Saturday", hours: "10:00 am – 6:00 pm" },
  { day: "Sunday", hours: "Closed" },
];

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const { name, email, phone, message } = formData;
    const t = (s: string) => s.trim();

    if (!t(name) || t(name).length > MAX_NAME_LENGTH) {
      toast({ title: "Invalid Name", description: `Name must be 1–${MAX_NAME_LENGTH} characters.`, variant: "destructive" });
      return false;
    }
    if (!t(email) || !EMAIL_REGEX.test(t(email)) || t(email).length > MAX_EMAIL_LENGTH) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return false;
    }
    if (t(phone) && (t(phone).length > MAX_PHONE_LENGTH || !/^[+\d\s()-]*$/.test(t(phone)))) {
      toast({ title: "Invalid Phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return false;
    }
    if (!t(message) || t(message).length > MAX_MESSAGE_LENGTH) {
      toast({ title: "Invalid Message", description: `Message must be 1–${MAX_MESSAGE_LENGTH} characters.`, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "contacts"), {
        name: sanitizeText(formData.name).substring(0, MAX_NAME_LENGTH),
        email: formData.email.trim().toLowerCase().substring(0, MAX_EMAIL_LENGTH),
        phone: sanitizeText(formData.phone).substring(0, MAX_PHONE_LENGTH),
        message: sanitizeText(formData.message).substring(0, MAX_MESSAGE_LENGTH),
        createdAt: serverTimestamp(),
        status: "new",
      });
      toast({ title: "Message Sent!", description: "We'll get back to you within 24 hours." });
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      console.error("Error saving contact form:", error);
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* ── Page hero ── */}
      <div className="bg-cream border-b border-border/40 py-12 md:py-16">
        <div className="container mx-auto flex flex-col items-center text-center gap-3">
          <div>
            <p className="section-eyebrow">Contact Us</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              We'd love to hear from you
            </h1>
          </div>
        </div>
      </div>

      {/* ── Main two-column section ── */}
      <div className="container py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">

          {/* Left — Form card */}
          <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[0_12px_40px_rgba(81,60,9,0.07)] md:p-8">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Get in Touch
            </h2>
            <p className="mb-6 text-2xl font-bold text-foreground">Send us a message</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name + Phone row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input-styled"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input-styled"
                    placeholder="+91 98765XXXXX"
                  />
                </div>
              </div>

              {/* Email full-width */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email <span className="text-primary">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input-styled"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Message <span className="text-primary">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="form-input-styled min-h-[140px] resize-y"
                  placeholder="How can we help you?"
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Sending…" : "Send Message"}
              </Button>
            </form>
          </div>

          {/* Right — Info + Hours stacked */}
          <div className="flex flex-col gap-5">

            {/* Contact information card */}
            <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[0_12px_40px_rgba(81,60,9,0.07)]">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
                Contact Information
              </h2>
              <p className="mb-5 text-lg font-bold text-foreground">Reach us directly</p>

              <div className="space-y-5">
                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Phone className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Phone</p>
                    <a
                      href={buildTelUrl(APP_CONFIG.SUPPORT_PHONE)}
                      className="mt-0.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {APP_CONFIG.SUPPORT_PHONE}
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Address</p>
                    <a
                      href={buildGoogleMapsUrl(SUPPORT_ADDRESS)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-start gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      <span className="leading-5">745, Burail, Ekta Market,<br />Sector 45, Chandigarh – 160047</span>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Mail className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Email</p>
                    <a
                      href={buildGmailComposeUrl(APP_CONFIG.SUPPORT_EMAIL)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {APP_CONFIG.SUPPORT_EMAIL}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours card */}
            <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-[0_12px_40px_rgba(81,60,9,0.07)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">Business Hours</h2>
              </div>

              <div className="space-y-0 divide-y divide-border/40">
                {businessHours.map(({ day, hours }) => (
                  <div key={day} className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-medium text-foreground">{day}</span>
                    <span className="text-sm text-muted-foreground">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Map full-width ── */}
      
    </MainLayout>
  );
};

export default Contact;