import {
  auth,
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from "./firebase";

type AuthServiceError = Error & {
  code?: string;
};

// Sign up with email and password
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Update display name
  await updateProfile(userCredential.user, { displayName });

  // Send verification email
  await sendEmailVerification(userCredential.user);

  return userCredential;
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Sign in with Google
export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: unknown) {
    const code = (error as AuthServiceError)?.code;
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

// Sign out
export async function logOut() {
  return signOut(auth);
}

// Send password reset email
export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

// Resend verification email
export async function resendVerificationEmail(user: User) {
  return sendEmailVerification(user);
}

// Change user email (requires re-authentication)
export async function changeEmail(
  user: User,
  currentPassword: string,
  newEmail: string
) {
  // Re-authenticate user first
  const credential = EmailAuthProvider.credential(user.email!, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // Update email
  await updateEmail(user, newEmail);

  // Send verification to new email
  await sendEmailVerification(user);
}

// Get user-friendly error message
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please login or use a different email.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled.";
    case "auth/weak-password":
      return "Password is too weak. Please use a stronger password.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing.";
    case "auth/popup-blocked":
      return "Popup was blocked by the browser. Please allow popups and try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Auth. Add this host in Firebase Authentication > Settings > Authorized domains.";
    case "auth/operation-not-supported-in-this-environment":
      return "Google sign-in popup is not supported in this browser context. Open the site in Chrome/Safari and try again.";
    case "auth/google-account-not-registered":
      return "You have not signed up with this Google account yet. Please complete signup first.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "An error occurred. Please try again.";
  }
}
