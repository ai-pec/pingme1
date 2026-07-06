import {
  auth,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "./firebase";

type AuthServiceError = Error & {
  code?: string;
};

// Default country code for phone numbers (India). Stored numbers are bare
// 10-digit values; Firebase Phone Auth needs full E.164 format.
const DEFAULT_COUNTRY_CODE = "+91";

/**
 * Convert a bare 10-digit Indian mobile number to E.164 (+91XXXXXXXXXX).
 * If the value already starts with "+", it is returned unchanged.
 */
export function toE164(mobile: string): string {
  const trimmed = mobile.trim();
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  return `${DEFAULT_COUNTRY_CODE}${trimmed.replace(/\D/g, "")}`;
}

/**
 * Strip the country code from an E.164 phone number, returning the bare
 * 10-digit value we store in Firestore (keeps existing data format consistent).
 */
export function fromE164(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) {
    return "";
  }
  const digits = phoneNumber.replace(/\D/g, "");
  // Indian numbers: drop the leading 91 if present, keep the last 10 digits.
  return digits.slice(-10);
}

// A single invisible reCAPTCHA verifier is reused for the lifetime of the page.
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Create (or reuse) an invisible reCAPTCHA verifier bound to a DOM container.
 * Firebase requires this before it will send an OTP SMS.
 */
export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
    });
  }
  return recaptchaVerifier;
}

/**
 * Tear down the reCAPTCHA verifier. Call this on failures so a fresh widget is
 * created for the next attempt (a used/expired verifier cannot be reused).
 */
export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore — widget may already be detached
    }
    recaptchaVerifier = null;
  }
}

/**
 * Send an OTP SMS to the given mobile number.
 * Returns a ConfirmationResult whose .confirm(code) completes the sign-in.
 */
export async function sendOtp(
  mobile: string,
  containerId: string
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(containerId);
  try {
    return await signInWithPhoneNumber(auth, toE164(mobile), verifier);
  } catch (error) {
    // A failed send invalidates the verifier — reset so the user can retry.
    clearRecaptcha();
    throw error;
  }
}

// Sign out
export async function logOut() {
  return signOut(auth);
}

// Get user-friendly error message
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-phone-number":
      return "Invalid phone number. Please enter a valid 10-digit mobile number.";
    case "auth/missing-phone-number":
      return "Please enter your phone number.";
    case "auth/invalid-verification-code":
      return "Incorrect code. Please check the OTP and try again.";
    case "auth/code-expired":
      return "This code has expired. Please request a new one.";
    case "auth/missing-verification-code":
      return "Please enter the 6-digit code sent to your phone.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Please try again later.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/captcha-check-failed":
      return "reCAPTCHA verification failed. Please refresh and try again.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is not enabled. Please contact support.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Auth. Add this host in Firebase Authentication > Settings > Authorized domains.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "An error occurred. Please try again.";
  }
}

export type { AuthServiceError };
