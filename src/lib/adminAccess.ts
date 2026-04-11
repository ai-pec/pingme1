import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ADMIN_ACCESS_DOC = "panel";
const ADMIN_ACCESS_COLLECTION = "adminAccess";

export async function canAccessAdminPanel(): Promise<boolean> {
  try {
    await getDoc(doc(db, ADMIN_ACCESS_COLLECTION, ADMIN_ACCESS_DOC));
    return true;
  } catch (error: any) {
    if (error?.code === "permission-denied") {
      return false;
    }
    throw error;
  }
}
