import { AlertTriangle, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "firebase/auth";

interface EmailVerificationBannerProps {
  user: User;
  resending: boolean;
  refreshing: boolean;
  onResend: () => void;
  onRefresh: () => void;
}

export function EmailVerificationBanner({
  user,
  resending,
  refreshing,
  onResend,
  onRefresh,
}: EmailVerificationBannerProps) {
  if (user?.emailVerified) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-400">
            Verify your email address
          </h3>
          <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">
            Please check your inbox ({user.email}) to verify your account and
            activate your NFC card link.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          className="w-full sm:w-auto border-amber-500/20 hover:bg-amber-500/10"
          onClick={onResend}
          disabled={resending}
        >
          {resending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Resend email
        </Button>
        <Button
          variant="default"
          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          I've verified
        </Button>
      </div>
    </div>
  );
}
