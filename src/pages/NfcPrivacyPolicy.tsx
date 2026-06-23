import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Nfc, Loader2 } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import "./PublicNFCProfile.css";

/* ── Firestore consent helpers ───────────────────────────────────────────── */
const CONSENT_COLLECTION = "nfc_consents";

async function checkConsentInDb(username: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, CONSENT_COLLECTION, username.toLowerCase()));
    return snap.exists() && snap.data()?.consentGiven === true;
  } catch {
    return false;
  }
}

async function saveConsentToDb(username: string): Promise<void> {
  await setDoc(doc(db, CONSENT_COLLECTION, username.toLowerCase()), {
    consentGiven: true,
    acceptedAt: serverTimestamp(),
    username: username.toLowerCase(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   NFC Privacy Policy Page
   Route: /:username/NFC-Privacy-Policy
   • Checks Firestore on load — if already consented, skips straight to profile
   • On accept → writes consent to Firestore → redirects to /:username
═══════════════════════════════════════════════════════════════════════════ */
export default function NfcPrivacyPolicy() {
  const { username } = useParams<{ username: string }>();
  const navigate     = useNavigate();

  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [agreedData,   setAgreedData]   = useState(false);
  const [checking,     setChecking]     = useState(true);   // checking DB
  const [saving,       setSaving]       = useState(false);  // writing to DB
  const [accepted,     setAccepted]     = useState(false);

  const canAccept = agreedPolicy && agreedData && !saving;

  /* On mount: check Firestore — skip to profile if already consented */
  useEffect(() => {
    if (!username) return;
    checkConsentInDb(username).then((consented) => {
      if (consented) {
        navigate(`/${username}`, { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [username, navigate]);

  const handleAccept = useCallback(async () => {
    if (!username || !canAccept) return;
    setSaving(true);
    try {
      await saveConsentToDb(username);
      setAccepted(true);
      setTimeout(() => navigate(`/${username}`, { replace: true }), 900);
    } catch (err) {
      console.error("Failed to save consent:", err);
      setSaving(false);
    }
  }, [username, canAccept, navigate]);

  /* Loading state — checking Firestore */
  if (checking) {
    return (
      <div className="nfc-public-page">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16, color: "var(--c-ink2)" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: "0.875rem", fontFamily: "var(--font-body)" }}>Checking consent status…</p>
        </div>
      </div>
    );
  }

  const customStyles = {
    "--c-bg": "#0e0e13",
    "--c-accent": "#7000ff",
    "--c-accent-glow": "rgba(112, 0, 255, 0.4)",
    "--c-accent-glow-subtle": "rgba(112, 0, 255, 0.15)",
    "--c-border-accent": "rgba(112, 0, 255, 0.3)",
  } as React.CSSProperties;

  return (
    <div className="nfc-public-page" style={customStyles}>
      <main className="nfc-app-shell">

        {/* Brand bar */}
        <div className="nfc-brand-bar">
          <div className="nfc-brand-dot" />
          <span className="nfc-brand-name">PingME NFC</span>
        </div>

        {/* Main card */}
        <div className="nfc-profile-card">

          <header className="nfc-card-header" style={{ borderBottom: "1px solid var(--c-border)", paddingBottom: "24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div className="nfc-avatar-placeholder" style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0 }}>
                <Nfc size={22} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <p className="nfc-contact-label" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-accent)", fontWeight: 600 }}>Privacy Policy</p>
                <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--c-ink)", letterSpacing: "-0.01em", margin: "2px 0 4px" }}>
                  Welcome to PingME NFC
                </h1>
                <p style={{ fontSize: "13px", color: "var(--c-ink2)", lineHeight: 1.4 }}>
                  Please review our Privacy Policy before accessing your NFC profile.
                </p>
              </div>
            </div>
          </header>

          <div className="nfc-profile-content" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div>
              <h3 className="nfc-card-title" style={{ fontSize: "14px", marginBottom: "6px" }}>What Data Is Collected</h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                We collect the information you provide when setting up your NFC profile. This includes:
                your <strong>name</strong>, <strong>email address</strong>, <strong>phone number</strong>,
                <strong> job title</strong>, <strong>company name</strong>, <strong>profile photo</strong>,
                <strong> social media links</strong> (LinkedIn, Instagram, Twitter, YouTube, Facebook),
                <strong> website</strong>, <strong>address</strong>, <strong>UPI / payment links</strong>,
                and any <strong>portfolio items or documents</strong> you choose to add.
                Only information you explicitly enter is stored.
              </p>
            </div>

            <div>
              <h3 className="nfc-card-title" style={{ fontSize: "14px", marginBottom: "6px" }}>Why It Is Collected</h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                This data is collected to create and power your public NFC profile — the page people
                see when they tap your PingME NFC card. It lets you share your contact details,
                business information, and social links instantly with anyone you meet, without
                exchanging paper cards.
              </p>
            </div>

            <div>
              <h3 className="nfc-card-title" style={{ fontSize: "14px", marginBottom: "6px" }}>How It Will Be Used</h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                Your profile data is displayed on your public NFC profile page (accessible via your
                unique profile link). It is <strong>not sold</strong> to third parties, not used for
                advertising, and not shared with anyone outside of PingME's service infrastructure.
                The data is used solely to render and serve your NFC profile to visitors.
              </p>
            </div>

            <div>
              <h3 className="nfc-card-title" style={{ fontSize: "14px", marginBottom: "6px" }}>Data Retention</h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                Your data is retained for as long as your NFC profile remains active. If you
                request deletion, your profile data will be removed or anonymized within a
                reasonable timeframe, except where retention is required by applicable law or
                for legitimate purposes such as fraud prevention or dispute resolution.
              </p>
            </div>

            <div>
              <h3 className="nfc-card-title" style={{ fontSize: "14px", marginBottom: "6px" }}>Account Deletion</h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                If you choose to terminate or delete your account, we will delete or anonymize your
                personal data within a reasonable period, except where retention is required by
                applicable law, regulatory requirements, or for legitimate business purposes such as
                fraud prevention, dispute resolution, or legal compliance.
              </p>
            </div>

            <div>
              <h3 className="nfc-card-title" style={{ fontSize: "14px", marginBottom: "6px" }}>Privacy Concerns &amp; Contact</h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                If you have any questions, concerns, or requests related to your data or this
                Privacy Policy, please reach out to us directly:
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6, marginTop: 4 }}>
                📞 <a
                  href="tel:+917347340007"
                  style={{ color: "var(--c-accent)", fontWeight: 600, textDecoration: "none" }}
                >
                  +91 73473 40007
                </a>
              </p>
            </div>

            {/* Consent checkboxes */}
            <div className="nfc-consent-card-box">
              <label className="nfc-consent-check-row">
                <input
                  type="checkbox"
                  id="nfc-pp-policy"
                  checked={agreedPolicy}
                  disabled={accepted || saving}
                  onChange={(e) => setAgreedPolicy(e.target.checked)}
                />
                <span>I agree to the <strong>Privacy Policy</strong></span>
              </label>

              <label className="nfc-consent-check-row">
                <input
                  type="checkbox"
                  id="nfc-pp-data"
                  checked={agreedData}
                  disabled={accepted || saving}
                  onChange={(e) => setAgreedData(e.target.checked)}
                />
                <span>I consent to the processing of my data for managing my NFC profile</span>
              </label>
            </div>

            {/* Accept button */}
            <button
              className="nfc-consent-accept-btn"
              disabled={!canAccept || accepted}
              onClick={handleAccept}
            >
              {saving && <Loader2 size={16} className="nfc-shareback-spinner" />}
              {accepted
                ? "✓ Accepted — Opening your profile…"
                : saving
                ? "Saving…"
                : "Accept & View My Profile"}
            </button>

            <p style={{ fontSize: "11px", color: "var(--c-ink3)", textAlign: "center", lineHeight: 1.5, marginTop: 4 }}>
              By accepting you confirm you have read and understood the above policy.
              Your consent is recorded securely.
            </p>

          </div>
        </div>

        <footer className="nfc-footer">
          <p className="nfc-footer-text">
            POWERED BY PINGME — A BRAND BY PING IFF LLP
          </p>
        </footer>

      </main>
    </div>
  );
}
