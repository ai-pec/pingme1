import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { canAccessAdminPanel } from "@/lib/adminAccess";
import { Button } from "@/components/ui/button";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      if (!user) {
        if (active) {
          setCheckingAccess(false);
        }
        return;
      }

      try {
        const allowed = await canAccessAdminPanel();
        if (active) {
          setHasAccess(allowed);
          setAccessError(null);
        }
      } catch {
        if (active) {
          setHasAccess(false);
          setAccessError("Unable to verify admin access right now. Please retry.");
        }
      } finally {
        if (active) {
          setCheckingAccess(false);
        }
      }
    };

    checkAccess();

    return () => {
      active = false;
    };
  }, [user, retryKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <p className="text-sm text-muted-foreground">{accessError}</p>
          <Button onClick={() => setRetryKey((value) => value + 1)}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
