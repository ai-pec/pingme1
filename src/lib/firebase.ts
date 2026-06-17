import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  signInWithCredential,
  type User,
  type AuthCredential,
} from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Define required Firebase environment variables
const REQUIRED_ENV_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

type EnvVar = typeof REQUIRED_ENV_VARS[number];

/**
 * Validates that all required Firebase environment variables are present and non-empty.
 * Throws a detailed error if any are missing or undefined.
 */
function validateFirebaseConfig(): void {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = import.meta.env[envVar];
    if (!value || typeof value !== "string" || value.trim() === "") {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const errorMsg = [
      "🔥 Firebase Configuration Error",
      "The following required environment variables are missing or empty:",
      missing.map((v) => `  • ${v}`).join("\n"),
      "",
      "Please ensure your .env.local file contains all required Firebase config keys:",
      "  https://firebase.google.com/docs/web/setup#config-object",
      "",
      "Steps to fix:",
      "  1. Create/update .env.local in the project root",
      "  2. Add all missing variables from your Firebase Console",
      "  3. Restart the dev server (npm run dev)",
    ].join("\n");

    console.error(errorMsg);
    throw new Error(
      `Firebase initialization failed: Missing environment variables [${missing.join(
        ", "
      )}]. Check console for details.`
    );
  }
}

// Validate configuration before initializing
validateFirebaseConfig();

// Firebase Config - loaded from environment variables and validated above
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase (after validation)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  const errorMsg = [
    "🔥 Firebase Initialization Error",
    "Failed to initialize Firebase with the provided configuration.",
    "",
    "This usually means:",
    "  • Invalid Firebase project configuration",
    "  • Firestore/Storage not enabled in Firebase Console",
    "  • Network connectivity issue during initialization",
    "",
    `Error details: ${error instanceof Error ? error.message : String(error)}`,
  ].join("\n");

  console.error(errorMsg);
  throw error;
}

// Initialize services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Export auth functions
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  signInWithCredential,
  type User,
  type AuthCredential,
};

export default app;
