import { Suspense, lazy, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Loader2, MapPin, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/layouts/MainLayout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { NFCProfileData } from "@/components/NFCProfileBuilder";
import { getUserPrebookings, type PrebookingRecord } from "@/lib/prebookService";
import { getNfcLineProfilesFromOrder } from "@/lib/nfcCheckout";
import type { NFCProfile } from "@/lib/prebookService";
import { getUserProfile } from "@/lib/userService";
import type { UserProfile } from "@/types/user";

import { EmailVerificationBanner } from "@/components/profile/EmailVerificationBanner";
import { PersonalInfoForm } from "@/components/profile/PersonalInfoForm";
import { EmailSettings } from "@/components/profile/EmailSettings";
import { OrderHistory } from "@/components/profile/OrderHistory";
import { SavedPayments } from "@/components/profile/SavedPayments";

const NFCEditModal = lazy(() => import("@/components/profile/NFCEditModal").then((module) => ({ default: module.NFCEditModal })));
const AddressManagement = lazy(() => import("@/components/profile/AddressManagement").then((module) => ({ default: module.AddressManagement })));

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, profile: currentUserProfile, resendVerification, refreshProfile } = useAuth();
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(null);

  // Determine if viewing another user's profile
  const isViewingOtherUser = !!userId && userId !== user?.uid;
  const profile = isViewingOtherUser ? fetchedProfile : currentUserProfile;

  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [selectedNfcOrderId, setSelectedNfcOrderId] = useState<string | null>(null);
  const [selectedNfcLineKey, setSelectedNfcLineKey] = useState<string | null>(null);
  const [selectedNfcLineTitle, setSelectedNfcLineTitle] = useState<string | null>(null);
  const [showAddressManagement, setShowAddressManagement] = useState(false);
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
    staleTime: 5 * 60 * 1000,   // 5 minutes — user profiles rarely change
    gcTime: 10 * 60 * 1000,     // keep in cache for 10 minutes
    refetchOnWindowFocus: false, // don't refetch on tab switch
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["userPrebookings", isViewingOtherUser ? userId : user?.uid],
    queryFn: () => getUserPrebookings({ userId: isViewingOtherUser ? userId! : user!.uid, email: isViewingOtherUser ? undefined : user!.email || undefined }),
    enabled: isViewingOtherUser ? !!userId : !!user?.uid,
    staleTime: 60 * 1000,        // 60 seconds — orders don't update that often
    gcTime: 5 * 60 * 1000,      // keep in cache for 5 minutes
    refetchOnWindowFocus: false, // don't refetch on tab switch
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

  const buildNfcDraft = (order: PrebookingRecord, nfcProfile?: NFCProfile): NFCProfileData => ({
    username: nfcProfile?.username || "",
    name: nfcProfile?.name || order.fullName || profile?.displayName || "",
    companyName: nfcProfile?.companyName || "",
    jobTitle: nfcProfile?.jobTitle || "",
    email: nfcProfile?.email || order.email || user?.email || "",
    phone: nfcProfile?.phone || order.phone || profile?.mobile || "",
    bio: nfcProfile?.bio || "",
    businessTags: nfcProfile?.businessTags || "",
    website: nfcProfile?.website || "",
    address: nfcProfile?.address || [order.address, order.city].filter(Boolean).join(", "),
    linkedin: nfcProfile?.linkedin || "",
    twitter: nfcProfile?.twitter || "",
    instagram: nfcProfile?.instagram || "",
    youtube: nfcProfile?.youtube || "",
    facebook: nfcProfile?.facebook || "",
    profilePhoto: nfcProfile?.profilePhoto || "",
    projects: nfcProfile?.projects || [],
  });

  const openEditNFC = (order: PrebookingRecord, lineKey?: string, lineTitle?: string) => {
    const lines = getNfcLineProfilesFromOrder(order);
    const line = lineKey ? lines.find((l) => l.lineKey === lineKey) : lines[0];
    const nfcProfile = line?.nfcProfile || order.nfcProfile;

    setSelectedNfcOrderId(order.id);
    setSelectedNfcLineKey(line?.lineKey || lineKey || null);
    setSelectedNfcLineTitle(lineTitle || line?.title || null);
    setNfcProfileDraft(buildNfcDraft(order, nfcProfile));
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

              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <NFCEditModal
                  open={nfcDialogOpen}
                  onOpenChange={(open) => {
                    setNfcDialogOpen(open);
                    if (!open) {
                      setSelectedNfcOrderId(null);
                      setSelectedNfcLineKey(null);
                      setSelectedNfcLineTitle(null);
                    }
                  }}
                  orderId={selectedNfcOrderId}
                  lineKey={selectedNfcLineKey}
                  lineTitle={selectedNfcLineTitle}
                  profileDraft={nfcProfileDraft}
                  setProfileDraft={setNfcProfileDraft}
                />
              </Suspense>
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
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Saved Delivery Addresses</h3>
                      <p className="text-sm text-muted-foreground">
                        {profile?.addresses?.length ? `${profile.addresses.length} saved address${profile.addresses.length > 1 ? "es" : ""} available.` : "Keep addresses ready for faster checkout."}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:self-start"
                    onClick={() => setShowAddressManagement((open) => !open)}
                  >
                    {showAddressManagement ? "Hide Addresses" : "Manage Addresses"}
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAddressManagement ? "rotate-180" : ""}`} />
                  </Button>
                </div>

                {showAddressManagement && (
                  <div className="mt-5 border-t border-border pt-5">
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <AddressManagement />
                    </Suspense>
                  </div>
                )}
              </div>
            <OrderHistory orders={orders} ordersLoading={ordersLoading} onEditNFC={openEditNFC} />
            <SavedPayments />

            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              }
            >
              <NFCEditModal
                open={nfcDialogOpen}
                onOpenChange={(open) => {
                  setNfcDialogOpen(open);
                  if (!open) {
                    setSelectedNfcOrderId(null);
                    setSelectedNfcLineKey(null);
                    setSelectedNfcLineTitle(null);
                  }
                }}
                orderId={selectedNfcOrderId}
                lineKey={selectedNfcLineKey}
                lineTitle={selectedNfcLineTitle}
                profileDraft={nfcProfileDraft}
                setProfileDraft={setNfcProfileDraft}
              />
            </Suspense>
          </div>
        </div>
      </MainLayout>
    );
}
