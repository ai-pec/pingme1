import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/layouts/MainLayout";
import { toast } from "sonner";
import type { NFCProfileData } from "@/components/NFCProfileBuilder";
import { getUserPrebookings, type PrebookingRecord } from "@/lib/prebookService";
import { getUserProfile } from "@/lib/userService";
import type { UserProfile } from "@/types/user";

import { EmailVerificationBanner } from "@/components/profile/EmailVerificationBanner";
import { PersonalInfoForm } from "@/components/profile/PersonalInfoForm";
import { EmailSettings } from "@/components/profile/EmailSettings";
import { AddressManagement } from "@/components/profile/AddressManagement";
import { OrderHistory } from "@/components/profile/OrderHistory";
import { SavedPayments } from "@/components/profile/SavedPayments";
import { NFCEditModal } from "@/components/profile/NFCEditModal";

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, profile: currentUserProfile, resendVerification, refreshProfile } = useAuth();
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(null);

  // Determine if viewing another user's profile
  const isViewingOtherUser = !!userId && userId !== user?.uid;
  const profile = isViewingOtherUser ? fetchedProfile : currentUserProfile;

  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [selectedNfcOrderId, setSelectedNfcOrderId] = useState<string | null>(null);
  const [nfcProfileDraft, setNfcProfileDraft] = useState<NFCProfileData>({
    username: "",
    name: "",
    companyName: "",
    jobTitle: "",
    email: "",
    phone: "",
    bio: "",
    businessTags: "",
    website: "",
    address: "",
    linkedin: "",
    twitter: "",
    instagram: "",
    youtube: "",
    facebook: "",
    profilePhoto: "",
    projects: [],
  });

  // Fetch other user's profile if userId parameter is provided
  const { isLoading: fetchingOtherProfile } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const userProfile = await getUserProfile(userId);
      if (userProfile) {
        setFetchedProfile(userProfile);
      }
      return userProfile;
    },
    enabled: !!userId && userId !== user?.uid,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["userPrebookings", isViewingOtherUser ? userId : user?.uid],
    queryFn: () => getUserPrebookings({ userId: isViewingOtherUser ? userId! : user!.uid, email: isViewingOtherUser ? undefined : user!.email || undefined }),
    enabled: isViewingOtherUser ? !!userId : !!user?.uid,
  });

  const resendMutation = useMutation({
    mutationFn: resendVerification,
    onSuccess: () => {
      toast.success("Verification email sent! Please check your inbox.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to send verification email.");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshProfile,
    onSuccess: () => {
      if (user?.emailVerified) {
        toast.success("Email verified successfully!");
      } else {
        toast.info("Email not yet verified. Please check your inbox.");
      }
    },
    onError: () => {
      toast.error("Failed to check verification status.");
    },
  });

  const openEditNFC = (order: PrebookingRecord) => {
    setSelectedNfcOrderId(order.id);
    setNfcProfileDraft({
      username: order.nfcProfile?.username || "",
      name: order.nfcProfile?.name || order.fullName || profile?.displayName || "",
      companyName: order.nfcProfile?.companyName || "",
      jobTitle: order.nfcProfile?.jobTitle || "",
      email: order.nfcProfile?.email || order.email || user?.email || "",
      phone: order.nfcProfile?.phone || order.phone || profile?.mobile || "",
      bio: order.nfcProfile?.bio || "",
      businessTags: order.nfcProfile?.businessTags || "",
      website: order.nfcProfile?.website || "",
      address: order.nfcProfile?.address || [order.address, order.city].filter(Boolean).join(", "),
      linkedin: order.nfcProfile?.linkedin || "",
      twitter: order.nfcProfile?.twitter || "",
      instagram: order.nfcProfile?.instagram || "",
      youtube: order.nfcProfile?.youtube || "",
      facebook: order.nfcProfile?.facebook || "",
      profilePhoto: order.nfcProfile?.profilePhoto || "",
      projects: order.nfcProfile?.projects || [],
    });
    setNfcDialogOpen(true);
  };


    // If not signed in at all, show login prompt (ProtectedRoute normally handles this)
    if (!user) {
      return (
        <MainLayout>
          <div className="container py-8 flex items-center justify-center min-h-[60vh]">
            <p className="text-sm text-muted-foreground">You must be signed in to view profiles.</p>
          </div>
        </MainLayout>
      );
    }

    // Viewing another user's profile: wait for fetch or show not-found
    if (isViewingOtherUser) {
      if (fetchingOtherProfile) {
        return (
          <MainLayout>
            <div className="container py-8 flex items-center justify-center min-h-[60vh]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </MainLayout>
        );
      }

      if (!fetchedProfile) {
        return (
          <MainLayout>
            <div className="container py-8 flex items-center justify-center min-h-[60vh]">
              <p className="text-sm text-muted-foreground">User profile not found.</p>
            </div>
          </MainLayout>
        );
      }
    }

    // Viewing own profile: ensure the current profile is loaded
    if (!isViewingOtherUser && !profile) {
      return (
        <MainLayout>
          <div className="container py-8 flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </MainLayout>
      );
    }

    // If viewing another user's profile, show read-only customer view
    if (isViewingOtherUser) {
      return (
        <MainLayout>
          <div className="container max-w-3xl py-8">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Customer Profile</h1>
                <p className="text-muted-foreground">Viewing information for {fetchedProfile?.displayName || "Customer"}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p><span className="font-medium">Name:</span> {fetchedProfile?.displayName || "-"}</p>
                <p><span className="font-medium">Email:</span> {fetchedProfile?.email || "-"}</p>
                <p><span className="font-medium">Mobile:</span> {fetchedProfile?.mobile || "-"}</p>
                <p><span className="font-medium">Joined:</span> {fetchedProfile?.createdAt ? new Date((fetchedProfile.createdAt as any).seconds * 1000).toLocaleString() : "-"}</p>
              </div>

              <OrderHistory orders={orders} ordersLoading={ordersLoading} onEditNFC={openEditNFC} />

              <NFCEditModal
                open={nfcDialogOpen}
                onOpenChange={(open) => {
                  setNfcDialogOpen(open);
                  if (!open) {
                    setSelectedNfcOrderId(null);
                  }
                }}
                orderId={selectedNfcOrderId}
                profileDraft={nfcProfileDraft}
                setProfileDraft={setNfcProfileDraft}
              />
            </div>
          </div>
        </MainLayout>
      );
    }

    // Default: viewing own profile (editable)
    return (
      <MainLayout>
        <div className="container max-w-3xl py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account information and delivery preferences</p>
            </div>

            <EmailVerificationBanner
              user={user}
              resending={resendMutation.isPending}
              refreshing={refreshMutation.isPending}
              onResend={() => resendMutation.mutate()}
              onRefresh={() => refreshMutation.mutate()}
            />

            <PersonalInfoForm />
            <EmailSettings />
            <AddressManagement />
            <OrderHistory orders={orders} ordersLoading={ordersLoading} onEditNFC={openEditNFC} />
            <SavedPayments />

            <NFCEditModal
              open={nfcDialogOpen}
              onOpenChange={(open) => {
                setNfcDialogOpen(open);
                if (!open) {
                  setSelectedNfcOrderId(null);
                }
              }}
              orderId={selectedNfcOrderId}
              profileDraft={nfcProfileDraft}
              setProfileDraft={setNfcProfileDraft}
            />
          </div>
        </div>
      </MainLayout>
    );
}
