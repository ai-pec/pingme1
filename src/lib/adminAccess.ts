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

  const adminAccessRef = doc(db, ADMIN_ACCESS_COLLECTION, ADMIN_ACCESS_DOC);

  // Force-refresh token once so recently updated auth claims are reflected.
  await currentUser.getIdToken(true);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await getDoc(adminAccessRef);
      return true;
    } catch (error: unknown) {
      const code = (error as FirestoreAccessError)?.code;

      if (code === "permission-denied") {
        if (attempt === 0) {
          await currentUser.getIdToken(true);
          continue;
        }
        return false;
      }

      if (RETRYABLE_CODES.has(code) && attempt === 0) {
        continue;
      }

      throw error;
    }
  }

  return false;
}
