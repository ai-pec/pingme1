import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import PhoneAuthForm from "@/components/auth/PhoneAuthForm";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (!loading && user) {
      // Phone is verified at sign-in; email is the remaining required info.
      if (profile && !profile.email) {
        navigate("/complete-profile", { replace: true, state: { from } });
      } else {
        navigate(from, { replace: true });
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
      title="Sign in or sign up"
      subtitle="Continue with your phone number"
    >
      <PhoneAuthForm onSuccess={() => navigate(from, { replace: true })} />
    </AuthLayout>
  );
}
