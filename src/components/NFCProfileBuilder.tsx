import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Info } from "lucide-react";

export interface NFCProfileData {
  name: string;
  email: string;
  phone: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
}

interface NFCProfileBuilderProps {
  profileData: NFCProfileData;
  onProfileChange: (data: NFCProfileData) => void;
  onBack: () => void;
  onContinue: () => void;
  isLoading?: boolean;
}

export default function NFCProfileBuilder({
  profileData,
  onProfileChange,
  onBack,
  onContinue,
  isLoading = false,
}: NFCProfileBuilderProps) {
  const handleInputChange = (field: keyof NFCProfileData, value: string) => {
    onProfileChange({
      ...profileData,
      [field]: value,
    });
  };

  const isValid = profileData.name.trim() && profileData.email.trim() && profileData.phone.trim();

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Delivery Details
        </button>
        <h2 className="text-2xl font-bold">Build Your NFC Profile</h2>
        <p className="text-muted-foreground mt-2">
          This information will be embedded in your NFC card. You can edit it anytime after receiving the card.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            The NFC card will contain your profile information so it's not empty when received. Share your contact details and social links to make it easy for people to connect with you.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Required Fields Section */}
        <div className="border-b border-border pb-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Required Information
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-name">Full Name *</Label>
              <Input
                id="profile-name"
                placeholder="Your full name"
                value={profileData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be displayed when someone scans your NFC card
              </p>
            </div>

            <div>
              <Label htmlFor="profile-email">Email Address *</Label>
              <Input
                id="profile-email"
                type="email"
                placeholder="you@example.com"
                value={profileData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-phone">Phone Number *</Label>
              <Input
                id="profile-phone"
                placeholder="+91 9876543210"
                value={profileData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Optional Fields Section */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Optional Information
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-bio">Bio / About You</Label>
              <Textarea
                id="profile-bio"
                placeholder="Tell people about yourself (e.g., freelancer, entrepreneur, student)"
                value={profileData.bio || ""}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                className="mt-1 resize-none"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max 200 characters for NFC compatibility
              </p>
            </div>

            <div>
              <Label htmlFor="profile-website">Website / Portfolio</Label>
              <Input
                id="profile-website"
                type="url"
                placeholder="https://yourwebsite.com"
                value={profileData.website || ""}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-linkedin">LinkedIn Profile</Label>
              <Input
                id="profile-linkedin"
                placeholder="https://linkedin.com/in/yourprofile"
                value={profileData.linkedin || ""}
                onChange={(e) => handleInputChange("linkedin", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-twitter">X / Twitter Profile</Label>
              <Input
                id="profile-twitter"
                placeholder="https://x.com/yourhandle"
                value={profileData.twitter || ""}
                onChange={(e) => handleInputChange("twitter", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-instagram">Instagram Profile</Label>
              <Input
                id="profile-instagram"
                placeholder="https://instagram.com/yourhandle"
                value={profileData.instagram || ""}
                onChange={(e) => handleInputChange("instagram", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-facebook">Facebook Profile</Label>
              <Input
                id="profile-facebook"
                placeholder="https://facebook.com/yourprofile"
                value={profileData.facebook || ""}
                onChange={(e) => handleInputChange("facebook", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
            disabled={isLoading}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="flex-1"
            disabled={!isValid || isLoading}
          >
            {isLoading ? "Processing..." : "Continue to Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
