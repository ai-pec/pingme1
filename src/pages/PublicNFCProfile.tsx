import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Linkedin, Twitter, Instagram, Youtube, Facebook,
  Link as LinkIcon, Mail, Phone, Globe, MapPin,
  UserPlus, Nfc, Share2, X as XIcon, Copy, Check,
  MessageCircle, Calendar, CreditCard, FileText, Image, Video, Award,
  Send, Loader2,
} from "lucide-react";
import { fetchPublicNfcProfile, normalizeNfcUsername, type PublicNfcProfile } from "@/lib/publicNfcService";
import { toast } from "sonner";
import "./PublicNFCProfile.css";

/* ── helpers ── */
const linkify = (url: string): string => {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const buildGoogleMapsUrl = (address: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const getInitials = (name?: string): string => {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
};

/* ── vCard builder ── */
function createVCard(profile: PublicNfcProfile) {
  const fn = profile.name || profile.username || "";
  const address = profile.companyAddress || profile.address || "";
  const lines = [
    "BEGIN:VCARD", "VERSION:3.0",
    fn             ? `FN:${fn}`                                           : "",
    profile.name   ? `N:${profile.name}`                                  : "",
    profile.jobTitle    ? `TITLE:${profile.jobTitle}`                     : "",
    profile.companyName ? `ORG:${profile.companyName}`                    : "",
    profile.phone  ? `TEL;TYPE=CELL:${profile.phone}`                     : "",
    profile.email  ? `EMAIL;TYPE=INTERNET:${profile.email}`               : "",
    profile.website     ? `URL:${linkify(profile.website)}`               : "",
    address         ? `ADR;TYPE=WORK:;;${address.replace(/\n/g, ";")}`:"",
    "END:VCARD",
  ].filter(Boolean);

  const vcard    = lines.join("\r\n");
  const blob     = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const filename = `${profile.username || fn || "contact"}.vcf`;
  const file     = new File([blob], filename, { type: "text/vcard;charset=utf-8" });
  return { vcard, blob, file, filename };
}

/* ── social icon map ── */
const getSocialIcon = (label: string) => {
  const cls = "w-4 h-4";
  switch (label) {
    case "LinkedIn":     return <Linkedin  className={cls} />;
    case "X / Twitter":  return <Twitter   className={cls} />;
    case "Instagram":    return <Instagram className={cls} />;
    case "YouTube":      return <Youtube   className={cls} />;
    case "Facebook":     return <Facebook  className={cls} />;
    default:             return <LinkIcon  className={cls} />;
  }
};

/* ── project type helpers ── */
const getProjectTypeIcon = (type?: string) => {
  const cls = "w-3 h-3";
  switch (type) {
    case "video":       return <Video className={cls} />;
    case "brochure":    return <FileText className={cls} />;
    case "certificate": return <Award className={cls} />;
    default:            return <Image className={cls} />;
  }
};

const getProjectTypeLabel = (type?: string) => {
  switch (type) {
    case "video":       return "Video";
    case "brochure":    return "Brochure";
    case "certificate": return "Certificate";
    default:            return "Image";
  }
};

const getDocumentTypeLabel = (type?: string) => {
  switch (type) {
    case "catalogue":     return "Catalogue";
    case "resume":        return "Resume";
    case "presentation":  return "Presentation";
    default:              return "Company Profile PDF";
  }
};

/* ── detail icon map ── */
const DetailIcon = ({ type }: { type: "email" | "phone" | "website" | "address" }) => {
  const icons = { email: Mail, phone: Phone, website: Globe, address: MapPin };
  const Icon = icons[type];
  return (
    <div className="nfc-detail-icon">
      <Icon />
    </div>
  );
};

/* ── Share Back Modal ── */
interface ShareBackModalProps {
  cardOwnerUsername: string;
  cardOwnerName: string;
  onClose: () => void;
}

function ShareBackModal({ cardOwnerUsername, cardOwnerName, onClose }: ShareBackModalProps) {
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [phone,       setPhone]       = useState("");
  const [company,     setCompany]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const getPaymentApiBaseUrl = () => {
    const base = import.meta.env.VITE_PAYMENT_API_BASE_URL as string | undefined;
    return typeof base === "string" ? base.replace(/\/$/, "") : "";
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const baseUrl = getPaymentApiBaseUrl();
    if (!baseUrl) {
      toast.error("Service is temporarily unavailable.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/sendReverseContactEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardOwnerUsername,
          cardOwnerName,
          visitorName:    name.trim(),
          visitorEmail:   email.trim(),
          visitorPhone:   phone.trim()   || undefined,
          visitorCompany: company.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to send.");
      }

      setSubmitted(true);
      toast.success("Your info was shared! 🎉");
      setTimeout(onClose, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [name, email, phone, company, cardOwnerUsername, cardOwnerName, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="nfc-shareback-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Share your contact info back"
    >
      <div className="nfc-shareback-modal">

        {/* Close */}
        <button className="nfc-shareback-close" onClick={onClose} aria-label="Close">
          <XIcon size={16} />
        </button>

        {submitted ? (
          /* ── Success state ── */
          <div className="nfc-shareback-success">
            <div className="nfc-shareback-success-icon">🎉</div>
            <h2 className="nfc-shareback-success-title">Info Shared!</h2>
            <p className="nfc-shareback-success-text">
              <strong>{cardOwnerName}</strong> will receive your contact details shortly.
            </p>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="nfc-shareback-header">
              <div className="nfc-shareback-icon-wrap">
                <Send size={20} />
              </div>
              <h2 className="nfc-shareback-title">Share your info back</h2>
              <p className="nfc-shareback-subtitle">
                Let <strong>{cardOwnerName}</strong> know who you are. Your details will be sent directly to them.
              </p>
            </div>

            <form className="nfc-shareback-form" onSubmit={handleSubmit} noValidate>
              <div className="nfc-shareback-field">
                <label className="nfc-shareback-label" htmlFor="sb-name">Full Name <span aria-hidden="true">*</span></label>
                <input
                  id="sb-name"
                  className="nfc-shareback-input"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  autoFocus
                />
              </div>

              <div className="nfc-shareback-field">
                <label className="nfc-shareback-label" htmlFor="sb-email">Email Address <span aria-hidden="true">*</span></label>
                <input
                  id="sb-email"
                  className="nfc-shareback-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="nfc-shareback-field">
                <label className="nfc-shareback-label" htmlFor="sb-phone">Phone Number</label>
                <input
                  id="sb-phone"
                  className="nfc-shareback-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="nfc-shareback-field">
                <label className="nfc-shareback-label" htmlFor="sb-company">Company / Organisation</label>
                <input
                  id="sb-company"
                  className="nfc-shareback-input"
                  type="text"
                  placeholder="Your company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="nfc-shareback-actions">
                <button
                  type="submit"
                  className="nfc-shareback-submit-btn"
                  disabled={submitting || !name.trim() || !email.trim()}
                >
                  {submitting ? <Loader2 className="nfc-shareback-spinner" size={16} /> : <Send size={15} />}
                  {submitting ? "Sending…" : "Share My Info"}
                </button>
                <button type="button" className="nfc-shareback-skip-btn" onClick={onClose}>
                  Maybe Later
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
}


/* ── Share Sheet ── */
interface ShareSheetProps {
  url: string;
  name: string;
  onClose: () => void;
}

function ShareSheet({ url, name, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl  = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`Check out ${name}'s NFC business profile on PingME`);

  const apps = [
    {
      label: "WhatsApp",
      color: "#25D366",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.882l6.188-1.448A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.925 0-3.732-.511-5.291-1.403l-.379-.225-3.934.919.977-3.822-.246-.393A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm5.472-7.618c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        </svg>
      ),
    },
    {
      label: "Telegram",
      color: "#0088CC",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
    },
    {
      label: "Instagram",
      color: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
      href: `https://www.instagram.com/`,
      icon: (
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      ),
    },
    {
      label: "Facebook",
      color: "#1877F2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      label: "X / Twitter",
      color: "#000000",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      color: "#0077B5",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      label: "Email",
      color: "#EA4335",
      href: `mailto:?subject=${encodeURIComponent(`${name}'s NFC Profile`)}&body=${encodedText}%20${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
        </svg>
      ),
    },
    {
      label: "SMS",
      color: "#34B7F1",
      href: `sms:?body=${encodedText}%20${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      ),
    },
  ];

  const handleAppClick = useCallback((href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this profile link:", url);
    }
  }, [url]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="nfc-share-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Share profile">
      <div className="nfc-share-sheet">

        <div className="nfc-share-sheet-header">
          <div>
            <p className="nfc-share-sheet-title">Share profile</p>
            <p className="nfc-share-sheet-url">{url}</p>
          </div>
          <button className="nfc-share-close-btn" onClick={onClose} aria-label="Close share sheet">
            <XIcon />
          </button>
        </div>

        <div className="nfc-share-apps-grid">
          {apps.map((app) => (
            <button
              key={app.label}
              className="nfc-share-app-btn"
              onClick={() => handleAppClick(app.href)}
              aria-label={`Share via ${app.label}`}
            >
              <div className="nfc-share-app-icon" style={{ background: app.color }}>
                {app.icon}
              </div>
              <span className="nfc-share-app-label">{app.label}</span>
            </button>
          ))}
        </div>

        <div className="nfc-share-divider" />

        <div className="nfc-share-copy-row">
          <span className="nfc-share-copy-link">{url}</span>
          <button className="nfc-share-copy-btn" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
export default function PublicNFCProfile() {
  const { username: routeUsername } = useParams();
  const location = useLocation();

  // Robust username extraction: prioritize useParams, then fallback to pathname if needed
  const normalizedUsername = useMemo(() => {
    const raw = routeUsername || location.pathname.split('/').filter(Boolean).pop() || "";
    // Remove any hash if it somehow ended up in the path
    return normalizeNfcUsername(raw.replace("#", ""));
  }, [routeUsername, location.pathname]);

  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string>("");
  const [profile,        setProfile]        = useState<PublicNfcProfile | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareBackOpen,  setShareBackOpen]  = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await fetchPublicNfcProfile(normalizedUsername);
        if (!isCancelled) {
          setProfile(result);
          // Track NFC profile visit in background (non-blocking)
          const basePaymentUrl = (import.meta.env.VITE_PAYMENT_API_BASE_URL || "").replace(/\/$/, "");
          if (basePaymentUrl) {
            fetch(`${basePaymentUrl}/trackNfcVisit?username=${encodeURIComponent(normalizedUsername)}`, { method: "POST" })
              .catch(err => console.error("trackNfcVisit call failed", err));
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(getErrorMessage(err, "Unable to load profile."));
          setProfile(null);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    if (!normalizedUsername) { setLoading(false); setError("Invalid username."); return; }
    void load();
    return () => { isCancelled = true; };
  }, [normalizedUsername]);

  useEffect(() => {
    if (shareSheetOpen || shareBackOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [shareSheetOpen, shareBackOpen]);

  const tagList = useMemo(
    () => (profile?.businessTags || "").split(",").map((t) => t.trim()).filter(Boolean),
    [profile?.businessTags]
  );

  const subtitle = [profile?.jobTitle, profile?.companyName].filter(Boolean).join(" · ");

  const socialRows = [
    { label: "LinkedIn",    href: profile?.linkedin  },
    { label: "X / Twitter", href: profile?.twitter   },
    { label: "Instagram",   href: profile?.instagram },
    { label: "YouTube",     href: profile?.youtube   },
    { label: "Facebook",    href: profile?.facebook  },
  ].filter((s) => !!s.href);

  const hasContent =
    !!profile &&
    (!!profile.bio || !!profile.businessOverview || tagList.length > 0 || !!profile.email || !!profile.phone ||
     !!profile.website || !!profile.address || socialRows.length > 0 ||
     (profile.projects?.length || 0) > 0 || (profile.documents?.length || 0) > 0 ||
     !!profile.upiId || !!profile.razorpayLink || !!profile.appointmentBookingLink ||
     !!profile.companyAddress || !!profile.googleMapsLink);

  /* ── Save Contact ── */
  const handleSaveContact = async () => {
    if (!profile) return;
    const { vcard, file, filename } = createVCard(profile);

    const downloadVCard = () => {
      const a  = document.createElement("a");
      a.href   = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success("vCard downloaded");
    };

    const nav: any = navigator;
    let sharedSuccessfully = false;

    // Try file-share first (mobile browsers on HTTPS)
    if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: profile.name || profile.username });
        toast.success("Contact shared");
        sharedSuccessfully = true;
      } catch (err: any) {
        // Permission denied or unsupported — fall through to text share / download
      }
    }

    // Try text share (also on HTTPS)
    if (!sharedSuccessfully && typeof nav.share === "function") {
      try {
        await nav.share({ title: profile.name || profile.username, text: vcard });
        toast.success("Contact shared");
        sharedSuccessfully = true;
      } catch (err: any) {
        // Permission denied or unsupported — fall through to download
      }
    }

    // Final fallback: direct vCard download (always works)
    if (!sharedSuccessfully) {
      downloadVCard();
    }

    // After contact is saved, prompt visitor to share their info back
    setShareBackOpen(true);
  };


  /* ── Render ── */
  return (
    <div className="nfc-public-page">
      <main className="nfc-app-shell">

        <section className="nfc-card">

          <header className="nfc-card-header">
            <div className="nfc-header-top">
              <div className="nfc-avatar-wrap">
                {profile?.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt={profile.name || profile.username}
                    className="nfc-profile-photo"
                  />
                ) : (
                  <div className="nfc-avatar-placeholder">
                    {profile ? getInitials(profile.name || profile.username) : <Nfc size={28} />}
                  </div>
                )}
              </div>

              <div className="nfc-header-info">
                <p className="nfc-eyebrow">NFC Business Profile</p>
                <h1>{profile?.name || (loading ? "Loading…" : normalizedUsername || "NFC Profile")}</h1>
                {subtitle && <p className="nfc-sub-title">{subtitle}</p>}

                <div className="nfc-btn-row">
                  <button
                    className="nfc-save-btn"
                    disabled={!profile}
                    onClick={handleSaveContact}
                  >
                    <UserPlus />
                    Save Contact
                  </button>
                  {profile?.phone && (
                    <a
                      href={`tel:${profile.phone}`}
                      className="nfc-action-btn"
                    >
                      <Phone />
                      Call
                    </a>
                  )}
                  {profile?.phone && (
                    <a
                      href={`https://wa.me/${profile.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="nfc-action-btn nfc-whatsapp-btn"
                    >
                      <MessageCircle />
                      WhatsApp
                    </a>
                  )}
                  {profile?.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="nfc-action-btn"
                    >
                      <Mail />
                      Email
                    </a>
                  )}
                  <button
                    className="nfc-share-btn"
                    onClick={() => setShareSheetOpen(true)}
                  >
                    <Share2 />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </header>

          {loading && (
            <div className="nfc-loader-wrap">
              <div className="nfc-spinner" />
              <span className="nfc-loader-text">Loading profile…</span>
            </div>
          )}

          {!loading && error && (
            <div className="nfc-empty-state">
              <h2>Profile not available</h2>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && profile && !hasContent && (
            <div className="nfc-empty-state">
              <h2>Profile is empty</h2>
              <p>The owner hasn't added details yet. Check back soon.</p>
            </div>
          )}

          {!loading && !error && profile && hasContent && (
            <div className="nfc-profile-content">

              {(profile.bio || profile.businessOverview || tagList.length > 0) && (
                <div className="nfc-profile-section">
                  <p className="nfc-section-title">About Me / Company</p>
                  {profile.bio && <p className="nfc-bio">{profile.bio}</p>}
                  {profile.businessOverview && <p className="nfc-bio">{profile.businessOverview}</p>}
                  {tagList.length > 0 && (
                    <div className="nfc-chip-row">
                      {tagList.map((tag) => <span className="nfc-chip" key={tag}>{tag}</span>)}
                    </div>
                  )}
                </div>
              )}

              {(profile.email || profile.phone || profile.website || profile.address) && (
                <div className="nfc-profile-section">
                  <p className="nfc-section-title">Contact</p>
                  <ul className="nfc-detail-list">
                    {profile.email && (
                      <li className="nfc-detail-item">
                        <DetailIcon type="email" />
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Email</div>
                          <a href={`mailto:${profile.email}`} className="nfc-detail-value">{profile.email}</a>
                        </div>
                      </li>
                    )}
                    {profile.phone && (
                      <li className="nfc-detail-item">
                        <DetailIcon type="phone" />
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Phone</div>
                          <a href={`tel:${profile.phone}`} className="nfc-detail-value">{profile.phone}</a>
                        </div>
                      </li>
                    )}
                    {profile.website && (
                      <li className="nfc-detail-item">
                        <DetailIcon type="website" />
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Website</div>
                          <a href={linkify(profile.website)} target="_blank" rel="noreferrer" className="nfc-detail-value">
                            {profile.website}
                          </a>
                        </div>
                      </li>
                    )}
                    {profile.address && (
                      <li className="nfc-detail-item">
                        <DetailIcon type="address" />
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Address</div>
                          <a
                            href={buildGoogleMapsUrl(profile.address)}
                            target="_blank"
                            rel="noreferrer"
                            className="nfc-detail-value"
                          >
                            {profile.address}
                          </a>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {socialRows.length > 0 && (
                <div className="nfc-profile-section">
                  <p className="nfc-section-title">Social</p>
                  <div className="nfc-social-grid">
                    {socialRows.map((s) => (
                      <a
                        key={s.label}
                        href={linkify(s.href || "")}
                        target="_blank"
                        rel="noreferrer"
                        className="nfc-social-btn"
                      >
                        {getSocialIcon(s.label)}
                        {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {profile.projects && profile.projects.length > 0 && (
                <div className="nfc-profile-section">
                  <p className="nfc-section-title">Portfolio / Gallery</p>
                  <div className="nfc-projects-grid">
                    {profile.projects.map((project, i) => (
                      <article key={`${project.name}-${i}`} className="nfc-project-card">
                        {project.photo && (
                          <img src={project.photo} alt={project.name} className="nfc-project-photo" />
                        )}
                        <div className="nfc-project-body">
                          <div className="nfc-project-type-badge">
                            {getProjectTypeIcon(project.type)}
                            {getProjectTypeLabel(project.type)}
                          </div>
                          <h4>{project.name}</h4>
                          {project.description && <p>{project.description}</p>}
                          {project.link && (
                            <a href={linkify(project.link)} target="_blank" rel="noreferrer" className="nfc-project-link">
                              View →
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {profile.documents && profile.documents.length > 0 && (
                <div className="nfc-profile-section">
                  <p className="nfc-section-title">Documents</p>
                  <ul className="nfc-detail-list">
                    {profile.documents.map((doc, i) => (
                      <li key={i} className="nfc-detail-item">
                        <div className="nfc-detail-icon">
                          <FileText />
                        </div>
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">{getDocumentTypeLabel(doc.type)}</div>
                          <a href={linkify(doc.url)} target="_blank" rel="noreferrer" className="nfc-detail-value">
                            {doc.title}
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(profile.upiId || profile.razorpayLink || profile.appointmentBookingLink) && (
                <div className="nfc-profile-section">
                  <p className="nfc-section-title">Payment & Booking</p>
                  <ul className="nfc-detail-list">
                    {profile.upiId && (
                      <li className="nfc-detail-item">
                        <div className="nfc-detail-icon">
                          <CreditCard />
                        </div>
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">UPI</div>
                          {/Android|iPhone|iPad|iPod/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "") ? (
                            <a
                              href={`upi://pay?pa=${encodeURIComponent(profile.upiId)}&pn=${encodeURIComponent(profile.name || "")}`}
                              className="nfc-detail-value"
                            >
                              Pay Now
                            </a>
                          ) : (
                            <span className="nfc-detail-value">{profile.upiId}</span>
                          )}
                        </div>
                      </li>
                    )}
                    {profile.razorpayLink && (
                      <li className="nfc-detail-item">
                        <div className="nfc-detail-icon">
                          <CreditCard />
                        </div>
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Razorpay</div>
                          <a href={linkify(profile.razorpayLink)} target="_blank" rel="noreferrer" className="nfc-detail-value">
                            Pay Now
                          </a>
                        </div>
                      </li>
                    )}
                    {profile.appointmentBookingLink && (
                      <li className="nfc-detail-item">
                        <div className="nfc-detail-icon">
                          <Calendar />
                        </div>
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Appointment Booking</div>
                          <a href={linkify(profile.appointmentBookingLink)} target="_blank" rel="noreferrer" className="nfc-detail-value">
                            Book Appointment
                          </a>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {(profile.companyAddress || profile.googleMapsLink) && (
                <div className="nfc-profile-section">
                  <p className="nfc-section-title">Location</p>
                  <ul className="nfc-detail-list">
                    {profile.companyAddress && (
                      <li className="nfc-detail-item">
                        <div className="nfc-detail-icon">
                          <MapPin />
                        </div>
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Address</div>
                          <a
                            href={profile.googleMapsLink ? linkify(profile.googleMapsLink) : buildGoogleMapsUrl(profile.companyAddress)}
                            target="_blank"
                            rel="noreferrer"
                            className="nfc-detail-value"
                          >
                            {profile.companyAddress}
                          </a>
                        </div>
                      </li>
                    )}
                    {profile.googleMapsLink && !profile.companyAddress && (
                      <li className="nfc-detail-item">
                        <div className="nfc-detail-icon">
                          <MapPin />
                        </div>
                        <div className="nfc-detail-body">
                          <div className="nfc-detail-label">Google Maps</div>
                          <a href={linkify(profile.googleMapsLink)} target="_blank" rel="noreferrer" className="nfc-detail-value">
                            View on Map
                          </a>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              )}

            </div>
          )}
        </section>

        <footer className="nfc-footer">
          <p className="nfc-footer-text">
            Powered by <span className="nfc-footer-brand">PingME</span> — A Brand By Ping IFF LLP
          </p>
        </footer>

      </main>

      {shareSheetOpen && (
        <ShareSheet
          url={window.location.href}
          name={profile?.name || normalizedUsername || "NFC Profile"}
          onClose={() => setShareSheetOpen(false)}
        />
      )}

      {shareBackOpen && profile && (
        <ShareBackModal
          cardOwnerUsername={profile.username}
          cardOwnerName={profile.name || normalizedUsername || "this person"}
          onClose={() => setShareBackOpen(false)}
        />
      )}
    </div>
  );
}
