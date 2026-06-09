export interface PublicNfcProject {
  name: string;
  description?: string;
  link?: string;
  photo?: string;
  type?: "image" | "video" | "brochure" | "certificate";
}

export interface PublicNfcDocument {
  title: string;
  url: string;
  type?: "company_profile" | "catalogue" | "resume" | "presentation";
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
  businessOverview?: string;
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
  documents?: PublicNfcDocument[];
  upiId?: string;
  razorpayLink?: string;
  appointmentBookingLink?: string;
  companyAddress?: string;
  googleMapsLink?: string;
}

const getPaymentApiBaseUrl = () => {
  const base = import.meta.env.VITE_PAYMENT_API_BASE_URL;
  return typeof base === "string" ? base.replace(/\/$/, "") : "";
};

/* ── In-memory profile cache (TTL: 5 minutes) ── */
const CACHE_TTL_MS = 5 * 60 * 1000;
interface CacheEntry {
  profile: PublicNfcProfile;
  expiresAt: number;
}
const profileCache = new Map<string, CacheEntry>();

export const normalizeNfcUsername = (rawUsername: string): string => {
  return rawUsername.trim().toLowerCase().replace(/\/+$/, "");
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isPublicNfcProfile = (value: unknown): value is PublicNfcProfile => {
  if (!isRecord(value)) return false;
  return (
    typeof value.orderId === "string" &&
    typeof value.username === "string" &&
    typeof value.name === "string"
  );
};

const isDraftNfcProfile = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return value.status === "draft" || value.updatedSource === "prePaymentDraft";
};

export const fetchPublicNfcProfile = async (username: string): Promise<PublicNfcProfile> => {
  const normalizedUsername = normalizeNfcUsername(username);
  if (!normalizedUsername) {
    throw new Error("Username is required.");
  }

  // Return cached profile if still fresh
  const cached = profileCache.get(normalizedUsername);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.profile;
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
      // Clear any stale cache entry on 404
      profileCache.delete(normalizedUsername);
      throw new Error("Profile not found.");
    }

    const text = await response.text();
    throw new Error(text || "Failed to load public NFC profile.");
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !isPublicNfcProfile(payload.profile)) {
    throw new Error("Invalid profile response.");
  }

  if (isDraftNfcProfile(payload.profile)) {
    throw new Error("Profile not found.");
  }

  // Store in cache with expiry
  profileCache.set(normalizedUsername, {
    profile: payload.profile,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return payload.profile;
};

export type UsernameOwnerContext =
  | string
  | {
      profileDocId?: string;
      paymentOrderId?: string;
      bookingId?: string;
      lineKey?: string | null;
      hasStoredLineProfiles?: boolean;
    };

const resolveOwnedProfileDocIds = (owner?: UsernameOwnerContext): string[] => {
  if (!owner) return [];
  if (typeof owner === "string") return [owner];

  const ids = new Set<string>();
  if (owner.profileDocId) ids.add(owner.profileDocId);
  if (owner.bookingId) ids.add(owner.bookingId);
  if (owner.paymentOrderId) ids.add(owner.paymentOrderId);

  if (owner.hasStoredLineProfiles && owner.paymentOrderId && owner.lineKey) {
    ids.add(`${owner.paymentOrderId}_${owner.lineKey}`);
  }

  return Array.from(ids);
};

export const isUsernameOwnedByProfileDoc = (
  profileDocOrderId: string,
  owner?: UsernameOwnerContext
): boolean => {
  const ownedIds = resolveOwnedProfileDocIds(owner);
  return ownedIds.some((id) => id === profileDocOrderId);
};

export const checkUsernameUniqueness = async (
  username: string,
  owner?: UsernameOwnerContext
): Promise<boolean> => {
  if (!username) return false;
  try {
    const profile = await fetchPublicNfcProfile(username);
    if (isUsernameOwnedByProfileDoc(profile.orderId, owner)) {
      return false;
    }
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Profile not found.") {
      return false;
    }
    throw err;
  }
};

export const generateUsernameSuggestions = async (baseName: string): Promise<string[]> => {
  const normalizedBase = normalizeNfcUsername(baseName).replace(/[^a-z0-9]/g, "");
  const base = normalizedBase || "user";
  const suggestions: string[] = [];
  const suffixes = ["", "123", "_nfc", "official", "1", "24", "99", "_biz"];
  
  for (const suffix of suffixes) {
    if (suggestions.length >= 3) break;
    const candidate = `${base}${suffix}`;
    try {
      const isTaken = await checkUsernameUniqueness(candidate);
      if (!isTaken && !suggestions.includes(candidate)) {
        suggestions.push(candidate);
      }
    } catch (e) {
      // Ignore API errors during suggestion generation
      console.warn("Error checking candidate:", candidate, e);
    }
  }
  
  // Fallbacks if API is failing or everything is taken
  let counter = 1000;
  while (suggestions.length < 3) {
    const candidate = `${base}${counter++}`;
    if (!suggestions.includes(candidate)) {
      suggestions.push(candidate);
    }
  }
  
  return suggestions;
};
