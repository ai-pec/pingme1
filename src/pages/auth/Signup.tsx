import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";
import { Loader2 } from "lucide-react";

export default function Signup() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (!loading && user) {
      if (profile?.authProvider === "google" && !profile.mobile) {
        navigate("/complete-phone", { replace: true, state: { from } });
      } else if (!user.emailVerified) {
        navigate("/verify-email");
      } else {
        navigate("/");
      }
    }
  }, [user, profile, loading, navigate, from]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Get started with PingME today"
    >
      <SignupForm onSuccess={() => navigate("/verify-email")} />
    </AuthLayout>
  );
}
