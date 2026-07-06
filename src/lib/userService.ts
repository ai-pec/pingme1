import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile, DeliveryAddress } from "@/types/user";

const USERS_COLLECTION = "users";

// Create user profile in Firestore
export async function createUserProfile(
  uid: string,
  data: {
    email?: string;
    displayName: string;
    mobile?: string;
    photoURL?: string | null;
    authProvider: "email" | "google" | "phone";
  }
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);

  await setDoc(userRef, {
    uid,
    email: data.email || "",
    emailVerified: data.authProvider === "google", // Google users are verified
    displayName: data.displayName,
    mobile: data.mobile || "",
    photoURL: data.photoURL || null,
    authProvider: data.authProvider,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Get user profile from Firestore
export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }

  return null;
}

// Update user profile in Firestore
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "mobile" | "email" | "emailVerified" | "addresses">>
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);

  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Update delivery addresses
export async function updateUserAddresses(
  uid: string,
  addresses: DeliveryAddress[]
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);

  await updateDoc(userRef, {
    addresses,
    updatedAt: serverTimestamp(),
  });
}

// Update user email in Firestore (after Firebase Auth email change)
export async function updateUserEmail(
  uid: string,
  newEmail: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);

  await updateDoc(userRef, {
    email: newEmail,
    emailVerified: false, // Require re-verification
    updatedAt: serverTimestamp(),
  });
}

// Check if user profile exists
export async function userProfileExists(uid: string): Promise<boolean> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists();
}

// Sync email verification status from Firebase Auth to Firestore
export async function syncEmailVerification(
  uid: string,
  emailVerified: boolean
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);

  await updateDoc(userRef, {
    emailVerified,
    updatedAt: serverTimestamp(),
  });
}
