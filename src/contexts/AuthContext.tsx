import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logOut,
  sendPasswordReset,
  resendVerificationEmail,
  changeEmail,
  getAuthErrorMessage,
} from "@/lib/authService";
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  updateUserAddresses,
  updateUserEmail,
  userProfileExists,
  syncEmailVerification,
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
  signUp: (
    email: string,
    password: string,
    displayName: string,
    mobile?: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInGoogle: (requireExistingProfile?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateProfile: (
    data: Partial<Pick<UserProfile, "displayName" | "mobile">>
  ) => Promise<void>;
  updateAddresses: (addresses: DeliveryAddress[]) => Promise<void>;
  changeUserEmail: (currentPassword: string, newEmail: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Get or sync profile
          let userProfile = await getUserProfile(firebaseUser.uid);

          // Sync email verification status if needed
          if (userProfile && userProfile.emailVerified !== firebaseUser.emailVerified) {
            await syncEmailVerification(firebaseUser.uid, firebaseUser.emailVerified);
            userProfile = { ...userProfile, emailVerified: firebaseUser.emailVerified };
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

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    mobile?: string
  ) => {
    try {
      setError(null);
      const userCredential = await signUpWithEmail(email, password, displayName);

      // Create Firestore profile
      await createUserProfile(userCredential.user.uid, {
        email,
        displayName,
        mobile,
        authProvider: "email",
      });
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const signInGoogle = async (_requireExistingProfile = false) => {
    try {
      setError(null);
      const userCredential = await signInWithGoogle();
      if (!userCredential?.user) {
        return;
      }
      const firebaseUser = userCredential.user;

      // Check if profile exists
      const exists = await userProfileExists(firebaseUser.uid);

      // Ensure a Firestore profile exists for every Google-authenticated user.
      if (!exists) {
        await createUserProfile(firebaseUser.uid, {
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "User",
          photoURL: firebaseUser.photoURL,
          authProvider: "google",
        });
      }
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      const message = getAuthErrorMessage(code);
      setError(message);
      const authError = new Error(message) as Error & { code?: string };
      authError.code = code;
      throw authError;
    }
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

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordReset(email);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const resendVerification = async () => {
    try {
      setError(null);
      if (user) {
        await resendVerificationEmail(user);
      }
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const updateProfileData = async (
    data: Partial<Pick<UserProfile, "displayName" | "mobile">>
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

  const changeUserEmailFn = async (currentPassword: string, newEmail: string) => {
    try {
      setError(null);
      if (user) {
        // Change email in Firebase Auth (this also sends verification)
        await changeEmail(user, currentPassword, newEmail);
        // Update email in Firestore
        await updateUserEmail(user.uid, newEmail);
        // Update local state
        setProfile((prev) => (prev ? { ...prev, email: newEmail, emailVerified: false } : null));
      }
    } catch (err: unknown) {
      const message = getAuthErrorMessage(extractErrorCode(err));
      setError(message);
      throw new Error(message);
    }
  };

  const refreshProfile = async () => {
    try {
      if (user) {
        // Reload the user to get latest emailVerified status
        await user.reload();
        const userProfile = await getUserProfile(user.uid);
        if (userProfile && userProfile.emailVerified !== user.emailVerified) {
          await syncEmailVerification(user.uid, user.emailVerified);
        }
        setProfile(userProfile ? { ...userProfile, emailVerified: user.emailVerified } : null);
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
        signUp,
        signIn,
        signInGoogle,
        logout,
        resetPassword,
        resendVerification,
        updateProfile: updateProfileData,
        updateAddresses: updateAddressesData,
        changeUserEmail: changeUserEmailFn,
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
