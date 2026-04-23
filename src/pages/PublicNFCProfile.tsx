import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchPublicNfcProfile, normalizeNfcUsername, type PublicNfcProfile } from "@/lib/publicNfcService";
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

export default function PublicNFCProfile() {
  const { username = "" } = useParams();
  const normalizedUsername = useMemo(() => normalizeNfcUsername(username), [username]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [profile, setProfile] = useState<PublicNfcProfile | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await fetchPublicNfcProfile(normalizedUsername);
        if (!isCancelled) {
          setProfile(result);
        }
      } catch (error: unknown) {
        if (!isCancelled) {
          setError(getErrorMessage(error, "Unable to load profile."));
          setProfile(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    if (!normalizedUsername) {
      setLoading(false);
      setError("Invalid username.");
      return;
    }

    void loadProfile();

    return () => {
      isCancelled = true;
    };
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
    { label: "LinkedIn", href: profile?.linkedin },
    { label: "X / Twitter", href: profile?.twitter },
    { label: "Instagram", href: profile?.instagram },
    { label: "YouTube", href: profile?.youtube },
    { label: "Facebook", href: profile?.facebook },
  ].filter((item) => !!item.href);

  const hasContent = !!profile && (
    !!profile.bio ||
    tagList.length > 0 ||
    !!profile.email ||
    !!profile.phone ||
    !!profile.website ||
    !!profile.address ||
    socialRows.length > 0 ||
    (profile.projects?.length || 0) > 0
  );

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
                        <span className="nfc-chip" key={tag}>
                          {tag}
                        </span>
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
                        <a href={`tel:${profile.phone}`}>{profile.phone}</a>
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
                  <ul className="nfc-detail-list">
                    {socialRows.map((social) => (
                      <li key={social.label}>
                        <span>{social.label}</span>
                        <a href={linkify(social.href || "")} target="_blank" rel="noreferrer">
                          {social.href}
                        </a>
                      </li>
                    ))}
                  </ul>
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
      </main>
    </div>
  );
}
