import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  intent?: "signin" | "signup";
}

type GoogleAuthError = Error & {
  code?: string;
  email?: string;
};

export default function GoogleAuthButton({ onSuccess, intent = "signin" }: GoogleAuthButtonProps) {
  const { signInGoogle, completeLinkWithPassword, pendingGoogleLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // State for the inline password prompt shown when linking is needed
  const [linkPassword, setLinkPassword] = useState("");
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInGoogle(intent === "signin");
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as GoogleAuthError;

      // Existing email/password account — show inline password prompt to link accounts
      if (err?.code === "auth/needs-password-for-linking") {
        // pendingGoogleLink is now set in AuthContext; the UI below will render
        setLoading(false);
        return;
      }

      if (intent === "signin" && err?.code === "auth/google-account-not-registered") {
        toast({
          title: "Signup required",
          description: "You have not signed up with this Google account yet. Please complete signup first.",
          variant: "destructive",
        });

        navigate("/signup", {
          state: {
            from: location.state?.from,
            googleEmail: err?.email || "",
          },
        });
        return;
      }

      toast({
        title: "Google sign-in failed",
        description: err?.message || "Unable to sign in with Google right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPassword) return;
    try {
      setLinkLoading(true);
      await completeLinkWithPassword(linkPassword);
      toast({
        title: "Accounts linked",
        description: "Your Google account is now linked. You can sign in with either method.",
      });
      setLinkPassword("");
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as GoogleAuthError;
      toast({
        title: "Linking failed",
        description: err?.message || "Incorrect password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLinkLoading(false);
    }
  };

  // Show the inline linking prompt when we have a pending Google credential
  if (pendingGoogleLink) {
    return (
      <form onSubmit={handleLinkSubmit} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          An account already exists for{" "}
          <span className="font-medium text-foreground">{pendingGoogleLink.email}</span>.
          Enter your password to link your Google account.
        </p>
        <div className="space-y-1">
          <Label htmlFor="link-password">Password</Label>
          <div className="relative">
            <Input
              id="link-password"
              type={showLinkPassword ? "text" : "password"}
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowLinkPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showLinkPassword ? "Hide password" : "Show password"}
            >
              {showLinkPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={linkLoading || !linkPassword}>
          {linkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Link Google Account &amp; Sign In
        </Button>
      </form>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}
