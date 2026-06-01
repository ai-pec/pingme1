import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Linkedin, Twitter, Instagram, Youtube, Facebook, Link as LinkIcon } from "lucide-react";
import { fetchPublicNfcProfile, normalizeNfcUsername, type PublicNfcProfile } from "@/lib/publicNfcService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "./PublicNFCProfile.css";

const linkify = (url: string): string => {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

function createVCard(profile: PublicNfcProfile) {
  const lines: string[] = [];
  const fn = profile.name || profile.username || "";
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  if (fn) lines.push(`FN:${fn}`);
  if (profile.name) lines.push(`N:${profile.name}`);
  if (profile.jobTitle) lines.push(`TITLE:${profile.jobTitle}`);
  if (profile.companyName) lines.push(`ORG:${profile.companyName}`);
  if (profile.phone) lines.push(`TEL;TYPE=CELL:${profile.phone}`);
  if (profile.email) lines.push(`EMAIL;TYPE=INTERNET:${profile.email}`);
  if (profile.website) lines.push(`URL:${linkify(profile.website)}`);
  if (profile.address) lines.push(`ADR;TYPE=WORK:;;${profile.address.replace(/\n/g, ";")}`);
  lines.push("END:VCARD");

  const vcard = lines.join("\r\n");
  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const filename = `${profile.username || fn || "contact"}.vcf`;
  const file = new File([blob], filename, { type: "text/vcard;charset=utf-8" });

  return { vcard, blob, file, filename };
}


const getSocialIcon = (label: string) => {
  switch (label) {
    case "LinkedIn":   return <Linkedin  className="w-4 h-4 mr-2" />;
    case "X / Twitter": return <Twitter  className="w-4 h-4 mr-2" />;
    case "Instagram":  return <Instagram className="w-4 h-4 mr-2" />;
    case "YouTube":    return <Youtube   className="w-4 h-4 mr-2" />;
    case "Facebook":   return <Facebook  className="w-4 h-4 mr-2" />;
    default:           return <LinkIcon  className="w-4 h-4 mr-2" />;
  }
};

export default function PublicNFCProfile() {
  const location = useLocation();
  const usernameWithHash = location.pathname.slice(1);
  const username = usernameWithHash.replace("#", "");
  const normalizedUsername = useMemo(() => normalizeNfcUsername(username), [username]);

  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string>("");
  const [profile, setProfile] = useState<PublicNfcProfile | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await fetchPublicNfcProfile(normalizedUsername);
        if (!isCancelled) setProfile(result);
      } catch (error: unknown) {
        if (!isCancelled) {
          setError(getErrorMessage(error, "Unable to load profile."));
          setProfile(null);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    if (!normalizedUsername) {
      setLoading(false);
      setError("Invalid username.");
      return;
    }

    void loadProfile();
    return () => { isCancelled = true; };
  }, [normalizedUsername]);

  const tagList = useMemo(
    () =>
      (profile?.businessTags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [profile?.businessTags]
  );

  const subtitle = [profile?.jobTitle, profile?.companyName].filter(Boolean).join(" at ");

  const socialRows = [
    { label: "LinkedIn",   href: profile?.linkedin  },
    { label: "X / Twitter", href: profile?.twitter  },
    { label: "Instagram",  href: profile?.instagram },
    { label: "YouTube",    href: profile?.youtube   },
    { label: "Facebook",   href: profile?.facebook  },
  ].filter((item) => !!item.href);

  const hasContent =
    !!profile &&
    (!!profile.bio ||
      tagList.length > 0 ||
      !!profile.email ||
      !!profile.phone ||
      !!profile.website ||
      !!profile.address ||
      socialRows.length > 0 ||
      (profile.projects?.length || 0) > 0);

  /* ── Handler: Save full contact ── */
  const handleSaveContact = async () => {
    if (!profile) return;
    try {
      const { vcard, filename } = createVCard(profile);
      const nav: any = navigator;

      if (typeof nav.canShare === "function") {
        // Build file only when Web Share is available
        const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
        const file = new File([blob], filename, { type: "text/vcard;charset=utf-8" });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: profile.name || profile.username, text: profile.jobTitle || undefined });
          toast.success("Contact shared");
          return;
        }
      }

      if (typeof (navigator as any).share === "function") {
        await (navigator as any).share({ title: profile.name || profile.username, text: vcard });
        toast.success("Contact shared");
        return;
      }

      // Desktop fallback — use data URI to avoid "can't download securely" warning
      const dataUri = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
      const a = document.createElement("a");
      a.href = dataUri;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("vCard downloaded");
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Unable to share or save contact."));
    }
  };


  return (
    <div className="nfc-public-page">
      <div className="nfc-bg-orb nfc-orb-1" aria-hidden="true" />
      <div className="nfc-bg-orb nfc-orb-2" aria-hidden="true" />

      <main className="nfc-app-shell">
        <section className="nfc-card">
          <header className="nfc-card-header">
            <div className="nfc-header-content">
              {profile?.profilePhoto ? (
                <div className="nfc-profile-photo-container">
                  <img
                    src={profile.profilePhoto}
                    alt={profile.name || profile.username}
                    className="nfc-profile-photo"
                  />
                </div>
              ) : null}

              <div>
                <p className="nfc-eyebrow">NFC Business Profile</p>
                <h1>{profile?.name || (loading ? "Loading..." : normalizedUsername || "NFC Profile")}</h1>
                <p className="nfc-sub-title">{subtitle || "Business profile"}</p>

                <div className="mt-3">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!profile}
                    onClick={handleSaveContact}
                  >
                    Save Contact
                  </Button>
                </div>

                <div className="nfc-header-badges" aria-hidden="true">
                  <span>Live profile</span>
                  <span>PlzPingMe NFC</span>
                  {profile?.username ? <span>Card: {profile.username}</span> : null}
                </div>
              </div>
            </div>
          </header>

          {loading && (
            <div className="nfc-loader-wrap">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <section className="nfc-empty-state">
              <h2>Profile not available</h2>
              <p>{error}</p>
            </section>
          )}

          {!loading && !error && profile && !hasContent && (
            <section className="nfc-empty-state">
              <h2>This profile is currently empty</h2>
              <p>The owner has not added details yet. Please check back soon.</p>
            </section>
          )}

          {!loading && !error && profile && hasContent && (
            <div className="nfc-profile-content">
              {(profile.bio || tagList.length > 0) && (
                <section className="nfc-profile-section">
                  <h3>Basic Information</h3>
                  {profile.bio ? <p>{profile.bio}</p> : null}
                  {tagList.length > 0 && (
                    <div className="nfc-chip-row">
                      {tagList.map((tag) => (
                        <span className="nfc-chip" key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {(profile.email || profile.phone || profile.website || profile.address) && (
                <section className="nfc-profile-section">
                  <h3>Contact Information</h3>
                  <ul className="nfc-detail-list">
                    {profile.email && (
                      <li>
                        <span>Email</span>
                        <a href={`mailto:${profile.email}`}>{profile.email}</a>
                      </li>
                    )}

                    {profile.phone && (
                      <li>
                        <span>Phone</span>
                        <div className="flex items-center gap-2">
                          <a href={`tel:${profile.phone}`}>{profile.phone}</a>
                        </div>
                      </li>
                    )}

                    {profile.website && (
                      <li>
                        <span>Website</span>
                        <a href={linkify(profile.website)} target="_blank" rel="noreferrer">
                          {profile.website}
                        </a>
                      </li>
                    )}

                    {profile.address && (
                      <li>
                        <span>Address</span>
                        <p>{profile.address}</p>
                      </li>
                    )}
                  </ul>
                </section>
              )}

              {socialRows.length > 0 && (
                <section className="nfc-profile-section">
                  <h3>Social Media</h3>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {socialRows.map((social) => (
                      <Button
                        key={social.label}
                        variant="outline"
                        asChild
                        className="rounded-full bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm transition-all"
                      >
                        <a href={linkify(social.href || "")} target="_blank" rel="noreferrer">
                          {getSocialIcon(social.label)}
                          {social.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                </section>
              )}

              {profile.projects && profile.projects.length > 0 && (
                <section className="nfc-profile-section nfc-projects-section">
                  <h3>Projects</h3>
                  <div className="nfc-projects-grid">
                    {profile.projects.map((project, index) => (
                      <article key={`${project.name}-${index}`} className="nfc-project-card">
                        {project.photo ? (
                          <img
                            src={project.photo}
                            alt={project.name}
                            className="nfc-project-photo"
                          />
                        ) : null}
                        <h4>{project.name}</h4>
                        {project.description ? <p>{project.description}</p> : null}
                        {project.link ? (
                          <a href={linkify(project.link)} target="_blank" rel="noreferrer">
                            Visit project
                          </a>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </section>

        {/* ── Powered By Footer ── */}
        <footer className="mt-6 mb-4 flex flex-col items-center gap-1">
          <p
            style={{
              fontSize: "15px",
              letterSpacing: "0.08em",
              color: "rgba(120,120,140,0.75)",
              fontWeight: 400,
            }}
          >
            Powered By{" "}
            <span
              style={{
                fontWeight: 900,
                fontStyle: "italic",
                color: "rgba(90,90,120,0.85)",
                letterSpacing: "0.04em",
              }}
            >
              PingME
            </span>{" "}
            <span style={{ fontWeight: 300, fontSize: "15px" }}>
              — A Brand By Ping IFF LLP
            </span>
          </p>
        </footer>
      </main>
    </div>
  );
}