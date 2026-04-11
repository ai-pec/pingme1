import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";

export default function VerifyEmail() {
  const { user, resendVerification, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    try {
      setLoading(true);
      await resendVerification();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Reload the page to check if email is verified
    window.location.reload();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <AuthLayout title="Verify your email">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Please sign in to verify your email.
          </p>
          <Link to="/login">
            <Button className="w-full">Go to login</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (user.emailVerified) {
    return (
      <AuthLayout title="Email verified">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold">You're all set!</h3>
          <p className="text-muted-foreground text-sm">
            Your email has been verified. You can now use all features.
          </p>
          <Link to="/">
            <Button className="w-full">Go to home</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We've sent a verification link to your email"
    >
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            We sent a verification email to:
          </p>
          <p className="font-medium">{user.email}</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Click the link in the email to verify your account. If you don't see
          it, check your spam folder.
        </p>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRefresh}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            I've verified, refresh
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleResend}
            disabled={loading || resent}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {resent ? "Email sent!" : "Resend verification email"}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out and use a different email
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
