import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Mail, User, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  completeProfileSchema,
  type CompleteProfileFormData,
} from "@/lib/validations/auth";
import { useToast } from "@/hooks/use-toast";

export default function CompleteProfile() {
  const { user, profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      displayName: profile?.displayName || "",
      email: profile?.email || "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from } });
      return;
    }

    // Email already on file — profile is complete, move on.
    if (profile?.email) {
      navigate(from, { replace: true });
      return;
    }

    if (profile) {
      reset({
        displayName: profile.displayName && profile.displayName !== "User" ? profile.displayName : "",
        email: "",
      });
    }
  }, [loading, user, profile, navigate, from, reset]);

  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      await updateProfile({ displayName: data.displayName, email: data.email });
      toast({
        title: "Profile completed",
        description: "Your account is now ready.",
      });
      navigate(from, { replace: true });
    } catch {
      toast({
        title: "Failed to save details",
        description: "Please try again.",
        variant: "destructive",
      });
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
      subtitle="A few details to finish setting up your account"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Your phone <span className="font-medium">+91 {profile.mobile}</span> is
            verified. We need your name and email to send order updates and
            invoices.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                className="pl-10"
                {...register("displayName")}
              />
            </div>
            {errors.displayName && (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save and continue
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
