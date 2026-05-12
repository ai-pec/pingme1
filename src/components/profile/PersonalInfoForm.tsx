import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { profileSchema, type ProfileFormData } from "@/lib/validations/auth";

export function PersonalInfoForm() {
  const { user, profile, updateProfile } = useAuth();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.displayName || user?.displayName || "",
      mobile: profile?.mobile || "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || "",
        mobile: profile.mobile || "",
      });
    }
  }, [profile, form]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => updateProfile(data),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update profile. Please try again.");
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your name and contact details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  placeholder="Your name"
                  className="pl-10"
                  {...form.register("displayName")}
                />
              </div>
              {form.formState.errors.displayName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.displayName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  className="pl-10"
                  {...form.register("mobile")}
                />
              </div>
              {form.formState.errors.mobile && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.mobile.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending || !form.formState.isDirty}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
