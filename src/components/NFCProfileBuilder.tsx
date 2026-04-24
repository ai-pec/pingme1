import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Info } from "lucide-react";

const MAX_IMAGE_DATA_URL_LENGTH = 850000;
const MAX_IMAGE_DIMENSION = 1200;

const readImageFileAsDataUrl = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file.");
  }

  const imageBitmap = await createImageBitmap(file);
  let width = imageBitmap.width;
  let height = imageBitmap.height;

  if (Math.max(width, height) > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image.");
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  let quality = 0.86;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    let currentWidth = width;
    let currentHeight = height;

    while (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH && currentWidth > 420 && currentHeight > 420) {
      currentWidth = Math.round(currentWidth * 0.85);
      currentHeight = Math.round(currentHeight * 0.85);
      canvas.width = currentWidth;
      canvas.height = currentHeight;
      ctx.drawImage(imageBitmap, 0, 0, currentWidth, currentHeight);
      dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    }
  }

  imageBitmap.close();

  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Image is too large. Please use a smaller photo.");
  }

  return dataUrl;
};

export interface NFCProjectData {
  name: string;
  description?: string;
  link?: string;
  photo?: string;
}

export interface NFCProfileData {
  username?: string;
  name: string;
  companyName?: string;
  jobTitle?: string;
  email: string;
  phone: string;
  bio?: string;
  businessTags?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  profilePhoto?: string;
  projects?: NFCProjectData[];
}

interface NFCProfileBuilderProps {
  profileData: NFCProfileData;
  onProfileChange: (data: NFCProfileData) => void;
  onBack: () => void;
  onContinue: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  infoText?: string;
  backLabel?: string;
  continueLabel?: string;
  variant?: "checkout" | "edit";
}

export default function NFCProfileBuilder({
  profileData,
  onProfileChange,
  onBack,
  onContinue,
  isLoading = false,
  title = "Build Your NFC Profile",
  description = "This information will be embedded in your NFC card. You can edit it anytime after receiving the card.",
  infoText = "The NFC card will contain your profile information so it's not empty when received. Share your contact details and social links to make it easy for people to connect with you.",
  backLabel = "Back to Delivery Details",
  continueLabel = "Continue to Payment",
  variant = "checkout",
}: NFCProfileBuilderProps) {
  const handleInputChange = (field: keyof NFCProfileData, value: string) => {
    const newProfileData = { ...profileData, [field]: value };
    
    if (field === "name" && !profileData.username) {
      newProfileData.username = value.split(" ")[0].toLowerCase();
    }

    onProfileChange(newProfileData);
  };

  const handlePhotoUpload = async (field: "profilePhoto", file?: File | null) => {
    if (!file) return;
    try {
      const compressedDataUrl = await readImageFileAsDataUrl(file);
      handleInputChange(field, compressedDataUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      alert(message);
    }
  };

  const handleProjectChange = (index: number, field: keyof NFCProjectData, value: string) => {
    const projects = [...(profileData.projects || [])];
    projects[index] = {
      ...(projects[index] || { name: "" }),
      [field]: value,
    };
    onProfileChange({
      ...profileData,
      projects,
    });
  };

  const handleProjectPhotoUpload = async (index: number, file?: File | null) => {
    if (!file) return;
    try {
      const compressedDataUrl = await readImageFileAsDataUrl(file);
      handleProjectChange(index, "photo", compressedDataUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      alert(message);
    }
  };

  const addProject = () => {
    onProfileChange({
      ...profileData,
      projects: [
        ...(profileData.projects || []),
        { name: "", description: "", link: "", photo: "" },
      ],
    });
  };

  const removeProject = (index: number) => {
    onProfileChange({
      ...profileData,
      projects: (profileData.projects || []).filter((_, i) => i !== index),
    });
  };

  const isCheckoutValid = profileData.username?.trim() && profileData.name.trim() && profileData.email.trim() && profileData.phone.trim();
  const isEditValid =
    profileData.username?.trim() &&
    profileData.name.trim() &&
    profileData.email.trim() &&
    profileData.phone.trim();

  const isValid = variant === "edit" ? !!isEditValid : !!isCheckoutValid;

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 dark:text-blue-100">{infoText}</p>
        </div>
      </div>

      <div className="space-y-5">
        {variant === "edit" ? (
          <>
            <div className="rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold px-3 py-1 inline-flex w-fit">
              Auto-saving in real time
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <h3 className="text-xl font-semibold">Profile Photo</h3>
              <Label htmlFor="profile-photo-file">Upload Photo</Label>
              <Input
                id="profile-photo-file"
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload("profilePhoto", e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">Recommended: Square image, at least 200x200px</p>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <h3 className="text-xl font-semibold">Basic Information</h3>
              <div>
                <Label htmlFor="profile-username">Username *</Label>
                <Input
                  id="profile-username"
                  placeholder="default"
                  value={profileData.username || ""}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Keep this consistent with your card profile data.</p>
              </div>
              <div>
                <Label htmlFor="profile-name">Name *</Label>
                <Input
                  id="profile-name"
                  placeholder="Your full name"
                  value={profileData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-company">Company Name</Label>
                <Input
                  id="profile-company"
                  placeholder="Company name"
                  value={profileData.companyName || ""}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-job">Job Title</Label>
                <Input
                  id="profile-job"
                  placeholder="Your role"
                  value={profileData.jobTitle || ""}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  placeholder="What you do and how you help clients"
                  value={profileData.bio || ""}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="profile-tags">Business Tags (comma separated)</Label>
                <Input
                  id="profile-tags"
                  placeholder="NFC, Consulting, Retail"
                  value={profileData.businessTags || ""}
                  onChange={(e) => handleInputChange("businessTags", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <h3 className="text-xl font-semibold">Contact Information</h3>
              <div>
                <Label htmlFor="profile-email">Email *</Label>
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
                <Label htmlFor="profile-phone">Phone *</Label>
                <Input
                  id="profile-phone"
                  placeholder="+91 9876543210"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-website">Website</Label>
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
                <Label htmlFor="profile-address">Address</Label>
                <Textarea
                  id="profile-address"
                  placeholder="City, State"
                  value={profileData.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <h3 className="text-xl font-semibold">Social Media</h3>
              <div>
                <Label htmlFor="profile-linkedin">LinkedIn</Label>
                <Input
                  id="profile-linkedin"
                  placeholder="https://linkedin.com/in/..."
                  value={profileData.linkedin || ""}
                  onChange={(e) => handleInputChange("linkedin", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-twitter">X / Twitter</Label>
                <Input
                  id="profile-twitter"
                  placeholder="https://x.com/..."
                  value={profileData.twitter || ""}
                  onChange={(e) => handleInputChange("twitter", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-instagram">Instagram</Label>
                <Input
                  id="profile-instagram"
                  placeholder="https://instagram.com/..."
                  value={profileData.instagram || ""}
                  onChange={(e) => handleInputChange("instagram", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-youtube">YouTube</Label>
                <Input
                  id="profile-youtube"
                  placeholder="https://youtube.com/..."
                  value={profileData.youtube || ""}
                  onChange={(e) => handleInputChange("youtube", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <h3 className="text-xl font-semibold">Projects</h3>
              {(profileData.projects || []).map((project, index) => (
                <div key={index} className="rounded-xl border p-4 space-y-3">
                  <div>
                    <Label htmlFor={`project-name-${index}`}>Project name</Label>
                    <Input
                      id={`project-name-${index}`}
                      placeholder="Project name"
                      value={project.name}
                      onChange={(e) => handleProjectChange(index, "name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`project-desc-${index}`}>Description</Label>
                    <Textarea
                      id={`project-desc-${index}`}
                      placeholder="Description"
                      value={project.description || ""}
                      onChange={(e) => handleProjectChange(index, "description", e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`project-link-${index}`}>GitHub or project link</Label>
                    <Input
                      id={`project-link-${index}`}
                      placeholder="https://..."
                      value={project.link || ""}
                      onChange={(e) => handleProjectChange(index, "link", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`project-photo-${index}`}>Project Photo (optional)</Label>
                    <Input
                      id={`project-photo-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleProjectPhotoUpload(index, e.target.files?.[0])}
                      className="mt-1"
                    />
                  </div>
                  <Button type="button" variant="destructive" onClick={() => removeProject(index)}>
                    Remove Project
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addProject} className="w-full">
                + Add Project
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-border pb-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Required Information
              </h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="profile-username">Username *</Label>
                  <Input
                    id="profile-username"
                    placeholder="default"
                    value={profileData.username || ""}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Keep this consistent with your card profile data.</p>
                </div>

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
          </>
        )}

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
            {isLoading ? "Processing..." : continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
