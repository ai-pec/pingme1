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

/* ── In-memory profile cache (TTL: 5 minutes) ── */
const CACHE_TTL_MS = 5 * 60 * 1000;
interface CacheEntry {
  profile: PublicNfcProfile;
  expiresAt: number;
}
const profileCache = new Map<string, CacheEntry>();

export const normalizeNfcUsername = (rawUsername: string): string => {
  return rawUsername.trim().toLowerCase();
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

export const checkUsernameUniqueness = async (username: string, currentOrderId?: string): Promise<boolean> => {
  if (!username) return false;
  try {
    const profile = await fetchPublicNfcProfile(username);
    if (currentOrderId && profile.orderId === currentOrderId) {
      return false; // It's their own profile, so it's not taken by someone else
    }
    return true; // Taken by someone else
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Profile not found.") {
      return false; // Available, not taken
    }
    throw err; // Other error
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
