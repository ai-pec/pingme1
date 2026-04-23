import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Globe, Mail, Phone, MapPin, Building2, Briefcase, ArrowLeft } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchPublicNfcProfile, normalizeNfcUsername, type PublicNfcProfile } from "@/lib/publicNfcService";

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
  const navigate = useNavigate();
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

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {loading && (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <Card>
            <CardHeader>
              <CardTitle>Profile not available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && profile && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    {profile.profilePhoto ? (
                      <img
                        src={profile.profilePhoto}
                        alt={profile.name || profile.username}
                        className="h-20 w-20 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full border bg-muted flex items-center justify-center text-2xl font-semibold">
                        {(profile.name || profile.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      {(profile.companyName || profile.jobTitle) && (
                        <p className="text-sm mt-1 text-muted-foreground">
                          {[profile.jobTitle, profile.companyName].filter(Boolean).join(" at ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">PingME NFC Profile</Badge>
                </div>
              </CardContent>
            </Card>

            {profile.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {profile.email && (
                  <a className="flex items-center gap-2 text-primary hover:underline" href={`mailto:${profile.email}`}>
                    <Mail className="h-4 w-4" /> {profile.email}
                  </a>
                )}
                {profile.phone && (
                  <a className="flex items-center gap-2 text-primary hover:underline" href={`tel:${profile.phone}`}>
                    <Phone className="h-4 w-4" /> {profile.phone}
                  </a>
                )}
                {profile.website && (
                  <a
                    className="flex items-center gap-2 text-primary hover:underline"
                    href={linkify(profile.website)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe className="h-4 w-4" /> {profile.website}
                  </a>
                )}
                {profile.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-1" />
                    <span>{profile.address}</span>
                  </div>
                )}
                {profile.companyName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{profile.companyName}</span>
                  </div>
                )}
                {profile.jobTitle && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{profile.jobTitle}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {profile.businessTags && (
              <Card>
                <CardHeader>
                  <CardTitle>Business Tags</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {profile.businessTags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                </CardContent>
              </Card>
            )}

            {profile.projects && profile.projects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Projects</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {profile.projects.map((project, index) => (
                    <div key={`${project.name}-${index}`} className="rounded-lg border p-4 space-y-2">
                      <h3 className="font-semibold">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      )}
                      {project.link && (
                        <a
                          className="text-sm text-primary hover:underline"
                          href={linkify(project.link)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visit project
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
