import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CheckCircle, ShoppingBag, MapPin, ArrowLeft,
  CreditCard, ChevronRight, Sparkles, Package, Shield,
  User, Phone, Mail, Home, Building2, Hash, Tag, X,
  Truck, Clock, FileText, Bookmark, BookmarkCheck,
  AlertCircle, CheckCircle2, Wallet, Landmark, Smartphone,
  Plus, Minus, Trash2, RotateCcw, Info
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

// Demo coupon codes — replace with your actual backend lookup
const VALID_COUPONS = {
  LAUNCH:  { type: "percent", value: 15,  label: "15% off — Launch special" },
};

const GST_RATE = 0.18; // 18%

const PAYMENT_METHODS = [
  { id: "upi",        icon: Smartphone,  label: "UPI",          sub: "Google Pay, PhonePe, Paytm" },
  { id: "card",       icon: CreditCard,  label: "Debit / Credit Card", sub: "Visa, Mastercard, RuPay" },
  { id: "netbanking", icon: Landmark,    label: "Net Banking",  sub: "All major banks" },
  { id: "wallet",     icon: Wallet,      label: "Wallets",      sub: "Paytm, MobiKwik & more" },
];

const SESSION_KEY = "pingme_checkout_draft";

const emptyNfcProfile = () => ({
  name: "", email: "", phone: "", bio: "", website: "",
  linkedin: "", twitter: "", instagram: "", facebook: "",
});

type DeliveryFieldKey = "fullName" | "phone" | "address" | "city" | "state" | "pincode";
type FormErrors = Partial<Record<DeliveryFieldKey, string>>;
type TouchedFields = Partial<Record<DeliveryFieldKey, boolean>>;

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  error?: string;
  optional?: boolean;
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
    max-width: 1000px; margin: 0 auto;
    padding: 40px 20px;
    display: flex; gap: 32px; align-items: flex-start;
  }
  .pb-main  { flex: 1; min-width: 0; }
  .pb-aside { width: 340px; flex-shrink: 0; position: sticky; top: 20px; }
  @media (max-width: 768px) {
    .pb-wrap  { flex-direction: column; padding: 20px 16px; }
    .pb-aside { width: 100%; position: static; }
    .grid-2   { grid-template-columns: 1fr !important; }
  }

  /* ── STEP PROGRESS ── */
  .steps { display: flex; align-items: center; margin-bottom: 32px; }
  .step-item {
    display: flex; align-items: center; gap: 7px;
    font-size: 12.5px; font-weight: 500; color: var(--ink-light);
  }
  .step-item.active { color: var(--ink); font-weight: 600; }
  .step-item.done   { color: var(--gold-dim); }
  .step-dot {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700;
    background: rgba(201,146,42,0.1); color: var(--ink-light);
    flex-shrink: 0;
  }
  .step-item.active .step-dot { background: var(--ink); color: var(--cream); }
  .step-item.done   .step-dot { background: var(--gold); color: #fff; }
  .step-line {
    flex: 1; height: 1px; margin: 0 8px;
    background: var(--border-soft);
  }

  /* ── SECTION CARD ── */
  .section-card {
    background: rgba(255,255,255,0.55);
    border: 1.5px solid var(--border-soft);
    border-radius: var(--r);
    padding: 20px;
    margin-bottom: 16px;
  }
  .section-card-title {
    font-size: 12px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--gold-dim);
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 7px;
  }
  .section-card-title svg { width: 13px; height: 13px; }

  /* ── FIELD ── */
  .grid-2   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field    { margin-bottom: 14px; }
  .field:last-child { margin-bottom: 0; }
  .field-label {
    font-size: 12px; font-weight: 600; color: var(--ink-muted);
    margin-bottom: 5px; display: flex; align-items: center;
    justify-content: space-between;
  }
  .field-label span { font-weight: 400; color: var(--ink-light); font-size: 11px; }
  .field-input {
    width: 100%; height: 42px;
    background: rgba(255,255,255,0.7);
    border: 1.5px solid var(--border);
    border-radius: var(--r-sm); padding: 0 12px;
    font-size: 13.5px; font-family: inherit; color: var(--ink);
    transition: border-color .18s, box-shadow .18s; outline: none;
  }
  .field-input::placeholder { color: var(--ink-light); font-size: 13px; }
  .field-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(201,146,42,0.10);
    background: #fff;
  }
  .field-input.error  { border-color: var(--error) !important; box-shadow: 0 0 0 3px rgba(220,38,38,0.08) !important; }
  .field-input.valid  { border-color: var(--success) !important; }
  textarea.field-input { height: auto; padding: 10px 12px; resize: vertical; min-height: 72px; }
  select.field-input   { cursor: pointer; }
  .field-error {
    font-size: 11px; color: var(--error);
    margin-top: 4px; display: flex; align-items: center; gap: 4px;
  }
  .field-error svg { width: 11px; height: 11px; flex-shrink: 0; }
  .field-hint {
    font-size: 11px; color: var(--ink-light);
    margin-top: 4px;
  }

  /* ── SAVED ADDRESS ── */
  .saved-addr-list { display: flex; flex-direction: column; gap: 8px; }
  .saved-addr-btn {
    width: 100%; text-align: left;
    padding: 11px 13px; border-radius: var(--r-sm);
    border: 1.5px solid var(--border-soft);
    background: rgba(255,247,228,0.6);
    cursor: pointer; transition: all .18s ease;
    font-family: inherit;
  }
  .saved-addr-btn:hover { border-color: var(--gold); background: #fff; }
  .saved-addr-btn.selected { border-color: var(--gold); background: #fff; box-shadow: 0 0 0 3px rgba(201,146,42,.08); }
  .saved-addr-main { font-size: 13px; font-weight: 500; color: var(--ink); display: block; }
  .saved-addr-sub  { font-size: 11.5px; color: var(--ink-muted); margin-top: 1px; display: block; }

  /* ── SAVE ADDRESS TOGGLE ── */
  .toggle-row {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: var(--r-sm);
    background: rgba(201,146,42,0.06);
    border: 1.5px solid var(--border-soft);
    cursor: pointer; user-select: none;
    transition: border-color .18s;
  }
  .toggle-row:hover { border-color: var(--gold); }
  .toggle-box {
    width: 18px; height: 18px; border-radius: 5px;
    border: 1.5px solid var(--border);
    background: #fff; display: flex; align-items: center; justify-content: center;
    transition: all .15s; flex-shrink: 0;
  }
  .toggle-box.checked { background: var(--gold); border-color: var(--gold); }
  .toggle-label { font-size: 13px; font-weight: 500; color: var(--ink); }

  /* ── PINCODE LOOKUP ── */
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
  .coupon-row { display: flex; gap: 8px; }
  .coupon-row .field-input { border-radius: var(--r-sm) 0 0 var(--r-sm); }
  .coupon-apply {
    height: 42px; padding: 0 16px;
    background: var(--ink); color: var(--cream);
    border: none; border-radius: 0 var(--r-sm) var(--r-sm) 0;
    font-size: 13px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: background .18s; white-space: nowrap; flex-shrink: 0;
  }
  .coupon-apply:hover    { background: #2e2010; }
  .coupon-apply:disabled { opacity: .5; cursor: not-allowed; }
  .coupon-applied {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 13px; border-radius: var(--r-sm);
    background: rgba(22,163,74,.08); border: 1.5px solid rgba(22,163,74,.2);
    font-size: 13px;
  }
  .coupon-applied-left  { display: flex; align-items: center; gap: 7px; color: var(--success); font-weight: 600; }
  .coupon-remove {
    background: none; border: none; cursor: pointer; color: var(--ink-light);
    display: flex; padding: 2px; border-radius: 4px; transition: color .15s;
  }
  .coupon-remove:hover { color: var(--error); }
  .coupon-suggestions { margin-top: 10px; }
  .coupon-suggestions p { font-size: 11px; color: var(--ink-muted); margin-bottom: 6px; }
  .coupon-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .coupon-chip {
    padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600;
    background: rgba(201,146,42,0.1); color: var(--gold-dim);
    border: 1px solid var(--border); cursor: pointer;
    font-family: monospace; transition: all .15s;
  }
  .coupon-chip:hover { background: var(--gold-pale); border-color: var(--gold); }

  /* ── PAYMENT METHOD ── */
  .pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  @media (max-width: 480px) { .pm-grid { grid-template-columns: 1fr; } }
  .pm-option {
    padding: 12px 14px; border-radius: var(--r-sm);
    border: 1.5px solid var(--border-soft);
    background: rgba(255,255,255,0.5);
    cursor: pointer; transition: all .18s;
    display: flex; align-items: center; gap: 10px;
    font-family: inherit;
  }
  .pm-option:hover   { border-color: var(--gold-pale); background: rgba(255,255,255,0.8); }
  .pm-option.active  {
    border-color: var(--gold); background: #fff;
    box-shadow: 0 0 0 3px rgba(201,146,42,.08);
  }
  .pm-icon {
    width: 34px; height: 34px; border-radius: 8px;
    background: rgba(201,146,42,0.08);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: var(--gold-dim);
  }
  .pm-option.active .pm-icon { background: var(--gold); color: #fff; }
  .pm-label { font-size: 12.5px; font-weight: 600; color: var(--ink); }
  .pm-sub   { font-size: 10.5px; color: var(--ink-muted); margin-top: 1px; }
  .pm-radio {
    width: 16px; height: 16px; border-radius: 50%;
    border: 1.5px solid var(--border); margin-left: auto;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pm-option.active .pm-radio { border-color: var(--gold); }
  .pm-radio-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--gold); opacity: 0; transition: opacity .15s;
  }
  .pm-option.active .pm-radio-dot { opacity: 1; }

  /* ── NFC PROFILE HUB ── */
  .nfc-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 14px 16px; border-radius: var(--r-sm);
    border: 1.5px solid var(--border-soft); background: rgba(255,255,255,0.5);
    transition: all .18s; margin-bottom: 10px;
  }
  .nfc-row:hover { border-color: var(--gold-pale); background: rgba(255,255,255,0.8); }
  .nfc-row-info h4 { font-size: 13.5px; font-weight: 600; color: var(--ink); }
  .nfc-row-info p  { font-size: 11.5px; color: var(--ink-muted); margin-top: 2px; }
  .badge-ready   {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600;
    background: rgba(22,163,74,.1); color: var(--success);
    border: 1px solid rgba(22,163,74,.18);
  }
  .badge-pending {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600;
    background: rgba(234,179,8,.1); color: #92400e;
    border: 1px solid rgba(234,179,8,.2);
  }
  .btn-nfc-setup {
    padding: 7px 14px; border-radius: var(--r-sm);
    font-size: 12.5px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: all .18s; border: 1.5px solid;
  }
  .btn-nfc-setup.ready   { background: transparent; color: var(--ink-muted); border-color: var(--border); }
  .btn-nfc-setup.ready:hover { border-color: var(--gold); color: var(--ink); }
  .btn-nfc-setup.pending { background: var(--ink); color: var(--cream); border-color: var(--ink); box-shadow: 0 3px 10px rgba(28,20,9,.18); }
  .btn-nfc-setup.pending:hover { background: #2e2010; }

  /* ── ORDER SUMMARY CARD ── */
  .summary-card {
    background: rgba(255,255,255,0.6);
    border: 1.5px solid var(--border);
    border-radius: 18px; padding: 20px;
    box-shadow: var(--shadow-lg);
  }
  .summary-title {
    font-size: 15px; font-weight: 700; color: var(--ink);
    display: flex; align-items: center; gap: 8px; margin-bottom: 18px;
    padding-bottom: 14px; border-bottom: 1px solid var(--border-soft);
  }
  .summary-title svg { color: var(--gold); }
  .order-item { display: flex; gap: 11px; align-items: flex-start; margin-bottom: 12px; }
  .order-thumb {
    width: 48px; height: 48px; border-radius: 10px;
    background: rgba(201,146,42,0.07); border: 1px solid var(--border-soft);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
  }
  .order-thumb img { max-width: 80%; max-height: 80%; object-fit: contain; }
  .order-item-info { flex: 1; min-width: 0; }
  .order-item-info h4 { font-size: 13px; font-weight: 600; color: var(--ink); }
  .order-item-info p  { font-size: 11px; color: var(--ink-muted); margin-top: 2px; }
  .order-item-price   { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; }

  /* qty controls inside summary */
  .qty-ctrl { display: flex; align-items: center; gap: 6px; margin-top: 5px; }
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
  .qty-val { font-size: 12.5px; font-weight: 600; color: var(--ink); min-width: 18px; text-align: center; }

  /* price rows */
  .price-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; color: var(--ink-muted); margin-bottom: 7px;
  }
  .price-row .val    { color: var(--ink); font-weight: 500; }
  .price-row.free .val  { color: var(--success); font-weight: 600; }
  .price-row.discount .val { color: var(--success); font-weight: 600; }
  .price-row.tax .lbl { display: flex; align-items: center; gap: 4px; }
  .price-total {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 17px; font-weight: 700; color: var(--ink);
    padding-top: 12px; margin-top: 4px;
    border-top: 1.5px solid var(--border);
  }
  .price-total .amt { color: var(--gold-dim); font-size: 19px; }

  /* delivery estimate */
  .delivery-estimate {
    margin-top: 14px; padding: 11px 13px;
    background: rgba(201,146,42,0.07);
    border: 1px solid var(--border-soft); border-radius: var(--r-sm);
    display: flex; align-items: flex-start; gap: 9px; font-size: 12px;
  }
  .delivery-estimate svg { color: var(--gold); flex-shrink: 0; margin-top: 1px; }
  .delivery-estimate strong { color: var(--ink); }
  .delivery-estimate p { color: var(--ink-muted); margin-top: 1px; line-height: 1.45; }

  /* trust badges */
  .trust-list { margin-top: 14px; display: flex; flex-direction: column; gap: 7px; padding-top: 14px; border-top: 1px solid var(--border-soft); }
  .trust-item { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--ink-muted); }
  .trust-item svg { color: var(--gold); width: 13px; height: 13px; flex-shrink: 0; }

  /* ── BUTTONS ── */
  .btn-primary {
    width: 100%; height: 50px; margin-top: 20px;
    background: var(--ink);
    border: none; border-radius: var(--r);
    color: var(--cream); font-family: inherit;
    font-size: 14.5px; font-weight: 600;
    cursor: pointer; transition: all .2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(28,20,9,.2);
  }
  .btn-primary:hover:not(:disabled) {
    background: #2e2010;
    box-shadow: 0 8px 24px rgba(28,20,9,.28);
    transform: translateY(-1px);
  }
  .btn-primary:active:not(:disabled)  { transform: none; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; transform: none; }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 20px; height: 44px; border-radius: var(--r);
    background: rgba(255,247,228,0.8); color: var(--ink);
    border: 1.5px solid var(--border); font-family: inherit;
    font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .18s;
  }
  .btn-secondary:hover { border-color: var(--gold); background: #fff; }
  .btn-back {
    display: inline-flex; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    font-size: 13px; color: var(--ink-muted); padding: 0; margin-bottom: 18px;
    font-family: inherit; transition: color .15s;
  }
  .btn-back:hover { color: var(--ink); }

  /* ── PAGE HEADER ── */
  .pb-header { margin-bottom: 24px; }
  .pb-header h1 { font-size: clamp(20px,3vw,26px); font-weight: 700; color: var(--ink); line-height: 1.2; }
  .pb-header p  { font-size: 13.5px; color: var(--ink-muted); margin-top: 4px; }

  /* ── SUCCESS ── */
  .success-wrap { max-width: 480px; margin: 0 auto; text-align: center; padding: 60px 24px; }
  .success-ring {
    width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 24px;
    background: rgba(22,163,74,.1); border: 2px solid rgba(22,163,74,.2);
    display: flex; align-items: center; justify-content: center;
    animation: popIn .4s cubic-bezier(.34,1.56,.64,1) both;
  }
  .success-ring svg { color: var(--success); }
  .success-wrap h1 { font-size: 28px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
  .success-wrap p  { font-size: 14px; color: var(--ink-muted); line-height: 1.6; margin-bottom: 6px; }
  .success-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 24px; }
  .success-meta {
    margin-top: 24px; padding: 16px;
    background: rgba(255,255,255,.6); border: 1px solid var(--border-soft);
    border-radius: var(--r); text-align: left;
  }
  .success-meta p { font-size: 12.5px; color: var(--ink-muted); line-height: 1.6; }
  .success-meta strong { color: var(--ink); }

  /* ── EMPTY ── */
  .empty-wrap { max-width: 400px; margin: 0 auto; text-align: center; padding: 60px 24px; }
  .empty-icon {
    width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 20px;
    background: rgba(201,146,42,.07); border: 1.5px dashed var(--border);
    display: flex; align-items: center; justify-content: center;
  }
  .empty-icon svg { color: var(--ink-light); }
  .empty-wrap h1 { font-size: 24px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
  .empty-wrap p  { font-size: 14px; color: var(--ink-muted); margin-bottom: 20px; line-height: 1.6; }

  /* ── DIVIDER ── */
  .divider { height: 1px; background: var(--border-soft); margin: 14px 0; }

  /* ── TOOLTIP ── */
  .tooltip-wrap { position: relative; display: inline-flex; }
  .tooltip-wrap:hover .tooltip-box { display: block; }
  .tooltip-box {
    display: none; position: absolute; bottom: calc(100% + 6px); left: 50%;
    transform: translateX(-50%); z-index: 10;
    background: var(--ink); color: var(--cream);
    font-size: 11px; border-radius: 6px; padding: 5px 9px;
    white-space: nowrap; pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,.2);
  }

  /* ── FADE ANIMATION ── */
  .fade-up { animation: fadeUp .3s ease both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  /* ── MISC ── */
  .text-success { color: var(--success) !important; }
  .text-error   { color: var(--error) !important; }
`;

/* ─────────────────────────── HELPERS ───────────────────────────────────── */

function getDeliveryEstimate() {
  const now   = new Date();
  const start = new Date(now); start.setDate(start.getDate() + 5);
  const end   = new Date(now); end.setDate(end.getDate() + 7);
  const fmt   = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function parseItemPrice(priceStr) {
  if (!priceStr) return 0;
  const n = parseFloat(String(priceStr).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

/* ─────────────────────────── SUB-COMPONENTS ────────────────────────────── */

function StepTrack({ current }) {
  const steps = [
    { key: "delivery",   label: "Delivery"    },
    { key: "profileHub", label: "NFC Profiles" },
    { key: "payment",    label: "Payment"      },
  ];
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? "1" : "auto" }}>
          <div className={`step-item ${i === idx ? "active" : i < idx ? "done" : ""}`}>
            <div className="step-dot">{i < idx ? "✓" : i + 1}</div>
            {s.label}
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
        {label}{required && <span style={{ color: "var(--error)", marginLeft: 2 }}>*</span>}
        {optional && <span>Optional</span>}
      </div>
      {children}
      {error && (
        <div className="field-error">
          <AlertCircle size={11} />
          {error}
        </div>
      )}
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

/* ─────────────────────────── MAIN PAGE ─────────────────────────────────── */

const Prebook = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, cartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const { user, profile } = useAuth();

  /* ── Delivery form state ── */
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [address,  setAddress]  = useState("");
  const [city,     setCity]     = useState("");
  const [state,    setState]    = useState("");
  const [pincode,  setPincode]  = useState("");
  const [orderNote, setOrderNote] = useState("");

  /* ── Validation errors ── */
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  /* ── Flow state ── */
  const [step, setStep] = useState("delivery");
  const [activeLineKey, setActiveLineKey] = useState(null);
  const [nfcProfilesByLine, setNfcProfilesByLine] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [invoiceEmail, setInvoiceEmail] = useState("");

  /* ── New features state ── */
  const [couponInput,   setCouponInput]   = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, type, value, label }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [saveAddress,   setSaveAddress]   = useState(false);
  const [selectedSavedAddr, setSelectedSavedAddr] = useState(null);
  const [pincodeStatus, setPincodeStatus] = useState(null); // null | "loading" | "found" | "error"

  const pincodeTimer = useRef(null);

  /* ── Cart units ── */
  const nfcCartUnits       = useMemo(() => expandNfcCartUnits(items), [items]);
  const hasNFCCards        = nfcCartUnits.length > 0;
  const showProfileBuilding = hasNFCCards;
  const activeUnit         = nfcCartUnits.find(u => u.lineKey === activeLineKey);
  const allNfcProfilesComplete = nfcCartUnits.every(u => isNfcLineProfileComplete(nfcProfilesByLine[u.lineKey]));

  /* ── Pricing calc ── */
  const subtotal     = cartTotal;
  const discountAmt  = appliedCoupon
    ? appliedCoupon.type === "percent"
      ? Math.round(subtotal * appliedCoupon.value) / 100
      : appliedCoupon.value
    : 0;
  const taxableAmt   = Math.max(0, subtotal - discountAmt);
  const gstAmt       = parseFloat((taxableAmt * GST_RATE).toFixed(2));
  const finalTotal   = parseFloat((taxableAmt).toFixed(2));

  /* ── Session restore ── */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.fullName) setFullName(d.fullName);
        if (d.email)    setEmail(d.email);
        if (d.phone)    setPhone(d.phone);
        if (d.address)  setAddress(d.address);
        if (d.city)     setCity(d.city);
        if (d.state)    setState(d.state);
        if (d.pincode)  setPincode(d.pincode);
        if (d.orderNote) setOrderNote(d.orderNote);
      }
    } catch {}
  }, []);

  /* ── Session save on change ── */
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ fullName, email, phone, address, city, state, pincode, orderNote }));
    } catch {}
  }, [fullName, email, phone, address, city, state, pincode, orderNote]);

  /* ── Pre-fill from auth profile ── */
  useEffect(() => {
    if (profile) {
      if (profile.displayName && !fullName) setFullName(profile.displayName);
      if (profile.email       && !email)    setEmail(profile.email);
      if (profile.mobile      && !phone)    setPhone(profile.mobile);
    }
  }, [profile]);

  /* ── Pincode auto-lookup (India Post API) ── */
  useEffect(() => {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setPincodeStatus(null); return;
    }
    clearTimeout(pincodeTimer.current);
    setPincodeStatus("loading");
    pincodeTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        if (data?.[0]?.Status === "Success") {
          const postOffice = data[0].PostOffice?.[0];
          if (postOffice) {
            if (!city)  setCity(postOffice.District || "");
            if (!state) setState(postOffice.State    || "");
            setPincodeStatus("found");
            setErrors(prev => ({ ...prev, pincode: undefined, city: undefined, state: undefined }));
          }
        } else { setPincodeStatus("error"); }
      } catch { setPincodeStatus("error"); }
    }, 600);
    return () => clearTimeout(pincodeTimer.current);
  }, [pincode]);

  /* ── Validation ── */
  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {};
    if (!fullName.trim())             e.fullName = "Full name is required";
    if (!phone.trim())                e.phone    = "Phone number is required";
    else if (!/^[+]?[\d\s-]{10,}$/.test(phone.trim())) e.phone = "Enter a valid phone number";
    if (!address.trim())              e.address  = "Street address is required";
    if (!city.trim())                 e.city     = "City is required";
    if (!state)                       e.state    = "Please select a state";
    if (!pincode.trim())              e.pincode  = "Pincode is required";
    else if (!/^\d{6}$/.test(pincode.trim())) e.pincode = "Enter a valid 6-digit pincode";
    return e;
  }, [fullName, phone, address, city, state, pincode]);

  const handleBlur = (field: DeliveryFieldKey) => setTouched(prev => ({ ...prev, [field]: true }));

  const fieldClass = (f: DeliveryFieldKey) => {
    if (!touched[f]) return "field-input";
    return errors[f] ? "field-input error" : "field-input valid";
  };

  /* ── Coupon ── */
  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError("Enter a coupon code"); return; }
    setCouponLoading(true);
    setCouponError("");
    // Simulate async lookup
    setTimeout(() => {
      const found = VALID_COUPONS[code];
      if (found) {
        setAppliedCoupon({ code, ...found });
        setCouponInput("");
        toast({ title: "Coupon applied!", description: found.label });
      } else {
        setCouponError("Invalid or expired coupon code");
      }
      setCouponLoading(false);
    }, 600);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
    toast({ title: "Coupon removed" });
  };

  /* ── Saved address ── */
  const handleApplySavedAddress = (addr) => {
    setAddress(addr.fullAddress || "");
    setCity(addr.city || "");
    setState(addr.state || "");
    setPincode(addr.pincode || "");
    setSelectedSavedAddr(addr.id);
    toast({ title: "Address applied" });
  };

  /* ── NFC profile helpers ── */
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

  const handleProfileEditContinue = () => {
    if (!activeLineKey) return;
    if (!isNfcLineProfileComplete(nfcProfilesByLine[activeLineKey])) return;
    setActiveLineKey(null);
    setStep("profileHub");
  };

  /* ── Delivery submit ── */
  const handleDeliverySubmit = (e) => {
    e.preventDefault();
    // Mark all touched
    setTouched({ fullName: true, phone: true, address: true, city: true, state: true, pincode: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" }); return;
    }
    if (showProfileBuilding) {
      setNfcProfilesByLine(prev => {
        const next = { ...prev };
        nfcCartUnits.forEach(unit => {
          if (!next[unit.lineKey])
            next[unit.lineKey] = seedLineProfile(unit.lineKey, unit.unitIndex, fullName.trim(), email.trim(), phone.trim());
          else
            next[unit.lineKey] = {
              ...next[unit.lineKey],
              name:  next[unit.lineKey].name  || fullName.trim(),
              email: next[unit.lineKey].email || email.trim(),
              phone: next[unit.lineKey].phone || phone.trim(),
            };
        });
        return next;
      });
      setStep("profileHub");
    } else {
      setStep("payment");
    }
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
        orderNote: orderNote.trim() || undefined,
        paymentMethod,
        coupon: appliedCoupon ? { code: appliedCoupon.code, discount: discountAmt } : undefined,
        gst: gstAmt,
        status: "confirmed" as const, userId: user?.uid,
        ...(nfcLineProfiles ? { nfcLineProfiles } : {}),
        ...(nfcCartUnits.length === 1 && nfcLineProfiles ? { nfcProfile: nfcProfilesByLine[nfcCartUnits[0].lineKey] } : {}),
      };

      const order = await createRazorpayOrder({
        amount:   Math.round(finalTotal * 100),
        currency: "INR",
        receipt:  `pingme_${Date.now()}`,
        notes:    { userId: user?.uid || "guest", coupon: appliedCoupon?.code || "" },
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
                gateway: "razorpay" as const,
                orderId:   resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
                amount: order.amount, currency: order.currency,
                paidAt: new Date().toISOString(),
                method: paymentMethod,
              },
            };
            await verifyRazorpayPaymentAndCreatePrebooking({
              orderId:   resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
              prebooking: completed,
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

  /* ─── RENDER ──────────────────────────────────────────────────────────── */

  return (
    <>
      <style>{STYLES}</style>
      <MainLayout>
        <div className="pb">

          {/* ══ SUCCESS ══════════════════════════════════════════════════════ */}
          {success && (
            <div className="success-wrap fade-up">
              <div className="success-ring"><CheckCircle size={36} /></div>
              <h1>Booking Confirmed!</h1>
              <p>Your invoice will be sent to <strong>{invoiceEmail || email}</strong>.</p>
              <p>We'll reach out shortly with delivery details.</p>

              <div className="success-meta">
                <p><strong>Estimated delivery:</strong> {getDeliveryEstimate()}</p>
                <p style={{ marginTop: 6 }}>
                  <strong>Amount paid:</strong> ₹{receiptOrder?.totalAmount?.toFixed(2)}
                  {receiptOrder?.coupon && ` (₹${receiptOrder.coupon.discount} coupon applied)`}
                </p>
                {receiptOrder?.orderNote && (
                  <p style={{ marginTop: 6 }}><strong>Note:</strong> {receiptOrder.orderNote}</p>
                )}
              </div>

              <div className="success-btns">
                {receiptOrder && (
                  <button className="btn-primary" style={{   padding: "0 24px" }}
                    onClick={() => downloadReceipt(receiptOrder, invoiceEmail)}>
                    Download Invoice
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
              <div className="empty-icon"><ShoppingBag size={30} /></div>
              <h1>Cart is Empty</h1>
              <p>Add a PingME product to your cart before checking out.</p>
              <button className="btn-primary" style={{  padding: "0 28px" }}
                onClick={() => navigate("/products")}>
                Browse Products
              </button>
            </div>
          )}

          {/* ══ CHECKOUT ══════════════════════════════════════════════════════ */}
          {!success && items.length > 0 && (
            <div className="pb-wrap">

              {/* ── LEFT ─────────────────────────────────────────────────── */}
              <div className="pb-main">

                {/* ■ DELIVERY STEP */}
                {step === "delivery" && (
                  <div className="fade-up">
                    <StepTrack current="delivery" />
                    <div className="pb-header">
                      <h1>Delivery Details</h1>
                      <p>Tell us where to send your PingME product.</p>
                    </div>

                    {/* Saved addresses */}
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

                    <form onSubmit={handleDeliverySubmit} noValidate>

                      {/* Personal info */}
                      <div className="section-card">
                        <div className="section-card-title"><User />Contact Information</div>
                        <Field label="Full Name" required error={touched.fullName && errors.fullName}>
                          <input className={fieldClass("fullName")} placeholder="Your full name"
                            value={fullName} onChange={e => setFullName(e.target.value)}
                            onBlur={() => { handleBlur("fullName"); setErrors(v => ({ ...v, fullName: !fullName.trim() ? "Full name is required" : undefined })); }} />
                        </Field>
                        <div className="grid-2">
                          <Field label="Email">
                            <input className="field-input" type="email" placeholder="you@example.com"
                              value={email} onChange={e => setEmail(e.target.value)} />
                          </Field>
                          <Field label="Phone" required error={touched.phone && errors.phone}>
                            <input className={fieldClass("phone")} placeholder="+91 9876543210"
                              value={phone} onChange={e => setPhone(e.target.value)}
                              onBlur={() => handleBlur("phone")} />
                          </Field>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="section-card">
                        <div className="section-card-title"><Home />Shipping Address</div>
                        <Field label="Street Address" required error={touched.address && errors.address}>
                          <input className={fieldClass("address")} placeholder="House no., Street, Locality"
                            value={address} onChange={e => setAddress(e.target.value)}
                            onBlur={() => handleBlur("address")} />
                        </Field>
                        <Field label="Pincode" required error={touched.pincode && errors.pincode}
                          hint={pincodeStatus === "found" ? "✓ City & state auto-filled" : undefined}>
                          <div className="pincode-wrap">
                            <input className={fieldClass("pincode")} placeholder="Eg.160012"
                              value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              onBlur={() => handleBlur("pincode")} maxLength={6} />
                            {pincodeStatus === "loading" && <span className="pincode-badge loading">Looking up…</span>}
                            {pincodeStatus === "found"   && <span className="pincode-badge found">✓ Found</span>}
                            {pincodeStatus === "error"   && <span className="pincode-badge error">Not found</span>}
                          </div>
                        </Field>
                        <div className="grid-2">
                          <Field label="City" required error={touched.city && errors.city}>
                            <input className={fieldClass("city")} placeholder="City"
                              value={city} onChange={e => setCity(e.target.value)}
                              onBlur={() => handleBlur("city")} />
                          </Field>
                          <Field label="State" required error={touched.state && errors.state}>
                            <select className={fieldClass("state")} value={state}
                              onChange={e => setState(e.target.value)}
                              onBlur={() => handleBlur("state")}>
                              <option value="">Select State</option>
                              {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </Field>
                        </div>

                        {/* Save address */}
                        {user && (
                          <div style={{ marginTop: 12 }}>
                            <CheckToggle checked={saveAddress} onChange={setSaveAddress}
                              icon={saveAddress ? BookmarkCheck : Bookmark}
                              label="Save this address to my profile" />
                          </div>
                        )}
                      </div>

                      {/* Order note */}
                      <div className="section-card">
                        <div className="section-card-title"><FileText />Delivery Instructions</div>
                        <Field label="Order Note" optional>
                          <textarea className="field-input" placeholder="E.g. Leave at door, call before delivery, landmark…"
                            value={orderNote} onChange={e => setOrderNote(e.target.value)} rows={2} />
                        </Field>
                      </div>

                      <button type="submit" className="btn-primary" disabled={submitting}>
                        {submitting
                          ? <Loader2 size={17} className="animate-spin" />
                          : showProfileBuilding
                            ? <><span>Continue to NFC Profile Setup</span><ChevronRight size={15} /></>
                            : <><span>Continue to Payment</span><ChevronRight size={15} /></>}
                      </button>
                    </form>
                  </div>
                )}

                {/* ■ NFC PROFILE HUB */}
                {step === "profileHub" && (
                  <div className="fade-up">
                    <StepTrack current="profileHub" />
                    <button className="btn-back" onClick={() => setStep("delivery")}>
                      <ArrowLeft size={13} />Back to Delivery
                    </button>
                    <div className="pb-header">
                      <h1>NFC Profile Setup</h1>
                      <p>Each NFC card gets its own public profile link. Set them up below.</p>
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
                              {complete && lp?.username && <p>@{lp.username}</p>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span className={complete ? "badge-ready" : "badge-pending"}>
                                {complete ? "✓ Ready" : "Pending"}
                              </span>
                              <button className={`btn-nfc-setup ${complete ? "ready" : "pending"}`}
                                onClick={() => openProfileEditor(unit.lineKey)}>
                                {complete ? "Edit" : "Set Up"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button className="btn-primary"
                      disabled={submitting || !allNfcProfilesComplete}
                      onClick={() => setStep("payment")}>
                      {submitting
                        ? <Loader2 size={17} className="animate-spin" />
                        : <><span>Continue to Payment</span><ChevronRight size={15} /></>}
                    </button>
                  </div>
                )}

                {/* ■ PROFILE EDIT */}
                {step === "profileEdit" && activeLineKey && activeUnit && (
                  <div className="fade-up">
                    <StepTrack current="profileHub" />
                    <NFCProfileBuilder
                      profileData={nfcProfilesByLine[activeLineKey] || emptyNfcProfile()}
                      onProfileChange={data => setNfcProfilesByLine(prev => ({ ...prev, [activeLineKey]: data }))}
                      onBack={() => { setActiveLineKey(null); setStep("profileHub"); }}
                      onContinue={handleProfileEditContinue}
                      isLoading={submitting}
                      title={`Build Profile — ${activeUnit.displayTitle}`}
                      description={`This profile will be embedded in your ${activeUnit.title}. Choose a unique username.`}
                      backLabel="Back to NFC Cards"
                      continueLabel="Save & Return"
                    />
                  </div>
                )}

                {/* ■ PAYMENT STEP */}
                {step === "payment" && (
                  <div className="fade-up">
                    <StepTrack current="payment" />
                    <button className="btn-back"
                      onClick={() => setStep(showProfileBuilding ? "profileHub" : "delivery")}>
                      <ArrowLeft size={13} />Back
                    </button>
                    <div className="pb-header">
                      <h1>Payment</h1>
                      <p>Choose how you'd like to pay. You'll be taken to Razorpay's secure checkout.</p>
                    </div>

                    {/* Payment method selector */}
                    <div className="section-card">
                      <div className="section-card-title"><CreditCard />Choose Payment Method</div>
                      <div className="pm-grid">
                        {PAYMENT_METHODS.map(pm => (
                          <button key={pm.id} type="button"
                            className={`pm-option ${paymentMethod === pm.id ? "active" : ""}`}
                            onClick={() => setPaymentMethod(pm.id)}>
                            <div className="pm-icon"><pm.icon size={16} /></div>
                            <div style={{ flex: 1, textAlign: "left" }}>
                              <div className="pm-label">{pm.label}</div>
                              <div className="pm-sub">{pm.sub}</div>
                            </div>
                            <div className="pm-radio">
                              <div className="pm-radio-dot" />
                            </div>
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-muted)" }}>
                        <Shield size={12} color="var(--gold)" />
                        Powered by Razorpay — 256-bit SSL encrypted
                      </div>
                    </div>

                    {/* Coupon */}
                    <div className="section-card">
                      <div className="section-card-title"><Tag />Promo / Coupon Code</div>
                      {appliedCoupon ? (
                        <div className="coupon-applied">
                          <div className="coupon-applied-left">
                            <CheckCircle2 size={15} />
                            <span>{appliedCoupon.code}</span>
                            <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>— {appliedCoupon.label}</span>
                          </div>
                          <button className="coupon-remove" onClick={handleRemoveCoupon} title="Remove coupon">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="coupon-row">
                            <input className="field-input" placeholder="Enter coupon code"
                              value={couponInput} onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                              onKeyDown={e => e.key === "Enter" && handleApplyCoupon()} />
                            <button className="coupon-apply" onClick={handleApplyCoupon} disabled={couponLoading}>
                              {couponLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                            </button>
                          </div>
                          {couponError && (
                            <div className="field-error" style={{ marginTop: 6 }}>
                              <AlertCircle size={11} />{couponError}
                            </div>
                          )}
                          <div className="coupon-suggestions">
                            <p>Available codes (for demo):</p>
                            <div className="coupon-chips">
                              {Object.entries(VALID_COUPONS).map(([code, c]) => (
                                <span key={code} className="coupon-chip"
                                  onClick={() => { setCouponInput(code); setCouponError(""); }}>
                                  {code}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Confirm & pay */}
                    <button className="btn-primary" disabled={submitting} onClick={handlePayment}>
                      {submitting
                        ? <Loader2 size={17} className="animate-spin" />
                        : <><CreditCard size={16} /><span>Pay ₹{finalTotal.toFixed(2)} Securely</span></>}
                    </button>

                    <p style={{ fontSize: 11.5, color: "var(--ink-muted)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                      By paying, you agree to PingME's <a href="/terms" style={{ color: "var(--gold-dim)" }}>Terms</a> &amp; <a href="/privacy" style={{ color: "var(--gold-dim)" }}>Privacy Policy</a>.
                    </p>
                  </div>
                )}

              </div>

              {/* ── RIGHT (ORDER SUMMARY) ──────────────────────────────── */}
              <div className="pb-aside">
                <div className="summary-card">
                  <div className="summary-title">
                    <ShoppingBag size={17} />
                    Order Summary
                    <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 500, color: "var(--ink-muted)" }}>
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Items with qty controls */}
                  <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 2, marginBottom: 14 }}>
                    {items.map(item => (
                      <div key={item.id} className="order-item">
                        <div className="order-thumb">
                          {resolveProductImageUrl(item.image)
                            ? <img src={resolveProductImageUrl(item.image)} alt={item.title} loading="lazy" />
                            : <span style={{ fontSize: 20 }}>{item.emoji}</span>}
                        </div>
                        <div className="order-item-info">
                          <h4>{item.title}</h4>
                          {isNfcCartItem(item) && step !== "delivery" && (
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
                          {/* Qty controls */}
                          {typeof updateQuantity === "function" && (
                            <div className="qty-ctrl">
                              <button className="qty-btn"
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

                  <div className="divider" />

                  {/* Price breakdown */}
                  <div className="price-row">
                    <span>Subtotal</span>
                    <span className="val">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="price-row discount">
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span className="val">−₹{discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="price-row free">
                    <span>Delivery</span>
                    <span className="val">Free</span>
                  </div>

                  <div className="price-total">
                    <span>Total</span>
                    <span className="amt">₹{finalTotal.toFixed(2)}</span>
                  </div>

                  {/* Delivery estimate */}
                  <div className="delivery-estimate">
                    <Truck size={14} />
                    <div>
                      <strong>Estimated Delivery</strong>
                      <p>{getDeliveryEstimate()} · Standard shipping</p>
                    </div>
                  </div>

                  {/* Trust badges */}
                  <div className="trust-list">
                    <div className="trust-item"><Shield />Razorpay secure checkout</div>
                    <div className="trust-item"><Package />Pan-India Delivery</div>
                    <div className="trust-item"><RotateCcw />Easy returns within 7 days</div>
                    <div className="trust-item"><Sparkles />NFC profile activated on delivery</div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </MainLayout>
    </>
  );
};

export default Prebook;