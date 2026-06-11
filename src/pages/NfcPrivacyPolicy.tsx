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

  return (
    <div className="nfc-public-page">
      <main className="nfc-app-shell" style={{ display: "flex", alignItems: "center", minHeight: "100vh", padding: "24px 20px" }}>

        <div style={{ width: "100%", maxWidth: "480px", margin: "0 auto" }}>

          {/* Brand bar */}
          <div className="nfc-brand-bar" style={{ opacity: 1, marginBottom: "28px" }}>
            <div className="nfc-brand-dot" />
            <span className="nfc-brand-name">PingME NFC</span>
          </div>

          {/* Main card */}
          <div className="nfc-card" style={{ opacity: 1 }}>

            <header className="nfc-card-header">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div className="nfc-avatar-placeholder" style={{ width: 56, height: 56, borderRadius: 14, fontSize: "1.2rem" }}>
                  <Nfc size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="nfc-eyebrow">Privacy Policy</p>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 4vw, 1.9rem)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--c-ink)", marginBottom: 4 }}>
                    Welcome to PingME NFC.
                  </h1>
                  <p style={{ fontSize: "0.875rem", color: "var(--c-ink2)", lineHeight: 1.5 }}>
                    Please review our Privacy Policy before accessing your NFC profile.
                  </p>
                </div>
              </div>
            </header>

            <div className="nfc-profile-content">

              <div className="nfc-profile-section">
                <p className="nfc-section-title">Data Retention</p>
                <p style={{ fontSize: "0.875rem", color: "var(--c-ink2)", lineHeight: 1.7 }}>
                  We retain your personal information only for as long as your account remains active
                  and as necessary to provide our services. Your data is stored securely and used
                  solely for the purposes described in this Privacy Policy.
                </p>
              </div>

              <div className="nfc-profile-section">
                <p className="nfc-section-title">Account Deletion</p>
                <p style={{ fontSize: "0.875rem", color: "var(--c-ink2)", lineHeight: 1.7 }}>
                  If you choose to terminate or delete your account, we will delete or anonymize your
                  personal data within a reasonable period, except where retention is required by
                  applicable law, regulatory requirements, or for legitimate business purposes such as
                  fraud prevention, dispute resolution, or legal compliance.
                </p>
              </div>

              {/* Consent checkboxes */}
              <div style={{
                background: "var(--c-surface2)",
                border: "1px solid var(--c-border)",
                borderRadius: 12,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}>
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
                style={{ marginBottom: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {saving && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {accepted
                  ? "✓ Accepted — Opening your profile…"
                  : saving
                  ? "Saving…"
                  : "Accept & View My Profile"}
              </button>

              <p style={{ fontSize: "0.72rem", color: "var(--c-ink3)", textAlign: "center", lineHeight: 1.5 }}>
                By accepting you confirm you have read and understood the above policy.
                Your consent is recorded securely.
              </p>

            </div>
          </div>

          <footer className="nfc-footer">
            <p className="nfc-footer-text">
              Powered by <span className="nfc-footer-brand">PingME</span> — A Brand By Ping IFF LLP
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
