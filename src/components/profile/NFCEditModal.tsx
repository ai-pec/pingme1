import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import NFCProfileBuilder, { type NFCProfileData } from "@/components/NFCProfileBuilder";
import {
  checkUsernameUniqueness,
  generateUsernameSuggestions,
} from "@/lib/publicNfcService";
import { updatePrebookingNFCProfile, type PrebookingRecord } from "@/lib/prebookService";
import { getNfcLineProfilesFromOrder, resolveNfcProfileDocId } from "@/lib/nfcCheckout";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface NFCEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  lineKey?: string | null;
  lineTitle?: string | null;
  profileDraft: NFCProfileData;
  setProfileDraft: (data: NFCProfileData) => void;
}

export function NFCEditModal({
  open,
  onOpenChange,
  orderId,
  lineKey,
  lineTitle,
  profileDraft,
  setProfileDraft,
}: NFCEditModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [originalProfile, setOriginalProfile] = useState<NFCProfileData | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setOriginalProfile(profileDraft);
      setUnsavedChanges(false);
      setShowDiscardConfirm(false);
    }
  }, [open]);

  const handleProfileChange = (data: NFCProfileData) => {
    setProfileDraft(data);
    setUnsavedChanges(JSON.stringify(data) !== JSON.stringify(originalProfile));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && unsavedChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    if (!nextOpen) {
      setUnsavedChanges(false);
      setShowDiscardConfirm(false);
      setOriginalProfile(null);
    }
    onOpenChange(nextOpen);
  };

  const updateNFCMutation = useMutation({
    mutationFn: async () => {
      if (!orderId || !user?.uid) throw new Error("Missing order information");

      const orders = queryClient.getQueryData<PrebookingRecord[]>(["userPrebookings", user.uid]) || [];
      const selectedOrder = orders.find((order) => order.id === orderId);
      const paymentOrderId = selectedOrder?.payment?.orderId;
      const hasStoredLineProfiles = Boolean(selectedOrder?.nfcLineProfiles?.length);
      const lineProfileCount = selectedOrder ? getNfcLineProfilesFromOrder(selectedOrder).length : 0;
      const shouldUseLineProfile = hasStoredLineProfiles || lineProfileCount > 1;
      const effectiveLineKey = shouldUseLineProfile ? lineKey : null;

      const profileId = resolveNfcProfileDocId({
        paymentOrderId,
        bookingId: orderId,
        lineKey: effectiveLineKey,
        hasStoredLineProfiles: shouldUseLineProfile,
      });

      if (profileDraft.username) {
        const isTaken = await checkUsernameUniqueness(profileDraft.username, {
          profileDocId: profileId,
          paymentOrderId,
          bookingId: orderId,
          lineKey: effectiveLineKey,
          hasStoredLineProfiles: shouldUseLineProfile,
        });
        if (isTaken) {
          const suggestions = await generateUsernameSuggestions(
            profileDraft.name || profileDraft.username
          );
          throw new Error(
            `This username is already taken. Try: ${suggestions.join(", ")}`
          );
        }
      }

      await updatePrebookingNFCProfile(
        orderId,
        profileDraft,
        profileId,
        effectiveLineKey || undefined
      );

      return { orderId, lineKey: effectiveLineKey, profileDraft };
    },
    onSuccess: (data) => {
      toast.success("NFC profile updated successfully!");
      if (user?.uid) {
        queryClient.setQueryData<PrebookingRecord[]>(
          ["userPrebookings", user.uid],
          (old) =>
            old?.map((order) => {
              if (order.id !== data.orderId) return order;

              if (data.lineKey) {
                const nfcLineProfiles = getNfcLineProfilesFromOrder(order).map((line) =>
                  line.lineKey === data.lineKey
                    ? { ...line, nfcProfile: { ...data.profileDraft } }
                    : line
                );

                return {
                  ...order,
                  nfcLineProfiles,
                  ...(nfcLineProfiles.length === 1
                    ? { nfcProfile: { ...data.profileDraft } }
                    : {}),
                };
              }

              return { ...order, nfcProfile: { ...data.profileDraft } };
            })
        );
      }
      setUnsavedChanges(false);
      setShowDiscardConfirm(false);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Failed to update NFC profile. Please try again.";
      toast.error(message);
      console.error("NFC profile save error:", error);
    },
  });

  const modalTitle = lineTitle
    ? `Edit NFC Profile — ${lineTitle}`
    : "Edit NFC Profile";

  return (
    <Dialog open={open || showDiscardConfirm} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-hidden p-0">
        <div
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6"
          data-lenis-prevent
        >
        {showDiscardConfirm ? (
          <>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes. Are you sure you want to close without saving?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Keep Editing
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (originalProfile) {
                    setProfileDraft(originalProfile);
                  }
                  setShowDiscardConfirm(false);
                  setUnsavedChanges(false);
                  onOpenChange(false);
                }}
              >
                Discard Changes
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
              <DialogDescription>
                Update the NFC profile linked to this card. Changes apply only to this
                card&apos;s public link.
              </DialogDescription>
            </DialogHeader>
            <NFCProfileBuilder
              profileData={profileDraft}
              onProfileChange={handleProfileChange}
              onBack={() => handleOpenChange(false)}
              onContinue={() => updateNFCMutation.mutate()}
              isLoading={updateNFCMutation.isPending}
              title={lineTitle ? `Edit Profile — ${lineTitle}` : "Edit Your NFC Profile"}
              description="Keep your NFC card profile up to date from your account dashboard."
              infoText="These details power your public NFC page link. Your username is permanent and cannot be changed — all other fields can be updated anytime."
              backLabel="Cancel"
              continueLabel="Save NFC Profile"
              variant="edit"
            />
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
