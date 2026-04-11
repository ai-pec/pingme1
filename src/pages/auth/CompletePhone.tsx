import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { mobileOnlySchema, type MobileOnlyFormData } from "@/lib/validations/auth";
import { useToast } from "@/hooks/use-toast";

export default function CompletePhone() {
  const { user, profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MobileOnlyFormData>({
    resolver: zodResolver(mobileOnlySchema),
    defaultValues: { mobile: profile?.mobile || "" },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from } });
      return;
    }

    if (profile?.mobile) {
      navigate(from, { replace: true });
      return;
    }

    if (profile?.mobile === "") {
      setValue("mobile", "");
    }
  }, [loading, user, profile, navigate, from, setValue]);

  const onSubmit = async (data: MobileOnlyFormData) => {
    try {
      setSaving(true);
      await updateProfile({ mobile: data.mobile });
      toast({
        title: "Phone saved",
        description: "Your account is now complete.",
      });
      navigate(from, { replace: true });
    } catch {
      toast({
        title: "Failed to save phone number",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !profile) {
    return (
      <AuthLayout title="Complete your profile" subtitle="Please wait while we load your account">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Complete your profile"
      subtitle="Add your mobile number to finish Google signup"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            We need your phone number so people can contact you if they find your
            tag, NFC card, or sticker.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="mobile"
                type="tel"
                placeholder="9876543210"
                className="pl-10"
                {...register("mobile")}
              />
            </div>
            {errors.mobile && (
              <p className="text-sm text-destructive">{errors.mobile.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save and continue
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}