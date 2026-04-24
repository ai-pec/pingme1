export interface PublicNfcProject {
  name: string;
  description?: string;
  link?: string;
  photo?: string;
}

export interface PublicNfcProfile {
  orderId: string;
  username: string;
  name: string;
  companyName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
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
  projects?: PublicNfcProject[];
}

const getPaymentApiBaseUrl = () => {
  const base = import.meta.env.VITE_PAYMENT_API_BASE_URL;
  return typeof base === "string" ? base.replace(/\/$/, "") : "";
};

export const normalizeNfcUsername = (rawUsername: string): string => {
  return rawUsername.trim().toLowerCase();
};

export const fetchPublicNfcProfile = async (username: string): Promise<PublicNfcProfile> => {
  const normalizedUsername = normalizeNfcUsername(username);
  if (!normalizedUsername) {
    throw new Error("Username is required.");
  }

  const baseUrl = getPaymentApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Public NFC profile API is not configured.");
  }

  const response = await fetch(
    `${baseUrl}/getPublicNfcProfile?username=${encodeURIComponent(normalizedUsername)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Profile not found.");
    }

    const text = await response.text();
    throw new Error(text || "Failed to load public NFC profile.");
  }

  const payload = (await response.json()) as { profile?: PublicNfcProfile };
  if (!payload.profile) {
    throw new Error("Invalid profile response.");
  }

  return payload.profile;
};

export const checkUsernameUniqueness = async (username: string, currentOrderId?: string): Promise<boolean> => {
  if (!username) return false;
  try {
    const profile = await fetchPublicNfcProfile(username);
    if (currentOrderId && profile.orderId === currentOrderId) {
      return false; // It's their own profile, so it's not taken by someone else
    }
    return true; // Taken by someone else
  } catch (err: any) {
    if (err.message === "Profile not found.") {
      return false; // Available, not taken
    }
    throw err; // Other error
  }
};
