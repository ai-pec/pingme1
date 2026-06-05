import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const ADMIN_ACCESS_DOC = "panel";
const ADMIN_ACCESS_COLLECTION = "adminAccess";
const RETRYABLE_CODES = new Set(["unavailable", "deadline-exceeded", "aborted", "resource-exhausted"]);

type FirestoreAccessError = Error & {
  code?: string;
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

    // 2. Fallback: Check 'admins' collection in Firestore
    // This matches the logic in firestore.rules
    const adminDocRef = doc(db, "admins", currentUser.uid);
    const adminDocSnap = await getDoc(adminDocRef);

    return adminDocSnap.exists();
  } catch (error) {
    const firestoreError = error as FirestoreAccessError;
    // If it's a transient firestore error, we might want to log it but default to false
    console.error("Admin access check failed:", firestoreError);
    return false;
  }
}
