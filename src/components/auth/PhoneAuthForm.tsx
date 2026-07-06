import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Phone, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  phoneSchema,
  otpSchema,
  type PhoneFormData,
  type OtpFormData,
} from "@/lib/validations/auth";

interface PhoneAuthFormProps {
  onSuccess?: () => void;
}

// Hidden container Firebase mounts the invisible reCAPTCHA into.
const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

export default function PhoneAuthForm({ onSuccess }: PhoneAuthFormProps) {
  const { sendOtp, verifyOtp, resetOtp, otpSent, error, clearError } = useAuth();
  const [submittedMobile, setSubmittedMobile] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { mobile: "" },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const onSendOtp = async (data: PhoneFormData) => {
    try {
      setSending(true);
      clearError();
      await sendOtp(data.mobile, RECAPTCHA_CONTAINER_ID);
      setSubmittedMobile(data.mobile);
    } catch {
      // Error surfaced via AuthContext
    } finally {
      setSending(false);
    }
  };

  const onVerifyOtp = async (data: OtpFormData) => {
    try {
      setVerifying(true);
      clearError();
      await verifyOtp(data.code);
      onSuccess?.();
    } catch {
      // Error surfaced via AuthContext
    } finally {
      setVerifying(false);
    }
  };

  const handleChangeNumber = () => {
    resetOtp();
    otpForm.reset();
    setSubmittedMobile("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Sign in securely with your phone number. We'll text you a one-time
          code to verify it's you.
        </p>
      </div>

      {!otpSent ? (
        <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">Phone Number</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                +91
              </span>
              <Phone className="absolute left-12 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9876543210"
                className="pl-20"
                {...phoneForm.register("mobile")}
              />
            </div>
            {phoneForm.formState.errors.mobile && (
              <p className="text-sm text-destructive">
                {phoneForm.formState.errors.mobile.message}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Enter OTP</Label>
            <p className="text-sm text-muted-foreground">
              Sent to <span className="font-medium">+91 {submittedMobile}</span>
            </p>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="tracking-[0.5em] text-center text-lg"
              {...otpForm.register("code")}
            />
            {otpForm.formState.errors.code && (
              <p className="text-sm text-destructive">
                {otpForm.formState.errors.code.message}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={verifying}>
            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify &amp; Continue
          </Button>

          <button
            type="button"
            onClick={handleChangeNumber}
            className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change number
          </button>
        </form>
      )}

      {/* Invisible reCAPTCHA mounts here — required by Firebase Phone Auth. */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </div>
  );
}
