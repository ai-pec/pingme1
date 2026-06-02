import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Mail, CheckCircle, AlertCircle, Loader2, Edit2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { emailChangeSchema, type EmailChangeFormData } from "@/lib/validations/auth";
import { APP_CONFIG } from "@/config/constants";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export function EmailSettings() {
  const { user, profile, changeUserEmail, resendVerification } = useAuth();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const emailForm = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: "",
      password: "",
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerification,
    onSuccess: () => {
      toast.success("Verification email sent! Please check your inbox.");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to send verification email."));
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: (data: EmailChangeFormData) => changeUserEmail(data.password, data.newEmail),
    onSuccess: () => {
      toast.success("Email changed! Please verify your new email address.");
      setEmailDialogOpen(false);
      emailForm.reset();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to change email."));
    },
  });

  const onEmailSubmit = (data: EmailChangeFormData) => {
    changeEmailMutation.mutate(data);
  };

  if (!user || !profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Settings
        </CardTitle>
        <CardDescription>
          Manage your email address and verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {user.emailVerified ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700"
                  >
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Not verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user.emailVerified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Verify Email
              </Button>
            )}
            {profile.authProvider === "email" && (
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit2 className="mr-2 h-4 w-4" />
                    Change email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change email address</DialogTitle>
                    <DialogDescription>
                      Enter your new email address and current password. You'll
                      need to verify your new email.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                    className="space-y-4 mt-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">New Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newEmail"
                          type="email"
                          placeholder="newemail@example.com"
                          className="pl-10"
                          {...emailForm.register("newEmail")}
                        />
                      </div>
                      {emailForm.formState.errors.newEmail && (
                        <p className="text-sm text-destructive">
                          {emailForm.formState.errors.newEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10"
                          {...emailForm.register("password")}
                        />
                      </div>
                      {emailForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {emailForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEmailDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={changeEmailMutation.isPending}>
                        {changeEmailMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Change email
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {!user.emailVerified && (
          <p className="text-sm text-muted-foreground">
            A verification email will be sent from{" "}
            <span className="font-medium">{APP_CONFIG.SUPPORT_EMAIL}</span>. Check your
            spam folder if you don't see it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
