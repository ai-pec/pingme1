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

  // Force-refresh token once so recently updated auth claims are reflected.
  await currentUser.getIdToken(true);

  const idTokenResult = await currentUser.getIdTokenResult();
  return idTokenResult.claims.admin === true;
}
