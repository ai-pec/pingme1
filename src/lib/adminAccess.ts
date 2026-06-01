import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const ADMIN_ACCESS_DOC = "panel";
const ADMIN_ACCESS_COLLECTION = "adminAccess";
const RETRYABLE_CODES = new Set(["unavailable", "deadline-exceeded", "aborted", "resource-exhausted"]);

type FirestoreAccessError = Error & {
  code?: string;
};

type AdminAccessConfig = {
  allowedEmails?: unknown;
  allowedUids?: unknown;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
};

const hasPanelAccess = (config: AdminAccessConfig | undefined, uid: string, email: string | null): boolean => {
  if (!config) {
    return false;
  }

  const allowedUids = toStringArray(config.allowedUids);
  if (allowedUids.includes(uid)) {
    return true;
  }

  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const allowedEmails = toStringArray(config.allowedEmails).map((item) => item.toLowerCase());
  return allowedEmails.includes(normalizedEmail);
};

export async function canAccessAdminPanel(): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }

  try {
    // 1. Check custom auth claims (most performant)
    // Force-refresh token once so recently updated auth claims are reflected.
    await currentUser.getIdToken(true);
    const idTokenResult = await currentUser.getIdTokenResult();

    if (idTokenResult.claims.admin === true) {
      return true;
    }

    // 2. Fallback: Check 'admins' collection in Firestore (uid-based)
    const adminDocRef = doc(db, "admins", currentUser.uid);
    const adminDocSnap = await getDoc(adminDocRef);

    if (adminDocSnap.exists()) {
      return true;
    }

    // 2b. Compatibility fallback: support admins doc keyed by normalized email.
    if (currentUser.email) {
      const normalizedEmail = currentUser.email.trim().toLowerCase();
      const adminByEmailRef = doc(db, "admins", normalizedEmail);
      const adminByEmailSnap = await getDoc(adminByEmailRef);

      if (adminByEmailSnap.exists()) {
        return true;
      }
    }

    // 3. Legacy/config fallback: Check adminAccess/panel
    // Expected shape:
    // {
    //   allowedEmails: string[]
    //   allowedUids: string[]
    // }
    const accessDocRef = doc(db, ADMIN_ACCESS_COLLECTION, ADMIN_ACCESS_DOC);
    const accessDocSnap = await getDoc(accessDocRef);

    if (!accessDocSnap.exists()) {
      return false;
    }

    return hasPanelAccess(accessDocSnap.data() as AdminAccessConfig, currentUser.uid, currentUser.email);
  } catch (error) {
    const firestoreError = error as FirestoreAccessError;
    // If it's a transient firestore error, we might want to log it but default to false
    console.error("Admin access check failed:", firestoreError);
    return false;
  }
}
