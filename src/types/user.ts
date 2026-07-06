import { Timestamp } from "firebase/firestore";

export interface DeliveryAddress {
  id: string;
  pincode: string;
  country: string;
  state: string;
  city: string;
  fullAddress: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface SavedCard {
  id: string;
  last4: string;
  brand: string; // visa, mastercard, rupay
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  mobile: string;
  photoURL: string | null;
  authProvider: "email" | "google" | "phone";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  addresses?: DeliveryAddress[];
  savedCards?: SavedCard[];
}
