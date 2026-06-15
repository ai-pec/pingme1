import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { scrollToTop } from "@/components/SmoothScroll";
import MainLayout from "@/layouts/MainLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CheckCircle, ShoppingBag, MapPin, ArrowLeft,
  CreditCard, ChevronRight, Sparkles, Package, Shield,
  User, Phone, Mail, Home, Building2, Hash, Tag, X,
  Truck, Clock, FileText, Bookmark, BookmarkCheck,
  AlertCircle, CheckCircle2, Wallet, Landmark, Smartphone,
  Plus, Minus, Trash2, RotateCcw, Info, ChevronDown, ChevronUp,
  Receipt, Globe, Linkedin, Twitter, Instagram, Facebook,
  AtSign, Edit3, Eye, Link2, Camera, Zap, Star,
  Briefcase,
  ImageIcon,
  Youtube,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import NFCProfileBuilder from "@/components/NFCProfileBuilder";
import {
  createRazorpayOrder,
  downloadReceipt,
  openRazorpayCheckout,
  deleteNfcProfileDraft,
  verifyRazorpayPaymentAndCreatePrebooking,
} from "@/lib/paymentService";
import { resolveProductImageUrl } from "@/lib/productCatalog";
import { checkUsernameUniqueness, generateUsernameSuggestions } from "@/lib/publicNfcService";
import {
  expandNfcCartUnits,
  getNfcProfileDocId,
  isNfcLineProfileComplete,
  isNfcCartItem,
} from "@/lib/nfcCheckout";

/* ─────────────────────────── CONSTANTS ─────────────────────────────────── */

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu & Kashmir","Jharkhand",
  "Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Mizoram","Nagaland","New Delhi","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];

const VALID_COUPONS = {
  LAUNCH: { type: "percent", value: 15, label: "15% off — Launch special" },
};

const GST_RATE = 0.18;

const PAYMENT_METHODS = [
  { id: "upi",        icon: Smartphone,  label: "UPI",          sub: "GPay, PhonePe, Paytm" },
  { id: "card",       icon: CreditCard,  label: "Card",         sub: "Visa, Mastercard, RuPay" },
  { id: "netbanking", icon: Landmark,    label: "Net Banking",  sub: "All major banks" },
  { id: "wallet",     icon: Wallet,      label: "Wallets",      sub: "Paytm, MobiKwik & more" },
];

const SESSION_KEY = "pingme_checkout_draft";

const emptyNfcProfile = () => ({
  // Identity
  name: "", username: "", bio: "",
  // Professional
  companyName: "", jobTitle: "", businessOverview: "",
  // Contact
  email: "", phone: "", website: "",
  // Social Links
  linkedin: "", instagram: "", facebook: "", youtube: "", twitter: "",
  // Payment & Booking
  upiId: "", razorpayLink: "", appointmentBookingLink: "",
  // Location
  address: "", googleMapsLink: "",
  // Portfolio & Documents (arrays)
  projects: [] as Array<{ name: string; type: string; link: string; description: string }>,
  documents: [] as Array<{ title: string; url: string; type: string }>,
});

type DeliveryFieldKey = "fullName" | "phone" | "address" | "city" | "state" | "pincode";
type FormErrors   = Partial<Record<DeliveryFieldKey, string>>;
type TouchedFields = Partial<Record<DeliveryFieldKey, boolean>>;
type FieldProps = { label: string; required?: boolean; hint?: string; children: ReactNode; error?: string; optional?: boolean; };

/* ─────────────────────────── useIsMobile hook ───────────────────────────── */

const useIsMobile = () => {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 769 : false
  );
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 769);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
};

const useIsTablet = () => {
  const [tablet, setTablet] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1025 : false
  );
  useEffect(() => {
    const handler = () => setTablet(window.innerWidth < 1025);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return tablet;
};

/* ─────────────────────────── STYLES ────────────────────────────────────── */

const STYLES = `
  :root {
    --cream:       #FFF7E4;
    --cream-soft:  #FFF3D8;
    --gold:        #C9922A;
    --gold-light:  #E5B84A;
    --gold-pale:   #F0D080;
    --gold-dim:    #9A6B1A;
    --ink:         #1C1409;
    --ink-muted:   #6B5535;
    --ink-light:   #A08A5A;
    --border:      rgba(201,146,42,0.22);
    --border-soft: rgba(201,146,42,0.12);
    --shadow:      0 4px 24px rgba(180,120,20,0.09);
    --shadow-lg:   0 12px 48px rgba(180,120,20,0.14);
    --r:           14px;
    --r-sm:        8px;
    --error:       #dc2626;
    --success:     #16a34a;
  }

  .pb * { box-sizing: border-box; margin: 0; padding: 0; }
  .pb {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
  }

  /* ── LAYOUT ── */
  .pb-wrap {
    max-width: 1040px; margin: 0 auto;
    padding: 40px 24px 120px;
    display: flex; gap: 28px; align-items: flex-start;
  }
  .pb-main  { flex: 1; min-width: 0; }
  .pb-aside {
    width: 348px; flex-shrink: 0;
    position: sticky; top: 24px;
  }

  @media (max-width: 1024px) and (min-width: 769px) {
    .pb-wrap  { padding: 28px 20px 100px; gap: 20px; }
    .pb-aside { width: 300px; }
  }

  @media (max-width: 768px) {
    .pb-wrap  {
      flex-direction: column-reverse;
      padding: 16px 14px 90px;
      gap: 0;
    }
    .pb-aside {
      width: 100%;
      position: static;
      margin-bottom: 16px;
    }
    .pb-main { width: 100%; }
    .grid-2   { grid-template-columns: 1fr !important; gap: 10px !important; }
    .pm-grid  { grid-template-columns: 1fr 1fr !important; gap: 7px !important; }
  }

  @media (max-width: 380px) {
    .pb-wrap { padding: 12px 12px 90px; }
    .pm-grid { grid-template-columns: 1fr !important; }
  }

  /* ── STEP PROGRESS ── */
  .steps {
    display: flex; align-items: center;
    margin-bottom: 28px; overflow: hidden;
  }
  .step-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 500; color: var(--ink-light);
    white-space: nowrap;
  }
  .step-item.active { color: var(--ink); font-weight: 600; }
  .step-item.done   { color: var(--gold-dim); }
  .step-dot {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; flex-shrink: 0;
    background: rgba(201,146,42,0.1); color: var(--ink-light);
  }
  .step-item.active .step-dot { background: var(--ink); color: var(--cream); }
  .step-item.done   .step-dot { background: var(--gold); color: #fff; }
  .step-line { flex: 1; height: 1px; margin: 0 6px; background: var(--border-soft); min-width: 8px; }

  @media (max-width: 480px) {
    .step-label { display: none; }
    .step-item  { gap: 0; }
  }

  /* ── SECTION CARD ── */
  .section-card {
    background: rgba(255,255,255,0.55);
    border: 1.5px solid var(--border-soft);
    border-radius: var(--r);
    padding: 18px 16px;
    margin-bottom: 14px;
  }
  @media (max-width: 768px) {
    .section-card { padding: 14px 13px; border-radius: 12px; margin-bottom: 12px; }
  }
  .section-card-title {
    font-size: 11.5px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--gold-dim);
    margin-bottom: 14px;
    display: flex; align-items: center; gap: 7px;
  }
  .section-card-title svg { width: 13px; height: 13px; }

  /* ── FIELD ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field  { margin-bottom: 13px; }
  .field:last-child { margin-bottom: 0; }
  .field-label {
    font-size: 12px; font-weight: 600; color: var(--ink-muted);
    margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;
  }
  .field-label span { font-weight: 400; color: var(--ink-light); font-size: 11px; }
  .field-input {
    width: 100%; height: 44px;
    background: rgba(255,255,255,0.7);
    border: 1.5px solid var(--border);
    border-radius: var(--r-sm); padding: 0 12px;
    font-size: 14px; font-family: inherit; color: var(--ink);
    transition: border-color .18s, box-shadow .18s; outline: none;
    -webkit-appearance: none; appearance: none;
  }
  .field-input::placeholder { color: var(--ink-light); font-size: 13px; }
  .field-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(201,146,42,0.10);
    background: #fff;
  }
  .field-input.error { border-color: var(--error) !important; box-shadow: 0 0 0 3px rgba(220,38,38,.08) !important; }
  .field-input.valid { border-color: var(--success) !important; }
  textarea.field-input { height: auto; padding: 10px 12px; resize: vertical; min-height: 68px; }
  select.field-input   { cursor: pointer; }
  .field-error { font-size: 11px; color: var(--error); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
  .field-error svg { width: 11px; height: 11px; flex-shrink: 0; }
  .field-hint  { font-size: 11px; color: var(--ink-light); margin-top: 4px; }

  /* ── SAVED ADDRESS ── */
  .saved-addr-list { display: flex; flex-direction: column; gap: 8px; }
  .saved-addr-btn {
    width: 100%; text-align: left;
    padding: 11px 13px; border-radius: var(--r-sm);
    border: 1.5px solid var(--border-soft);
    background: rgba(255,247,228,0.6);
    cursor: pointer; transition: all .18s ease; font-family: inherit;
  }
  .saved-addr-btn:hover   { border-color: var(--gold); background: #fff; }
  .saved-addr-btn.selected { border-color: var(--gold); background: #fff; box-shadow: 0 0 0 3px rgba(201,146,42,.08); }
  .saved-addr-main { font-size: 13px; font-weight: 500; color: var(--ink); display: block; }
  .saved-addr-sub  { font-size: 11.5px; color: var(--ink-muted); margin-top: 1px; display: block; }

  /* ── TOGGLE ── */
  .toggle-row {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: var(--r-sm);
    background: rgba(201,146,42,0.06);
    border: 1.5px solid var(--border-soft);
    cursor: pointer; user-select: none; transition: border-color .18s;
  }
  .toggle-row:hover { border-color: var(--gold); }
  .toggle-box {
    width: 18px; height: 18px; border-radius: 5px;
    border: 1.5px solid var(--border); background: #fff;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s; flex-shrink: 0;
  }
  .toggle-box.checked { background: var(--gold); border-color: var(--gold); }
  .toggle-label { font-size: 13px; font-weight: 500; color: var(--ink); }

  /* ── PINCODE ── */
  .pincode-wrap { position: relative; }
  .pincode-badge {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 99px;
    pointer-events: none;
  }
  .pincode-badge.loading { background: rgba(201,146,42,.12); color: var(--gold-dim); }
  .pincode-badge.found   { background: rgba(22,163,74,.1); color: var(--success); }
  .pincode-badge.error   { background: rgba(220,38,38,.1); color: var(--error); }

  /* ── COUPON ── */
  .coupon-row { display: flex; gap: 0; }
  .coupon-row .field-input { border-radius: var(--r-sm) 0 0 var(--r-sm); border-right: 0; flex: 1; }
  .coupon-apply {
    height: 44px; padding: 0 18px;
    background: var(--ink); color: var(--cream);
    border: 1.5px solid var(--ink);
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    font-size: 13px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: background .18s; white-space: nowrap; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .coupon-apply:hover:not(:disabled)    { background: #2e2010; }
  .coupon-apply:disabled { opacity: .5; cursor: not-allowed; }
  .coupon-applied {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 13px; border-radius: var(--r-sm);
    background: rgba(22,163,74,.08); border: 1.5px solid rgba(22,163,74,.2);
    font-size: 13px; gap: 8px;
  }
  .coupon-applied-left { display: flex; align-items: center; gap: 7px; color: var(--success); font-weight: 600; min-width: 0; }
  .coupon-remove {
    background: none; border: none; cursor: pointer; color: var(--ink-light);
    display: flex; padding: 4px; border-radius: 4px; transition: color .15s; flex-shrink: 0;
  }
  .coupon-remove:hover { color: var(--error); }
  .coupon-suggestions { margin-top: 10px; }
  .coupon-suggestions p { font-size: 11px; color: var(--ink-muted); margin-bottom: 6px; }
  .coupon-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .coupon-chip {
    padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600;
    background: rgba(201,146,42,0.1); color: var(--gold-dim);
    border: 1px solid var(--border); cursor: pointer; font-family: monospace; transition: all .15s;
  }
  .coupon-chip:hover { background: var(--gold-pale); border-color: var(--gold); }

  /* ── PAYMENT METHOD ── */
  .pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pm-option {
    padding: 11px 12px; border-radius: var(--r-sm);
    border: 1.5px solid var(--border-soft); background: rgba(255,255,255,0.5);
    cursor: pointer; transition: all .18s;
    display: flex; align-items: center; gap: 9px; font-family: inherit;
    text-align: left;
  }
  .pm-option:hover  { border-color: var(--gold-pale); background: rgba(255,255,255,0.8); }
  .pm-option.active {
    border-color: var(--gold); background: #fff;
    box-shadow: 0 0 0 3px rgba(201,146,42,.08);
  }
  .pm-icon {
    width: 32px; height: 32px; border-radius: 7px;
    background: rgba(201,146,42,0.08);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: var(--gold-dim);
  }
  .pm-option.active .pm-icon { background: var(--gold); color: #fff; }
  .pm-label { font-size: 12.5px; font-weight: 600; color: var(--ink); }
  .pm-sub   { font-size: 10px; color: var(--ink-muted); margin-top: 1px; }
  .pm-radio {
    width: 15px; height: 15px; border-radius: 50%;
    border: 1.5px solid var(--border); margin-left: auto; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .pm-option.active .pm-radio { border-color: var(--gold); }
  .pm-radio-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); opacity: 0; transition: opacity .15s; }
  .pm-option.active .pm-radio-dot { opacity: 1; }

  /* ── NFC HUB ── */
  .nfc-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 13px 14px; border-radius: var(--r-sm);
    border: 1.5px solid var(--border-soft); background: rgba(255,255,255,0.5);
    transition: all .18s; margin-bottom: 9px; flex-wrap: wrap;
  }
  .nfc-row:hover { border-color: var(--gold-pale); background: rgba(255,255,255,0.8); }
  .nfc-row-info h4 { font-size: 13px; font-weight: 600; color: var(--ink); }
  .nfc-row-info p  { font-size: 11.5px; color: var(--ink-muted); margin-top: 2px; }
  .badge-ready {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600;
    background: rgba(22,163,74,.1); color: var(--success); border: 1px solid rgba(22,163,74,.18);
  }
  .badge-pending {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600;
    background: rgba(234,179,8,.1); color: #92400e; border: 1px solid rgba(234,179,8,.2);
  }
  .btn-nfc-setup {
    padding: 7px 13px; border-radius: var(--r-sm);
    font-size: 12px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: all .18s; border: 1.5px solid; white-space: nowrap;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .btn-nfc-setup.ready   { background: transparent; color: var(--ink-muted); border-color: var(--border); }
  .btn-nfc-setup.ready:hover { border-color: var(--gold); color: var(--ink); }
  .btn-nfc-setup.pending { background: var(--ink); color: var(--cream); border-color: var(--ink); box-shadow: 0 3px 10px rgba(28,20,9,.18); }
  .btn-nfc-setup.pending:hover { background: #2e2010; }

  /* ── ORDER SUMMARY CARD ── */
  .summary-card {
    background: rgba(255,255,255,0.65);
    border: 1.5px solid var(--border);
    border-radius: 16px; padding: 18px;
    box-shadow: var(--shadow-lg);
  }
  @media (max-width: 768px) {
    .summary-card {
      border-radius: 13px; padding: 0;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
  }
  .summary-toggle-header { display: none; }
  @media (max-width: 768px) {
    .summary-toggle-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 15px; cursor: pointer; user-select: none;
      background: rgba(255,255,255,0.65);
    }
    .summary-body-mobile { padding: 0 15px 15px; }
  }
  .summary-title {
    font-size: 14px; font-weight: 700; color: var(--ink);
    display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
    padding-bottom: 12px; border-bottom: 1px solid var(--border-soft);
  }
  @media (max-width: 768px) { .summary-title { margin-bottom: 12px; } }
  .summary-title svg { color: var(--gold); }
  .order-item { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 11px; }
  .order-thumb {
    width: 46px; height: 46px; border-radius: 9px;
    background: rgba(201,146,42,0.07); border: 1px solid var(--border-soft);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
  }
  .order-thumb img { max-width: 80%; max-height: 80%; object-fit: contain; }
  .order-item-info { flex: 1; min-width: 0; }
  .order-item-info h4 { font-size: 12.5px; font-weight: 600; color: var(--ink); line-height: 1.3; }
  .order-item-info p  { font-size: 11px; color: var(--ink-muted); margin-top: 2px; }
  .order-item-price   { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; }

  .qty-ctrl { display: flex; align-items: center; gap: 5px; margin-top: 5px; }
  .qty-btn {
    width: 22px; height: 22px; border-radius: 5px; border: 1px solid var(--border);
    background: rgba(255,247,228,0.8); cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; color: var(--ink-muted);
    transition: all .15s;
  }
  .qty-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--ink); background: #fff; }
  .qty-btn:disabled { opacity: .35; cursor: not-allowed; }
  .qty-btn.remove { color: var(--error); border-color: rgba(220,38,38,.2); }
  .qty-btn.remove:hover { background: rgba(220,38,38,.07); border-color: var(--error); }
  .qty-val { font-size: 12px; font-weight: 600; color: var(--ink); min-width: 16px; text-align: center; }

  .price-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; color: var(--ink-muted); margin-bottom: 6px;
  }
  .price-row .val { color: var(--ink); font-weight: 500; }
  .price-row.free .val { color: var(--success); font-weight: 600; }
  .price-row.discount .val { color: var(--success); font-weight: 600; }
  .price-total {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 16px; font-weight: 700; color: var(--ink);
    padding-top: 10px; margin-top: 4px; border-top: 1.5px solid var(--border);
  }
  .price-total .amt { color: var(--gold-dim); font-size: 18px; }

  .delivery-estimate {
    margin-top: 12px; padding: 10px 12px;
    background: rgba(201,146,42,0.07);
    border: 1px solid var(--border-soft); border-radius: var(--r-sm);
    display: flex; align-items: flex-start; gap: 8px; font-size: 12px;
  }
  .delivery-estimate svg { color: var(--gold); flex-shrink: 0; margin-top: 1px; }
  .delivery-estimate strong { color: var(--ink); }
  .delivery-estimate p { color: var(--ink-muted); margin-top: 1px; line-height: 1.45; }

  .trust-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px solid var(--border-soft); }
  .trust-item { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--ink-muted); }
  .trust-item svg { color: var(--gold); width: 12px; height: 12px; flex-shrink: 0; }

  /* ── STICKY BOTTOM CTA ── */
  .sticky-cta { display: none; }
  @media (max-width: 768px) {
    .sticky-cta {
      display: flex;
      position: fixed; bottom: 0; left: 0; right: 0;
      z-index: 50;
      background: rgba(255,247,228,0.96);
      border-top: 1.5px solid var(--border);
      padding: 12px 16px 16px;
      gap: 10px; align-items: center;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .sticky-cta-total { font-size: 13px; color: var(--ink-muted); line-height: 1.1; }
    .sticky-cta-total strong { display: block; font-size: 17px; color: var(--ink); font-weight: 700; }
    .btn-primary-inline { display: none; }
  }
  @media (min-width: 769px) {
    .sticky-cta { display: none !important; }
    .btn-primary-inline { display: flex; }
  }

  /* ── BUTTONS ── */
  .btn-primary {
    width: 100%; height: 50px;
    background: var(--ink);
    border: none; border-radius: var(--r);
    color: var(--cream); font-family: inherit;
    font-size: 14.5px; font-weight: 600;
    cursor: pointer; transition: all .2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(28,20,9,.2);
    -webkit-tap-highlight-color: transparent;
  }
  .btn-primary:hover:not(:disabled) { background: #2e2010; box-shadow: 0 8px 24px rgba(28,20,9,.28); transform: translateY(-1px); }
  .btn-primary:active:not(:disabled) { transform: none; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; transform: none; }

  .btn-primary-compact {
    flex: 1; height: 48px;
    background: var(--ink); border: none; border-radius: 12px;
    color: var(--cream); font-family: inherit;
    font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all .2s;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    box-shadow: 0 4px 16px rgba(28,20,9,.25);
    -webkit-tap-highlight-color: transparent;
  }
  .btn-primary-compact:disabled { opacity: .55; cursor: not-allowed; }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 20px; height: 44px; border-radius: var(--r);
    background: rgba(255,247,228,0.8); color: var(--ink);
    border: 1.5px solid var(--border); font-family: inherit;
    font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .18s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-secondary:hover { border-color: var(--gold); background: #fff; }

  .btn-back {
    display: inline-flex; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    font-size: 13px; color: var(--ink-muted); padding: 0; margin-bottom: 16px;
    font-family: inherit; transition: color .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-back:hover { color: var(--ink); }

  /* ── PAGE HEADER ── */
  .pb-header { margin-bottom: 20px; }
  .pb-header h1 { font-size: clamp(19px,3vw,25px); font-weight: 700; color: var(--ink); line-height: 1.2; }
  .pb-header p  { font-size: 13px; color: var(--ink-muted); margin-top: 4px; line-height: 1.5; }

  /* ── SUCCESS ── */
  .success-wrap { max-width: 460px; margin: 0 auto; text-align: center; padding: 48px 20px; }
  .success-ring {
    width: 76px; height: 76px; border-radius: 50%; margin: 0 auto 22px;
    background: rgba(22,163,74,.1); border: 2px solid rgba(22,163,74,.2);
    display: flex; align-items: center; justify-content: center;
    animation: popIn .4s cubic-bezier(.34,1.56,.64,1) both;
  }
  .success-ring svg { color: var(--success); }
  .success-wrap h1 { font-size: clamp(22px,4vw,28px); font-weight: 700; color: var(--ink); margin-bottom: 8px; }
  .success-wrap p  { font-size: 14px; color: var(--ink-muted); line-height: 1.6; margin-bottom: 6px; }
  .success-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 22px; }
  .success-meta {
    margin-top: 20px; padding: 15px;
    background: rgba(255,255,255,.6); border: 1px solid var(--border-soft);
    border-radius: var(--r); text-align: left;
  }
  .success-meta p { font-size: 12.5px; color: var(--ink-muted); line-height: 1.6; }
  .success-meta strong { color: var(--ink); }

  /* ── EMPTY ── */
  .empty-wrap { max-width: 380px; margin: 0 auto; text-align: center; padding: 56px 20px; }
  .empty-icon {
    width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 18px;
    background: rgba(201,146,42,.07); border: 1.5px dashed var(--border);
    display: flex; align-items: center; justify-content: center;
  }
  .empty-icon svg { color: var(--ink-light); }
  .empty-wrap h1 { font-size: clamp(20px,4vw,24px); font-weight: 700; color: var(--ink); margin-bottom: 8px; }
  .empty-wrap p  { font-size: 14px; color: var(--ink-muted); margin-bottom: 18px; line-height: 1.6; }

  /* ── DIVIDER ── */
  .divider { height: 1px; background: var(--border-soft); margin: 12px 0; }

  /* ── ANIMATIONS ── */
  .fade-up { animation: fadeUp .28s ease both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

  /* ════════════════════════════════════════════════
     NFC PROFILE EDITOR — IMPROVED UI
  ════════════════════════════════════════════════ */

  /* Two-column: form on left, live preview on right */
  .nfc-editor-wrap {
    display: grid;
    grid-template-columns: 1fr 296px;
    gap: 20px;
    align-items: flex-start;
  }
  @media (max-width: 860px) {
    .nfc-editor-wrap { grid-template-columns: 1fr; }
  }

  /* ── Avatar + name identity hero ── */
  .nfc-identity-hero {
    background: linear-gradient(135deg, rgba(201,146,42,0.08) 0%, rgba(255,247,228,0.5) 100%);
    border: 1.5px solid var(--border);
    border-radius: var(--r);
    padding: 18px 16px;
    margin-bottom: 14px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  @media (max-width: 480px) {
    .nfc-identity-hero { flex-direction: column; align-items: center; }
  }

  .nfc-avatar-ring {
    width: 72px; height: 72px; border-radius: 50%;
    background: rgba(201,146,42,0.1);
    border: 2px dashed var(--border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; position: relative; cursor: pointer;
    transition: border-color .18s, background .18s;
    overflow: hidden;
  }
  .nfc-avatar-ring:hover { border-color: var(--gold); background: rgba(201,146,42,.15); }
  .nfc-avatar-initials {
    font-size: 22px; font-weight: 700; color: var(--gold-dim);
    line-height: 1; user-select: none;
  }
  .nfc-avatar-overlay {
    position: absolute; inset: 0;
    background: rgba(28,20,9,0.52);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity .15s; border-radius: 50%;
  }
  .nfc-avatar-ring:hover .nfc-avatar-overlay { opacity: 1; }
  .nfc-identity-fields { flex: 1; min-width: 0; }
  .nfc-identity-fields .field { margin-bottom: 10px; }
  .nfc-identity-fields .field:last-child { margin-bottom: 0; }

  /* Username with @ prefix */
  .username-input-wrap { position: relative; display: flex; align-items: center; }
  .username-prefix {
    position: absolute; left: 12px;
    font-size: 14px; font-weight: 600; color: var(--ink-muted);
    pointer-events: none; user-select: none; z-index: 1;
  }
  .username-input-wrap .field-input { padding-left: 26px; }
  .username-status-icon {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    display: flex; align-items: center;
  }

  /* ── Progress bar ── */
  .nfc-progress-bar-wrap {
    margin-bottom: 14px;
    padding: 11px 14px;
    background: rgba(255,255,255,0.5);
    border: 1.5px solid var(--border-soft);
    border-radius: var(--r-sm);
    display: flex; align-items: center; gap: 12px;
  }
  .nfc-progress-track {
    flex: 1; height: 6px; background: rgba(201,146,42,0.12);
    border-radius: 99px; overflow: hidden;
  }
  .nfc-progress-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, var(--gold-dim), var(--gold-light));
    transition: width .4s cubic-bezier(.4,0,.2,1);
  }
  .nfc-progress-label { font-size: 11.5px; font-weight: 700; color: var(--gold-dim); white-space: nowrap; }

  /* ── Social link rows ── */
  .social-link-row {
    display: flex; align-items: center; gap: 0;
    margin-bottom: 10px;
  }
  .social-link-row:last-child { margin-bottom: 0; }
  .social-platform-pill {
    height: 44px; min-width: 44px; padding: 0 11px;
    border-radius: var(--r-sm) 0 0 var(--r-sm);
    border: 1.5px solid var(--border); border-right: 0;
    background: rgba(201,146,42,0.07);
    display: flex; align-items: center; justify-content: center; gap: 5px;
    flex-shrink: 0;
  }
  .social-platform-pill svg { width: 15px; height: 15px; }
  .social-link-row .field-input {
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    flex: 1;
  }
  .social-li svg  { color: #0a66c2; }
  .social-tw svg  { color: #1da1f2; }
  .social-ig svg  { color: #e1306c; }
  .social-fb svg  { color: #1877f2; }
  .social-web svg { color: var(--gold-dim); }

  /* Section sub-text */
  .nfc-section-sub {
    font-size: 12px; color: var(--ink-muted); margin-bottom: 14px; line-height: 1.55;
  }

  /* ── Live Preview Panel ── */
  .nfc-preview-panel { position: sticky; top: 24px; }
  @media (max-width: 860px) { .nfc-preview-panel { position: static; } }

  .nfc-preview-label {
    font-size: 11px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--ink-light);
    margin-bottom: 10px;
    display: flex; align-items: center; gap: 6px;
  }
  .nfc-preview-label svg { color: var(--gold); }

  /* Dark card */
  .nfc-card-preview {
    background: linear-gradient(145deg, #1c1409 0%, #2c1a08 60%, #1c1409 100%);
    border-radius: 20px;
    padding: 22px 20px 20px;
    position: relative; overflow: hidden;
    box-shadow: 0 20px 56px rgba(28,20,9,.4), 0 0 0 1.5px rgba(201,146,42,.18);
  }
  .nfc-card-preview::before {
    content: '';
    position: absolute; top: -50px; right: -50px;
    width: 140px; height: 140px; border-radius: 50%;
    background: radial-gradient(circle, rgba(201,146,42,.2) 0%, transparent 70%);
    pointer-events: none;
  }
  .nfc-card-preview::after {
    content: '';
    position: absolute; bottom: -30px; left: 20px;
    width: 100px; height: 100px; border-radius: 50%;
    background: radial-gradient(circle, rgba(201,146,42,.1) 0%, transparent 70%);
    pointer-events: none;
  }
  .nfc-preview-chip {
    width: 30px; height: 22px; border-radius: 5px;
    background: linear-gradient(135deg, #c9922a 0%, #f0d080 50%, #c9922a 100%);
    margin-bottom: 16px;
    box-shadow: 0 2px 6px rgba(201,146,42,.3);
  }
  .nfc-preview-name {
    font-size: 18px; font-weight: 700; color: #fff;
    line-height: 1.2; margin-bottom: 3px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .nfc-preview-handle {
    font-size: 12px; color: rgba(201,146,42,.75); font-weight: 500;
    margin-bottom: 11px; font-family: 'SF Mono', 'Fira Code', monospace;
    letter-spacing: .02em;
  }
  .nfc-preview-bio {
    font-size: 11.5px; color: rgba(255,255,255,.55);
    line-height: 1.5; margin-bottom: 14px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .nfc-preview-placeholder { color: rgba(255,255,255,.2); font-style: italic; }
  .nfc-preview-divider { height: 1px; background: rgba(201,146,42,.14); margin-bottom: 12px; }
  .nfc-preview-links { display: flex; flex-wrap: wrap; gap: 6px; }
  .nfc-preview-link-pill {
    padding: 4px 10px; border-radius: 99px;
    background: rgba(201,146,42,.12); border: 1px solid rgba(201,146,42,.22);
    font-size: 10.5px; color: rgba(201,146,42,.85); font-weight: 600;
    display: flex; align-items: center; gap: 4px;
  }
  .nfc-preview-link-pill svg { width: 10px; height: 10px; }
  .nfc-preview-footer {
    margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(201,146,42,.12);
    display: flex; align-items: center; justify-content: space-between;
  }
  .nfc-preview-footer-brand {
    font-size: 9px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: rgba(201,146,42,.4);
  }

  /* ── Completeness checklist below preview ── */
  .nfc-checklist {
    margin-top: 14px; padding: 13px 14px;
    background: rgba(255,255,255,0.5);
    border: 1.5px solid var(--border-soft);
    border-radius: var(--r-sm);
  }
  .nfc-checklist-title {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--ink-light); margin-bottom: 9px;
  }
  .nfc-check-item {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: var(--ink-muted); margin-bottom: 6px;
  }
  .nfc-check-item:last-child { margin-bottom: 0; }
  .nfc-check-dot {
    width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .nfc-check-dot.done   { background: rgba(22,163,74,.14); color: var(--success); }
  .nfc-check-dot.undone { background: rgba(201,146,42,.07); color: transparent; border: 1.5px dashed rgba(201,146,42,.25); }
  .nfc-check-item.done-item { color: var(--ink); }

  /* ── Save button area ── */
  .nfc-editor-actions { display: flex; gap: 10px; margin-top: 16px; }
  .nfc-editor-actions .btn-primary { flex: 1; }
`;

/* ─────────────────────────── HELPERS ───────────────────────────────────── */

function getDeliveryEstimate() {
  const now = new Date();
  const s = new Date(now); s.setDate(s.getDate() + 5);
  const e = new Date(now); e.setDate(e.getDate() + 7);
  const fmt = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(s)} – ${fmt(e)}`;
}

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function calcProfileCompletion(p: ReturnType<typeof emptyNfcProfile>) {
  const items = [
    { label: "Name",             done: !!p.name?.trim() },
    { label: "Bio",              done: !!p.bio?.trim() },
    { label: "Phone",            done: !!p.phone?.trim() },
    { label: "Email",            done: !!p.email?.trim() },
    { label: "Social / Website", done: !!(p.website || p.linkedin || p.twitter || p.instagram || p.facebook || (p as any).youtube) },
    { label: "Business Info",    done: !!(((p as any).companyName || (p as any).jobTitle || (p as any).businessOverview)) },
    { label: "Payment / Booking",done: !!(((p as any).upiId || (p as any).razorpayLink || (p as any).appointmentBookingLink)) },
    { label: "Location",         done: !!(((p as any).address || (p as any).googleMapsLink)) },
    { label: "Portfolio",        done: !!(p.projects?.length) },
    { label: "Documents",        done: !!(p.documents?.length) },
  ];
  const done = items.filter(i => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}

/* ─────────────────────────── SUB-COMPONENTS ────────────────────────────── */

function StepTrack({ current }) {
  const steps = [
    { key: "profileHub", label: "NFC Profiles" },
    { key: "delivery",   label: "Delivery"     },
    { key: "payment",    label: "Payment"      },
  ];
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? "1" : "auto" }}>
          <div className={`step-item ${i === idx ? "active" : i < idx ? "done" : ""}`}>
            <div className="step-dot">{i < idx ? "✓" : i + 1}</div>
            <span className="step-label" style={{ marginLeft: 6 }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, required, hint, children, error, optional }: FieldProps) {
  return (
    <div className="field">
      <div className="field-label">
        {label}
        {required && <span style={{ color: "var(--error)", marginLeft: 2 }}>*</span>}
        {optional && <span>Optional</span>}
      </div>
      {children}
      {error && <div className="field-error"><AlertCircle size={11} />{error}</div>}
      {hint && !error && <div className="field-hint">{hint}</div>}
    </div>
  );
}

function CheckToggle({ checked, onChange, label, icon: Icon }) {
  return (
    <div className="toggle-row" onClick={() => onChange(!checked)} role="checkbox" aria-checked={checked} tabIndex={0}
      onKeyDown={(e) => e.key === " " && onChange(!checked)}>
      <div className={`toggle-box ${checked ? "checked" : ""}`}>
        {checked && <CheckCircle2 size={11} color="#fff" />}
      </div>
      {Icon && <Icon size={14} color="var(--gold-dim)" />}
      <span className="toggle-label">{label}</span>
    </div>
  );
}

/* ─── Live NFC Card Preview ─── */
function NfcCardPreview({ profile }: { profile: ReturnType<typeof emptyNfcProfile> }) {
  const hasName   = !!profile.name?.trim();
  const hasHandle = !!profile.username?.trim();
  const hasBio    = !!profile.bio?.trim();
  const socialLinks = [
    profile.website   && { icon: Globe,     label: "Website"   },
    profile.linkedin  && { icon: Linkedin,  label: "LinkedIn"  },
    profile.twitter   && { icon: Twitter,   label: "Twitter"   },
    profile.instagram && { icon: Instagram, label: "Instagram" },
    profile.facebook  && { icon: Facebook,  label: "Facebook"  },
    (profile as any).youtube && { icon: Youtube, label: "YouTube" },
  ].filter(Boolean) as { icon: any; label: string }[];

  const { pct, items } = calcProfileCompletion(profile);

  return (
    <div className="nfc-preview-panel">
      <div className="nfc-preview-label">
        <Eye size={12} />Live Preview
      </div>

      <div className="nfc-card-preview">
        <div className="nfc-preview-chip" />
        <div className="nfc-preview-name">
          {hasName
            ? profile.name
            : <span className="nfc-preview-placeholder">Your Name</span>}
        </div>
        <div className="nfc-preview-handle" style={{ color: hasHandle ? "rgba(201,146,42,.75)" : "rgba(201,146,42,.25)" }}>
          @{hasHandle ? profile.username : "username"}
        </div>
        <div className="nfc-preview-bio">
          {hasBio
            ? profile.bio
            : <span className="nfc-preview-placeholder">Your short bio appears here…</span>}
        </div>
        {socialLinks.length > 0 && (
          <>
            <div className="nfc-preview-divider" />
            <div className="nfc-preview-links">
              {socialLinks.map((l, i) => (
                <span key={i} className="nfc-preview-link-pill">
                  <l.icon size={10} />{l.label}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="nfc-preview-footer">
          <span className="nfc-preview-footer-brand">PingME · NFC</span>
          <Zap size={16} style={{ color: "rgba(201,146,42,.35)" }} />
        </div>
      </div>

      {/* Completeness checklist */}
      <div className="nfc-checklist">
        <div className="nfc-checklist-title">Profile completeness — {pct}%</div>
        <div style={{ height: 5, background: "rgba(201,146,42,.1)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--gold-dim), var(--gold-light))", borderRadius: 99, transition: "width .4s ease" }} />
        </div>
        {items.map((item, i) => (
          <div key={i} className={`nfc-check-item ${item.done ? "done-item" : ""}`}>
            <div className={`nfc-check-dot ${item.done ? "done" : "undone"}`}>
              {item.done && <CheckCircle2 size={10} />}
            </div>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Improved Inline NFC Profile Editor ─── */
function NfcProfileEditor({
  profile, onChange, onBack, onSave, isSaving, title, subtitle,
}: {
  profile: ReturnType<typeof emptyNfcProfile>;
  onChange: (p: ReturnType<typeof emptyNfcProfile>) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  title: string;
  subtitle: string;
}) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...profile, [key]: e.target.value });

  const isComplete = isNfcLineProfileComplete(profile);
  const { pct } = calcProfileCompletion(profile);

  const socialFields = [
    { key: "linkedin",  icon: Linkedin,  cls: "social-li",  placeholder: "linkedin.com/in/yourname",   label: "LinkedIn"   },
    { key: "instagram", icon: Instagram, cls: "social-ig",  placeholder: "instagram.com/yourhandle",  label: "Instagram"  },
    { key: "facebook",  icon: Facebook,  cls: "social-fb",  placeholder: "facebook.com/yourname",      label: "Facebook"   },
    { key: "youtube",   icon: Youtube,   cls: "social-yt",  placeholder: "youtube.com/@yourchannel",   label: "YouTube"    },
    { key: "twitter",   icon: Twitter,   cls: "social-tw",  placeholder: "x.com/yourhandle",           label: "X / Twitter"},
    { key: "website",   icon: Globe,     cls: "social-web", placeholder: "yourwebsite.com",            label: "Website"    },
  ];

  const addProject = () =>
    onChange({ ...profile, projects: [...(profile.projects || []), { name: "", type: "image", link: "", description: "" }] });
  const updateProject = (i: number, key: string, val: string) =>
    onChange({ ...profile, projects: (profile.projects || []).map((p, idx) => idx === i ? { ...p, [key]: val } : p) });
  const removeProject = (i: number) =>
    onChange({ ...profile, projects: (profile.projects || []).filter((_, idx) => idx !== i) });

  const addDocument = () =>
    onChange({ ...profile, documents: [...(profile.documents || []), { title: "", url: "", type: "company_profile" }] });
  const updateDocument = (i: number, key: string, val: string) =>
    onChange({ ...profile, documents: (profile.documents || []).map((d, idx) => idx === i ? { ...d, [key]: val } : d) });
  const removeDocument = (i: number) =>
    onChange({ ...profile, documents: (profile.documents || []).filter((_, idx) => idx !== i) });

  return (
    <div className="fade-up">
      <button className="btn-back" onClick={onBack}>
        <ArrowLeft size={13} />Back to NFC Cards
      </button>

      <div className="pb-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {/* Compact progress bar */}
      <div className="nfc-progress-bar-wrap">
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", flexShrink: 0 }}>
          Profile strength
        </span>
        <div className="nfc-progress-track">
          <div className="nfc-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="nfc-progress-label">{pct}%</span>
      </div>

      <div className="nfc-editor-wrap">
        {/* ── LEFT COLUMN: Form ── */}
        <div>
          {/* Identity block with avatar */}
          <div className="section-card">
            <div className="section-card-title"><User />Identity</div>
            <p className="nfc-section-sub">
              This is how you appear when someone taps your NFC card.
            </p>

            <div className="nfc-identity-hero">
              {/* Avatar circle with initials */}
              <div className="nfc-avatar-ring" title="Profile photo (coming soon)">
                <span className="nfc-avatar-initials">{getInitials(profile.name)}</span>
                <div className="nfc-avatar-overlay">
                  <Camera size={14} color="rgba(255,255,255,0.8)" />
                </div>
              </div>

              <div className="nfc-identity-fields">
                <Field label="Display Name" required>
                  <input
                    className="field-input"
                    placeholder="e.g. Arjun Sharma"
                    value={profile.name}
                    onChange={set("name")}
                  />
                </Field>
              </div>
            </div>

            <Field label="Bio" optional>
              <textarea
                className="field-input"
                placeholder="One sentence about yourself — e.g. Designer & coffee enthusiast based in Bengaluru ☕"
                value={profile.bio}
                onChange={set("bio")}
                rows={2}
                style={{ minHeight: 58 }}
              />
            </Field>
          </div>

          {/* Contact block */}
          <div className="section-card">
            <div className="section-card-title"><Phone />Contact Info</div>
            <div className="grid-2">
              <Field label="Phone" optional>
                <input className="field-input" placeholder="+91 9876543210"
                  value={profile.phone} onChange={set("phone")} inputMode="tel" />
              </Field>
              <Field label="Email" optional>
                <input className="field-input" type="email" placeholder="you@example.com"
                  value={profile.email} onChange={set("email")} inputMode="email" />
              </Field>
            </div>
          </div>

          {/* Social links block */}
          <div className="section-card">
            <div className="section-card-title"><Link2 />Social Links</div>
            <p className="nfc-section-sub">Links appear as tappable pills on your profile page.</p>
            {socialFields.map(({ key, icon: Icon, cls, placeholder, label }) => (
              <div key={key} className="social-link-row">
                <div className={`social-platform-pill ${cls}`} title={label}>
                  <Icon size={15} />
                </div>
                <input
                  className="field-input"
                  placeholder={placeholder}
                  value={(profile as any)[key] || ""}
                  onChange={(e) => onChange({ ...profile, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {/* Business info block */}
          <div className="section-card">
            <div className="section-card-title"><Briefcase />Business Info</div>
            <div className="grid-2">
              <Field label="Company Name" optional>
                <input className="field-input" placeholder="Acme Corp"
                  value={(profile as any).companyName || ""} onChange={set("companyName")} />
              </Field>
              <Field label="Job Title" optional>
                <input className="field-input" placeholder="Product Designer"
                  value={(profile as any).jobTitle || ""} onChange={set("jobTitle")} />
              </Field>
            </div>
            <Field label="Business Overview" optional>
              <textarea className="field-input"
                placeholder="Describe your business, products, or services..."
                value={(profile as any).businessOverview || ""} onChange={set("businessOverview")}
                rows={3} style={{ minHeight: 70 }} />
            </Field>
          </div>

          {/* Portfolio / Gallery block */}
          <div className="section-card">
            <div className="section-card-title"><ImageIcon />Portfolio / Gallery</div>
            <p className="nfc-section-sub">Add images, videos, brochures, or certificates to showcase your work.</p>
            {(profile.projects || []).map((proj, i) => (
              <div key={i} style={{ border: "1px solid var(--border-color, #e5e7eb)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, position: "relative", background: "#fafafa" }}>
                <button onClick={() => removeProject(i)} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }} title="Remove">×</button>
                <div className="grid-2" style={{ marginBottom: 8 }}>
                  <Field label="Title" optional>
                    <input className="field-input" placeholder="e.g. Product Brochure"
                      value={proj.name} onChange={e => updateProject(i, "name", e.target.value)} />
                  </Field>
                  <Field label="Type" optional>
                    <select className="field-input" value={proj.type} onChange={e => updateProject(i, "type", e.target.value)}
                      style={{ height: 38 }}>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="brochure">Brochure</option>
                      <option value="certificate">Certificate</option>
                    </select>
                  </Field>
                </div>
                <Field label="Link / URL" optional>
                  <input className="field-input" placeholder="https://drive.google.com/..."
                    value={proj.link} onChange={e => updateProject(i, "link", e.target.value)} />
                </Field>
                <Field label="Description" optional>
                  <input className="field-input" placeholder="Brief description..."
                    value={proj.description} onChange={e => updateProject(i, "description", e.target.value)} />
                </Field>
              </div>
            ))}
            <button onClick={addProject} style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-gold, #C8820A)", background: "none", border: "1.5px dashed var(--brand-gold, #C8820A)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", width: "100%", marginTop: 4 }}>
              + Add Portfolio Item
            </button>
          </div>

          {/* Documents block */}
          <div className="section-card">
            <div className="section-card-title"><FileText />Documents</div>
            <p className="nfc-section-sub">Share company profile, catalogue, resume, or presentations.</p>
            {(profile.documents || []).map((doc, i) => (
              <div key={i} style={{ border: "1px solid var(--border-color, #e5e7eb)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, position: "relative", background: "#fafafa" }}>
                <button onClick={() => removeDocument(i)} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }} title="Remove">×</button>
                <div className="grid-2" style={{ marginBottom: 8 }}>
                  <Field label="Document Title" optional>
                    <input className="field-input" placeholder="e.g. Company Profile"
                      value={doc.title} onChange={e => updateDocument(i, "title", e.target.value)} />
                  </Field>
                  <Field label="Type" optional>
                    <select className="field-input" value={doc.type} onChange={e => updateDocument(i, "type", e.target.value)}
                      style={{ height: 38 }}>
                      <option value="company_profile">Company Profile</option>
                      <option value="catalogue">Catalogue</option>
                      <option value="resume">Resume</option>
                      <option value="presentation">Presentation</option>
                    </select>
                  </Field>
                </div>
                <Field label="Link / URL" optional>
                  <input className="field-input" placeholder="https://drive.google.com/..."
                    value={doc.url} onChange={e => updateDocument(i, "url", e.target.value)} />
                </Field>
              </div>
            ))}
            <button onClick={addDocument} style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-gold, #C8820A)", background: "none", border: "1.5px dashed var(--brand-gold, #C8820A)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", width: "100%", marginTop: 4 }}>
              + Add Document
            </button>
          </div>

          {/* Payment & Booking block */}
          <div className="section-card">
            <div className="section-card-title"><CreditCard />Payment &amp; Booking</div>
            <p className="nfc-section-sub">Let people pay or book appointments directly from your NFC card.</p>
            <Field label="UPI ID" optional>
              <input className="field-input" placeholder="yourname@upi"
                value={(profile as any).upiId || ""} onChange={set("upiId")} />
            </Field>
            <Field label="Razorpay Payment Link" optional>
              <input className="field-input" placeholder="https://rzp.io/l/yourlink"
                value={(profile as any).razorpayLink || ""} onChange={set("razorpayLink")} />
            </Field>
            <Field label="Appointment Booking Link" optional>
              <input className="field-input" placeholder="https://calendly.com/yourname"
                value={(profile as any).appointmentBookingLink || ""} onChange={set("appointmentBookingLink")} />
            </Field>
          </div>

          {/* Location block */}
          <div className="section-card">
            <div className="section-card-title"><MapPin />Location</div>
            <Field label="Address" optional>
              <textarea className="field-input"
                placeholder="123, MG Road, Sector 5, Chandigarh - 160001"
                value={(profile as any).address || ""} onChange={set("address")}
                rows={2} style={{ minHeight: 58 }} />
            </Field>
            <Field label="Google Maps Link" optional>
              <input className="field-input" placeholder="https://maps.google.com/?q=..."
                value={(profile as any).googleMapsLink || ""} onChange={set("googleMapsLink")} />
            </Field>
          </div>

          {/* Actions */}
          <div className="nfc-editor-actions">
            <button
              className="btn-primary btn-primary-inline"
              onClick={onSave}
              disabled={isSaving || !isComplete}
            >
              {isSaving
                ? <Loader2 size={16} className="animate-spin" />
                : <><CheckCircle2 size={15} /><span>Save &amp; Return to Cards</span></>}
            </button>
          </div>

          {!isComplete && (
            <p style={{ fontSize: 11.5, color: "var(--error)", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <AlertCircle size={12} />Name is required before saving.
            </p>
          )}
        </div>

        {/* ── RIGHT COLUMN: Live preview ── */}
        <NfcCardPreview profile={profile} />
      </div>
    </div>
  );
}

/* ─── Collapsible mobile order summary ─── */
function OrderSummaryCard({
  items, appliedCoupon, discountAmt, subtotal, finalTotal,
  gstAmt, updateQuantity, removeFromCart, submitting,
  nfcCartUnits, nfcProfilesByLine, step, isMobile,
}) {
  const [open, setOpen] = useState(false);

  const innerContent = (
    <>
      <div style={{ maxHeight: isMobile ? (open ? 220 : 0) : 260, overflow: "auto", transition: "max-height .3s ease", paddingRight: 2, marginBottom: isMobile && !open ? 0 : 12 }}>
        {items.map(item => (
          <div key={item.id} className="order-item">
            <div className="order-thumb">
              {resolveProductImageUrl(item.image)
                ? <img src={resolveProductImageUrl(item.image)} alt={item.title} loading="lazy" />
                : <span style={{ fontSize: 19 }}>{item.emoji}</span>}
            </div>
            <div className="order-item-info">
              <h4>{item.title}</h4>
              {isNfcCartItem(item) && step !== "profileHub" && (
                <div style={{ marginTop: 3 }}>
                  {expandNfcCartUnits([item]).map(unit => {
                    const done = isNfcLineProfileComplete(nfcProfilesByLine[unit.lineKey]);
                    return (
                      <span key={unit.lineKey} style={{ fontSize: 10.5, color: done ? "var(--success)" : "#92400e", display: "block" }}>
                        {unit.displayTitle}: {done ? "✓ Ready" : "Pending"}
                      </span>
                    );
                  })}
                </div>
              )}
              {typeof updateQuantity === "function" && (
                <div className="qty-ctrl">
                  <button className={`qty-btn${item.quantity === 1 ? " remove" : ""}`}
                    onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                    disabled={submitting}>
                    {item.quantity === 1 ? <Trash2 size={10} /> : <Minus size={10} />}
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={submitting}>
                    <Plus size={10} />
                  </button>
                </div>
              )}
            </div>
            <div className="order-item-price">{item.price}</div>
          </div>
        ))}
      </div>

      {(!isMobile || open) && (
        <>
          <div className="divider" />
          <div className="price-row"><span>Subtotal</span><span className="val">₹{subtotal.toFixed(2)}</span></div>
          {appliedCoupon && (
            <div className="price-row discount">
              <span>Coupon ({appliedCoupon.code})</span>
              <span className="val">−₹{discountAmt.toFixed(2)}</span>
            </div>
          )}
          <div className="price-row free"><span>Delivery</span><span className="val">Free</span></div>
          <div className="price-total"><span>Total</span><span className="amt">₹{finalTotal.toFixed(2)}</span></div>
          <div className="delivery-estimate">
            <Truck size={14} />
            <div>
              <strong>Estimated Delivery</strong>
              <p>{getDeliveryEstimate()} · Standard shipping</p>
            </div>
          </div>
          <div className="trust-list">
            <div className="trust-item"><Shield />Razorpay secure checkout</div>
            <div className="trust-item"><Package />Pan-India Delivery</div>
            <div className="trust-item"><RotateCcw />Easy returns within 7 days</div>
            <div className="trust-item"><Sparkles />NFC activated on delivery</div>
          </div>
        </>
      )}
    </>
  );

  if (!isMobile) {
    return (
      <div className="summary-card">
        <div className="summary-title">
          <ShoppingBag size={16} />
          Order Summary
          <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 500, color: "var(--ink-muted)" }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        {innerContent}
      </div>
    );
  }

  return (
    <div className="summary-card">
      <div className="summary-toggle-header" onClick={() => setOpen(p => !p)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShoppingBag size={15} style={{ color: "var(--gold)" }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
            {open ? "Order Summary" : `${items.length} item${items.length !== 1 ? "s" : ""} — ₹${finalTotal.toFixed(2)}`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!open && appliedCoupon && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", background: "rgba(22,163,74,.08)", border: "1px solid rgba(22,163,74,.18)", padding: "2px 7px", borderRadius: 99 }}>
              −₹{discountAmt.toFixed(0)}
            </span>
          )}
          {open ? <ChevronUp size={16} style={{ color: "var(--ink-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--ink-muted)" }} />}
        </div>
      </div>
      {open && (
        <div className="summary-body-mobile fade-up">
          {innerContent}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────────────── */

const Prebook = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  useEffect(() => { scrollToTop(); }, []);

  const { items, cartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const { user, profile } = useAuth();

  /* ── Delivery form ── */
  const [fullName,   setFullName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [address,    setAddress]    = useState("");
  const [city,       setCity]       = useState("");
  const [state,      setState]      = useState("");
  const [pincode,    setPincode]    = useState("");
  const [orderNote,  setOrderNote]  = useState("");

  /* ── Validation ── */
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  /* ── NFC state ── */
  const nfcCartUnits        = useMemo(() => expandNfcCartUnits(items), [items]);
  const hasNFCCards         = nfcCartUnits.length > 0;
  const showProfileBuilding = hasNFCCards;

  /* ── Flow ── */
  const [step,              setStep]              = useState(() => hasNFCCards ? "profileHub" : "delivery");
  const [activeLineKey,     setActiveLineKey]     = useState(null);
  const [nfcProfilesByLine, setNfcProfilesByLine] = useState({});
  const [submitting,        setSubmitting]        = useState(false);
  const [success,           setSuccess]           = useState(false);
  const [receiptOrder,      setReceiptOrder]      = useState(null);
  const [invoiceEmail,      setInvoiceEmail]      = useState("");

  /* ── Extra features ── */
  const [couponInput,       setCouponInput]       = useState("");
  const [appliedCoupon,     setAppliedCoupon]     = useState(null);
  const [couponLoading,     setCouponLoading]     = useState(false);
  const [couponError,       setCouponError]       = useState("");
  const [paymentMethod,     setPaymentMethod]     = useState("upi");
  const [saveAddress,       setSaveAddress]       = useState(false);
  const [selectedSavedAddr, setSelectedSavedAddr] = useState(null);
  const [pincodeStatus,     setPincodeStatus]     = useState(null);

  const pincodeTimer = useRef(null);

  const activeUnit             = nfcCartUnits.find(u => u.lineKey === activeLineKey);
  const allNfcProfilesComplete = nfcCartUnits.every(u => isNfcLineProfileComplete(nfcProfilesByLine[u.lineKey]));

  /* ── Pricing ── */
  const subtotal    = cartTotal;
  const discountAmt = appliedCoupon
    ? appliedCoupon.type === "percent"
      ? Math.round(subtotal * appliedCoupon.value) / 100
      : appliedCoupon.value
    : 0;
  const taxableAmt = Math.max(0, subtotal - discountAmt);
  const gstAmt     = parseFloat((taxableAmt * GST_RATE).toFixed(2));
  const finalTotal = parseFloat((taxableAmt).toFixed(2));

  /* ── Session restore ── */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.fullName)  setFullName(d.fullName);
        if (d.email)     setEmail(d.email);
        if (d.phone)     setPhone(d.phone);
        if (d.address)   setAddress(d.address);
        if (d.city)      setCity(d.city);
        if (d.state)     setState(d.state);
        if (d.pincode)   setPincode(d.pincode);
        if (d.orderNote) setOrderNote(d.orderNote);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ fullName, email, phone, address, city, state, pincode, orderNote }));
    } catch {}
  }, [fullName, email, phone, address, city, state, pincode, orderNote]);

  /* ── Prefill from auth ── */
  useEffect(() => {
    if (profile) {
      if (profile.displayName && !fullName) setFullName(profile.displayName);
      if (profile.email       && !email)    setEmail(profile.email);
      if (profile.mobile      && !phone)    setPhone(profile.mobile);
    }
  }, [profile]);

  /* ── Pincode lookup ── */
  useEffect(() => {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) { setPincodeStatus(null); return; }
    clearTimeout(pincodeTimer.current);
    setPincodeStatus("loading");
    pincodeTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        if (data?.[0]?.Status === "Success") {
          const po = data[0].PostOffice?.[0];
          if (po) {
            if (!city)  setCity(po.District || "");
            if (!state) setState(po.State   || "");
            setPincodeStatus("found");
            setErrors(p => ({ ...p, pincode: undefined, city: undefined, state: undefined }));
          }
        } else { setPincodeStatus("error"); }
      } catch { setPincodeStatus("error"); }
    }, 600);
    return () => clearTimeout(pincodeTimer.current);
  }, [pincode]);

  /* ── Validation ── */
  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {};
    if (!fullName.trim())                               e.fullName = "Full name is required";
    if (!phone.trim())                                  e.phone    = "Phone number is required";
    else if (!/^[+]?[\d\s-]{10,}$/.test(phone.trim())) e.phone    = "Enter a valid phone number";
    if (!address.trim())                                e.address  = "Street address is required";
    if (!city.trim())                                   e.city     = "City is required";
    if (!state)                                         e.state    = "Select a state";
    if (!pincode.trim())                                e.pincode  = "Pincode is required";
    else if (!/^\d{6}$/.test(pincode.trim()))           e.pincode  = "Enter a valid 6-digit pincode";
    return e;
  }, [fullName, phone, address, city, state, pincode]);

  const handleBlur = (f: DeliveryFieldKey) => setTouched(p => ({ ...p, [f]: true }));

  const fieldClass = (f: DeliveryFieldKey) => {
    if (!touched[f]) return "field-input";
    return errors[f] ? "field-input error" : "field-input valid";
  };

  /* ── Coupon ── */
  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError("Enter a coupon code"); return; }
    setCouponLoading(true); setCouponError("");
    setTimeout(() => {
      const found = VALID_COUPONS[code];
      if (found) {
        setAppliedCoupon({ code, ...found });
        setCouponInput("");
        toast({ title: "Coupon applied!", description: found.label });
      } else { setCouponError("Invalid or expired coupon code"); }
      setCouponLoading(false);
    }, 600);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null); setCouponError("");
    toast({ title: "Coupon removed" });
  };

  /* ── Saved address ── */
  const handleApplySavedAddress = (addr) => {
    setAddress(addr.fullAddress || ""); setCity(addr.city || "");
    setState(addr.state || ""); setPincode(addr.pincode || "");
    setSelectedSavedAddr(addr.id);
    toast({ title: "Address applied" });
  };

  /* ── NFC helpers ── */
  const seedLineProfile = (lineKey, unitIndex, dName, dEmail, dPhone) => {
    const base   = dName.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
    const suffix = unitIndex > 0 ? String(unitIndex + 1) : "";
    return { ...emptyNfcProfile(), name: dName.trim(), email: dEmail.trim(), phone: dPhone.trim(), username: `${base}${suffix}` };
  };

  const openProfileEditor = (lineKey) => {
    const unit = nfcCartUnits.find(u => u.lineKey === lineKey);
    if (!unit) return;
    setNfcProfilesByLine(prev => {
      if (prev[lineKey]) return prev;
      return { ...prev, [lineKey]: seedLineProfile(lineKey, unit.unitIndex, fullName.trim(), email.trim(), phone.trim()) };
    });
    setActiveLineKey(lineKey);
    setStep("profileEdit");
  };

  const handleProfileSave = () => {
    if (!activeLineKey) return;
    if (!isNfcLineProfileComplete(nfcProfilesByLine[activeLineKey])) return;
    setActiveLineKey(null);
    setStep("profileHub");
  };

  /* ── Delivery submit ── */
  const handleDeliverySubmit = (e) => {
    e.preventDefault();
    setTouched({ fullName: true, phone: true, address: true, city: true, state: true, pincode: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) { toast({ title: "Please fix the errors below", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    setStep("payment");
  };

  /* ── Payment ── */
  const handlePayment = async () => {
    if (showProfileBuilding && !allNfcProfilesComplete) {
      toast({ title: "Profiles incomplete", description: "Set up each NFC profile before paying.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    if (showProfileBuilding) {
      const unames = nfcCartUnits.map(u => nfcProfilesByLine[u.lineKey]?.username?.trim().toLowerCase()).filter(Boolean);
      if (new Set(unames).size !== unames.length) {
        toast({ title: "Duplicate usernames", description: "Each NFC card needs a unique username.", variant: "destructive" });
        setSubmitting(false); return;
      }
    }
    try {
      const nfcLineProfiles = showProfileBuilding
        ? nfcCartUnits.map(u => ({ lineKey: u.lineKey, itemId: u.itemId, title: u.title, nfcProfile: nfcProfilesByLine[u.lineKey] }))
        : undefined;
      const prebookingPayload = {
        items, totalAmount: finalTotal,
        fullName: fullName.trim(), email: email.trim(), phone: phone.trim(),
        address: address.trim(), city: city.trim(), state, pincode: pincode.trim(),
        orderNote: orderNote.trim() || undefined, paymentMethod,
        coupon: appliedCoupon ? { code: appliedCoupon.code, discount: discountAmt } : undefined,
        gst: gstAmt, status: "confirmed" as const, userId: user?.uid,
        ...(nfcLineProfiles ? { nfcLineProfiles } : {}),
        ...(nfcCartUnits.length === 1 && nfcLineProfiles ? { nfcProfile: nfcProfilesByLine[nfcCartUnits[0].lineKey] } : {}),
      };
      const order = await createRazorpayOrder({
        amount: Math.round(finalTotal * 100), currency: "INR",
        receipt: `pingme_${Date.now()}`,
        notes: { userId: user?.uid || "guest", coupon: appliedCoupon?.code || "" },
      });
      if (showProfileBuilding) {
        for (const unit of nfcCartUnits) {
          const lp = nfcProfilesByLine[unit.lineKey];
          if (!lp?.username) continue;
          try {
            const docId = getNfcProfileDocId(order.orderId, unit.lineKey);
            const taken = await checkUsernameUniqueness(lp.username, docId);
            if (taken) {
              const suggestions = await generateUsernameSuggestions(lp.name || lp.username);
              toast({ title: `Username taken (${unit.displayTitle})`, description: `Try: ${suggestions.join(", ")}`, variant: "destructive" });
              setSubmitting(false); return;
            }
          } catch {
            toast({ title: "Verification failed", description: "Could not verify username.", variant: "destructive" });
            setSubmitting(false); return;
          }
        }
      }
      await openRazorpayCheckout({
        keyId: order.keyId, orderId: order.orderId,
        amount: order.amount, currency: order.currency,
        fullName: fullName.trim(), email: email.trim(), phone: phone.trim(),
        onSuccess: async (resp) => {
          try {
            const completed = {
              ...prebookingPayload,
              payment: {
                gateway: "razorpay" as const, orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature,
                amount: order.amount, currency: order.currency,
                paidAt: new Date().toISOString(), method: paymentMethod,
              },
            };
            await verifyRazorpayPaymentAndCreatePrebooking({
              orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature, prebooking: completed,
            });
            setReceiptOrder(completed);
            setInvoiceEmail(email.trim());
            sessionStorage.removeItem(SESSION_KEY);
            setSuccess(true);
            clearCart();
          } catch (err) {
            toast({ title: "Payment verification failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
            navigate("/booking");
          } finally { setSubmitting(false); }
        },
        onDismiss: () => {
          if (showProfileBuilding)
            for (const unit of nfcCartUnits)
              void deleteNfcProfileDraft(getNfcProfileDocId(order.orderId, unit.lineKey)).catch(() => {});
          setSubmitting(false);
          toast({ title: "Payment cancelled", description: "You can retry anytime." });
          navigate("/booking");
        },
      });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  const stickyCtaLabel = step === "profileHub"
    ? "Continue to Delivery"
    : step === "delivery"
      ? "Continue to Payment"
      : `Pay ₹${finalTotal.toFixed(2)}`;

  /* ─── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{STYLES}</style>
      <MainLayout>
        <div className="pb">

          {/* ══ SUCCESS ══════════════════════════════════════════════════════ */}
          {success && (
            <div className="success-wrap fade-up">
              <div className="success-ring"><CheckCircle size={34} /></div>
              <h1>Booking Confirmed!</h1>
              <p>Your invoice will be sent to <strong>{invoiceEmail || email}</strong>.</p>
              <p>We'll reach out shortly with delivery details.</p>
              <div className="success-meta">
                <p><strong>Estimated delivery:</strong> {getDeliveryEstimate()}</p>
                <p style={{ marginTop: 6 }}><strong>Amount paid:</strong> ₹{receiptOrder?.totalAmount?.toFixed(2)}{receiptOrder?.coupon && ` (₹${receiptOrder.coupon.discount} coupon applied)`}</p>
                {receiptOrder?.orderNote && <p style={{ marginTop: 6 }}><strong>Note:</strong> {receiptOrder.orderNote}</p>}
              </div>
              <div className="success-btns">
                {receiptOrder && (
                  <button className="btn-primary" style={{ padding: "0 24px" }} onClick={() => downloadReceipt(receiptOrder, invoiceEmail)}>
                    <Receipt size={15} /> Download Invoice
                  </button>
                )}
                <button className="btn-secondary" onClick={() => navigate("/profile")}>My Profile</button>
                <button className="btn-secondary" onClick={() => navigate("/products")}>Shop More</button>
              </div>
            </div>
          )}

          {/* ══ EMPTY CART ════════════════════════════════════════════════════ */}
          {!success && items.length === 0 && (
            <div className="empty-wrap fade-up">
              <div className="empty-icon"><ShoppingBag size={28} /></div>
              <h1>Cart is Empty</h1>
              <p>Add a PingME product to your cart before checking out.</p>
              <button className="btn-primary" style={{ padding: "0 28px" }} onClick={() => navigate("/products")}>
                Browse Products
              </button>
            </div>
          )}

          {/* ══ CHECKOUT ══════════════════════════════════════════════════════ */}
          {!success && items.length > 0 && (
            <div className="pb-wrap">

              {/* ── RIGHT: Order Summary (hidden during profile edit to maximise space) ── */}
              {step !== "profileEdit" && (
                <div className="pb-aside">
                  <OrderSummaryCard
                    items={items}
                    appliedCoupon={appliedCoupon}
                    discountAmt={discountAmt}
                    subtotal={subtotal}
                    finalTotal={finalTotal}
                    gstAmt={gstAmt}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                    submitting={submitting}
                    nfcCartUnits={nfcCartUnits}
                    nfcProfilesByLine={nfcProfilesByLine}
                    step={step}
                    isMobile={isMobile}
                  />
                </div>
              )}

              {/* ── LEFT: Steps ──────────────────────────────────────────── */}
              <div className="pb-main">

                {/* ■ STEP 1: NFC PROFILE HUB */}
                {step === "profileHub" && (
                  <div className="fade-up">
                    <StepTrack current="profileHub" />
                    <div className="pb-header">
                      <h1>NFC Profile Setup</h1>
                      <p>Each NFC card gets its own public profile link — set it up before we ship.</p>
                    </div>
                    <div className="section-card">
                      <div className="section-card-title"><Sparkles />Your NFC Cards</div>
                      {nfcCartUnits.map(unit => {
                        const lp       = nfcProfilesByLine[unit.lineKey];
                        const complete = isNfcLineProfileComplete(lp);
                        return (
                          <div key={unit.lineKey} className="nfc-row">
                            <div className="nfc-row-info">
                              <h4>{unit.displayTitle}</h4>
                              {complete && lp?.username
                                ? <p>@{lp.username}</p>
                                : <p style={{ color: "#92400e" }}>Profile not set up yet</p>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <span className={complete ? "badge-ready" : "badge-pending"}>
                                {complete ? "✓ Ready" : "Pending"}
                              </span>
                              <button
                                className={`btn-nfc-setup ${complete ? "ready" : "pending"}`}
                                onClick={() => openProfileEditor(unit.lineKey)}
                              >
                                {complete
                                  ? <><Edit3 size={11} />Edit</>
                                  : "Set Up →"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className="btn-primary btn-primary-inline"
                      disabled={submitting || !allNfcProfilesComplete}
                      onClick={() => setStep("delivery")}
                      style={{ marginTop: 16 }}
                    >
                      {submitting
                        ? <Loader2 size={17} className="animate-spin" />
                        : <><span>Continue to Delivery</span><ChevronRight size={15} /></>}
                    </button>
                    {!allNfcProfilesComplete && (
                      <p style={{ fontSize: 11.5, color: "var(--ink-light)", marginTop: 8, textAlign: "center" }}>
                        Complete all profiles above to continue
                      </p>
                    )}
                  </div>
                )}

                {/* ■ PROFILE EDIT — improved editor */}
                {step === "profileEdit" && activeLineKey && activeUnit && (
                  <div>
                    <StepTrack current="profileHub" />
                    <NfcProfileEditor
                      profile={nfcProfilesByLine[activeLineKey] || emptyNfcProfile()}
                      onChange={data => setNfcProfilesByLine(prev => ({ ...prev, [activeLineKey]: data }))}
                      onBack={() => { setActiveLineKey(null); setStep("profileHub"); }}
                      onSave={handleProfileSave}
                      isSaving={submitting}
                      title={`Build Profile — ${activeUnit.displayTitle}`}
                      subtitle={`This profile will be embedded in your ${activeUnit.title}. Pick a unique @username.`}
                    />
                  </div>
                )}

                {/* ■ STEP 2: DELIVERY */}
                {step === "delivery" && (
                  <div className="fade-up">
                    <StepTrack current="delivery" />
                    {showProfileBuilding && (
                      <button className="btn-back" onClick={() => setStep("profileHub")}>
                        <ArrowLeft size={13} />Back to NFC Setup
                      </button>
                    )}
                    <div className="pb-header">
                      <h1>Delivery Details</h1>
                      <p>Tell us where to send your PingME product.</p>
                    </div>

                    {user && profile?.addresses?.length > 0 && (
                      <div className="section-card">
                        <div className="section-card-title"><MapPin />Use a Saved Address</div>
                        <div className="saved-addr-list">
                          {profile.addresses.map(addr => (
                            <button key={addr.id} type="button"
                              className={`saved-addr-btn ${selectedSavedAddr === addr.id ? "selected" : ""}`}
                              onClick={() => handleApplySavedAddress(addr)}>
                              <span className="saved-addr-main">{addr.fullAddress}</span>
                              <span className="saved-addr-sub">{addr.city}, {addr.state} — {addr.pincode}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <form id="delivery-form" onSubmit={handleDeliverySubmit} noValidate>
                      <div className="section-card">
                        <div className="section-card-title"><User />Contact Information</div>
                        <Field label="Full Name" required error={touched.fullName ? errors.fullName : undefined}>
                          <input className={fieldClass("fullName")} placeholder="Your full name"
                            value={fullName} onChange={e => setFullName(e.target.value)}
                            onBlur={() => { handleBlur("fullName"); setErrors(v => ({ ...v, fullName: !fullName.trim() ? "Full name is required" : undefined })); }} />
                        </Field>
                        <div className="grid-2">
                          <Field label="Email">
                            <input className="field-input" type="email" placeholder="you@example.com"
                              value={email} onChange={e => setEmail(e.target.value)} inputMode="email" />
                          </Field>
                          <Field label="Phone" required error={touched.phone ? errors.phone : undefined}>
                            <input className={fieldClass("phone")} placeholder="+91 9876543210"
                              value={phone} onChange={e => setPhone(e.target.value)}
                              onBlur={() => handleBlur("phone")} inputMode="tel" />
                          </Field>
                        </div>
                      </div>

                      <div className="section-card">
                        <div className="section-card-title"><Home />Shipping Address</div>
                        <Field label="Street Address" required error={touched.address ? errors.address : undefined}>
                          <input className={fieldClass("address")} placeholder="House no., Street, Locality"
                            value={address} onChange={e => setAddress(e.target.value)} onBlur={() => handleBlur("address")} />
                        </Field>
                        <Field label="Pincode" required error={touched.pincode ? errors.pincode : undefined}
                          hint={pincodeStatus === "found" ? "✓ City & state auto-filled" : undefined}>
                          <div className="pincode-wrap">
                            <input className={fieldClass("pincode")} placeholder="e.g. 160012"
                              value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              onBlur={() => handleBlur("pincode")} maxLength={6} inputMode="numeric" />
                            {pincodeStatus === "loading" && <span className="pincode-badge loading">Looking up…</span>}
                            {pincodeStatus === "found"   && <span className="pincode-badge found">✓ Found</span>}
                            {pincodeStatus === "error"   && <span className="pincode-badge error">Not found</span>}
                          </div>
                        </Field>
                        <div className="grid-2">
                          <Field label="City" required error={touched.city ? errors.city : undefined}>
                            <input className={fieldClass("city")} placeholder="City"
                              value={city} onChange={e => setCity(e.target.value)} onBlur={() => handleBlur("city")} />
                          </Field>
                          <Field label="State" required error={touched.state ? errors.state : undefined}>
                            <select className={fieldClass("state")} value={state}
                              onChange={e => setState(e.target.value)} onBlur={() => handleBlur("state")}>
                              <option value="">Select State</option>
                              {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </Field>
                        </div>
                        {user && (
                          <div style={{ marginTop: 12 }}>
                            <CheckToggle checked={saveAddress} onChange={setSaveAddress}
                              icon={saveAddress ? BookmarkCheck : Bookmark}
                              label="Save this address to my profile" />
                          </div>
                        )}
                      </div>

                      <div className="section-card">
                        <div className="section-card-title"><FileText />Delivery Instructions</div>
                        <Field label="Order Note" optional>
                          <textarea className="field-input" placeholder="E.g. Leave at door, call before delivery…"
                            value={orderNote} onChange={e => setOrderNote(e.target.value)} rows={2} />
                        </Field>
                      </div>

                      <button type="submit" className="btn-primary btn-primary-inline" disabled={submitting} style={{ marginTop: 16 }}>
                        {submitting ? <Loader2 size={17} className="animate-spin" />
                          : <><span>Continue to Payment</span><ChevronRight size={15} /></>}
                      </button>
                    </form>
                  </div>
                )}

                {/* ■ STEP 3: PAYMENT */}
                {step === "payment" && (
                  <div className="fade-up">
                    <StepTrack current="payment" />
                    <button className="btn-back" onClick={() => setStep("delivery")}>
                      <ArrowLeft size={13} />Back to Delivery
                    </button>
                    <div className="pb-header">
                      <h1>Payment</h1>
                      <p>Choose how you'd like to pay. Razorpay secure checkout.</p>
                    </div>

                    <div className="section-card">
                      <div className="section-card-title"><CreditCard />Payment Method</div>
                      <div className="pm-grid">
                        {PAYMENT_METHODS.map(pm => (
                          <button key={pm.id} type="button"
                            className={`pm-option ${paymentMethod === pm.id ? "active" : ""}`}
                            onClick={() => setPaymentMethod(pm.id)}>
                            <div className="pm-icon"><pm.icon size={15} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="pm-label">{pm.label}</div>
                              <div className="pm-sub">{pm.sub}</div>
                            </div>
                            <div className="pm-radio"><div className="pm-radio-dot" /></div>
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-muted)" }}>
                        <Shield size={11} color="var(--gold)" />256-bit SSL — Powered by Razorpay
                      </div>
                    </div>

                    <div className="section-card">
                      <div className="section-card-title"><Tag />Promo / Coupon Code</div>
                      {appliedCoupon ? (
                        <div className="coupon-applied">
                          <div className="coupon-applied-left">
                            <CheckCircle2 size={14} />
                            <span>{appliedCoupon.code}</span>
                            <span style={{ fontWeight: 400, color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>— {appliedCoupon.label}</span>
                          </div>
                          <button className="coupon-remove" onClick={handleRemoveCoupon} title="Remove coupon">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="coupon-row">
                            <input className="field-input" placeholder="Enter coupon code"
                              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                              value={couponInput}
                              onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                              onKeyDown={e => e.key === "Enter" && handleApplyCoupon()} />
                            <button className="coupon-apply" onClick={handleApplyCoupon} disabled={couponLoading}>
                              {couponLoading ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                            </button>
                          </div>
                          {couponError && <div className="field-error" style={{ marginTop: 6 }}><AlertCircle size={11} />{couponError}</div>}
                          <div className="coupon-suggestions">
                            <p>Available codes (demo):</p>
                            <div className="coupon-chips">
                              {Object.entries(VALID_COUPONS).map(([code]) => (
                                <span key={code} className="coupon-chip"
                                  onClick={() => { setCouponInput(code); setCouponError(""); }}>{code}</span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button className="btn-primary btn-primary-inline" disabled={submitting} onClick={handlePayment} style={{ marginTop: 16 }}>
                      {submitting ? <Loader2 size={17} className="animate-spin" />
                        : <><CreditCard size={15} /><span>Pay ₹{finalTotal.toFixed(2)} Securely</span></>}
                    </button>

                    <p style={{ fontSize: 11, color: "var(--ink-muted)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                      By paying, you agree to PingME's{" "}
                      <a href="/terms" style={{ color: "var(--gold-dim)" }}>Terms</a> &amp;{" "}
                      <a href="/privacy" style={{ color: "var(--gold-dim)" }}>Privacy Policy</a>.
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ══ STICKY MOBILE CTA ═══════════════════════════════════════════ */}
          {!success && items.length > 0 && step !== "profileEdit" && (
            <div className="sticky-cta">
              <div className="sticky-cta-total">
                Total
                <strong>₹{finalTotal.toFixed(2)}</strong>
              </div>
              <button
                className="btn-primary-compact"
                disabled={submitting || (step === "profileHub" && !allNfcProfilesComplete)}
                type={step === "delivery" ? "submit" : "button"}
                form={step === "delivery" ? "delivery-form" : undefined}
                onClick={
                  step === "profileHub"
                    ? () => setStep("delivery")
                    : step === "payment"
                      ? handlePayment
                      : undefined
                }
              >
                {submitting
                  ? <Loader2 size={16} className="animate-spin" />
                  : <>
                      <span>{stickyCtaLabel}</span>
                      {step === "payment" ? <CreditCard size={14} /> : <ChevronRight size={14} />}
                    </>}
              </button>
            </div>
          )}

        </div>
      </MainLayout>
    </>
  );
};

export default Prebook;