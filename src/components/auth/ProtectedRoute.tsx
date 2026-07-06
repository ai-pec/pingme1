import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  // When true, the user must have completed their profile (email on file).
  requireCompleteProfile?: boolean;
}

export default function ProtectedRoute({
  children,
  requireCompleteProfile = true,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Phone is verified at sign-in; email is the remaining mandatory detail.
  if (requireCompleteProfile && profile && !profile.email) {
    return (
      <Navigate to="/complete-profile" state={{ from: location }} replace />
    );
  }

  return <>{children}</>;
}
