import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  auth,
  onAuthStateChanged,
  type User,
  type ConfirmationResult,
} from "@/lib/firebase";
import {
  sendOtp as sendOtpService,
  clearRecaptcha,
  logOut,
  getAuthErrorMessage,
  fromE164,
} from "@/lib/authService";
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  updateUserAddresses,
} from "@/lib/userService";
import type { UserProfile, DeliveryAddress } from "@/types/user";

const extractErrorCode = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : "";
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  // True once an OTP has been sent and we're awaiting the 6-digit code.
  otpSent: boolean;
  // Send an OTP SMS to the given 10-digit mobile number. The recaptcha
  // container id must point at a <div> rendered in the calling component.
  sendOtp: (mobile: string, recaptchaContainerId: string) => Promise<void>;
  // Verify the 6-digit code; on success onAuthStateChanged signs the user in.
  verifyOtp: (code: string) => Promise<void>;
  // Abandon the current OTP attempt (e.g. "change number").
  resetOtp: () => void;
  logout: () => Promise<void>;
  updateProfile: (
    data: Partial<Pick<UserProfile, "displayName" | "mobile" | "email">>
  ) => Promise<void>;
  updateAddresses: (addresses: DeliveryAddress[]) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  // The pending confirmation from signInWithPhoneNumber lives across renders
  // but never needs to trigger one, so a ref is the right home for it.
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          let userProfile = await getUserProfile(firebaseUser.uid);

          if (!userProfile) {
            // First sign-in for this phone number — create a minimal profile.
            // Email is collected afterwards via the complete-profile gate.
            await createUserProfile(firebaseUser.uid, {
              email: firebaseUser.email || "",
              displayName:
                firebaseUser.displayName ||
                fromE164(firebaseUser.phoneNumber) ||
                "User",
              mobile: fromE164(firebaseUser.phoneNumber),
              photoURL: firebaseUser.photoURL || null,
              authProvider: "phone",
            });
            userProfile = await getUserProfile(firebaseUser.uid);
          }

          setProfile(userProfile);
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sendOtp = async (mobile: string, recaptchaContainerId: string) => {
    try {
      setError(null);
      const confirmation = await sendOtpService(mobile, recaptchaContainerId);
      confirmationRef.current = confirmation;
      setOtpSent(true);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const verifyOtp = async (code: string) => {
    if (!confirmationRef.current) {
      const message = "Your code expired. Please request a new OTP.";
      setError(message);
      throw new Error(message);
    }
    try {
      setError(null);
      await confirmationRef.current.confirm(code);
      // onAuthStateChanged will fire and load/create the profile.
      confirmationRef.current = null;
      setOtpSent(false);
      clearRecaptcha();
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const resetOtp = () => {
    confirmationRef.current = null;
    setOtpSent(false);
    setError(null);
    clearRecaptcha();
  };

  const logout = async () => {
    try {
      setError(null);
      await logOut();
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const updateProfileData = async (
    data: Partial<Pick<UserProfile, "displayName" | "mobile" | "email">>
  ) => {
    try {
      setError(null);
      if (user) {
        await updateUserProfile(user.uid, data);
        setProfile((prev) => (prev ? { ...prev, ...data } : null));
      }
    } catch (_err: unknown) {
      const message = "Failed to update profile. Please try again.";
      setError(message);
      throw new Error(message);
    }
  };

  const updateAddressesData = async (addresses: DeliveryAddress[]) => {
    try {
      setError(null);
      if (user) {
        await updateUserAddresses(user.uid, addresses);
        setProfile((prev) => (prev ? { ...prev, addresses } : null));
      }
    } catch (_err: unknown) {
      const message = "Failed to update addresses. Please try again.";
      setError(message);
      throw new Error(message);
    }
  };

  const refreshProfile = async () => {
    try {
      if (user) {
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        otpSent,
        sendOtp,
        verifyOtp,
        resetOtp,
        logout,
        updateProfile: updateProfileData,
        updateAddresses: updateAddressesData,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
