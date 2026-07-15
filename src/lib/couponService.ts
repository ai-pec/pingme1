import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COUPONS_COLLECTION = "coupons";

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  label: string;
  maxUses?: number;
  usedCount: number;
  expiryDate?: string;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

const mapCoupon = (snap: QueryDocumentSnapshot<DocumentData>): Coupon => {
  return {
    id: snap.id,
    ...(snap.data() as Omit<Coupon, "id">),
  };
};

export function subscribeToCoupons(
  onUpdate: (coupons: Coupon[]) => void,
  onError: (error: Error) => void,
): () => void {
  const couponsQuery = query(
    collection(db, COUPONS_COLLECTION),
    orderBy("createdAt", "desc"),
  );

  const unsubscribe = onSnapshot(
    couponsQuery,
    (snapshot) => {
      const coupons: Coupon[] = snapshot.docs.map(mapCoupon);
      onUpdate(coupons);
    },
    (error) => {
      onError(error);
    },
  );

  return unsubscribe;
}

export async function saveCoupon(coupon: Omit<Coupon, "createdAt" | "updatedAt">): Promise<string> {
  const id = coupon.id || coupon.code.toUpperCase().trim();

  // Build cleaned coupon, filtering out undefined values
  const cleanedCoupon: Record<string, unknown> = {
    code: coupon.code.toUpperCase().trim(),
    type: coupon.type,
    value: coupon.value,
    label: coupon.label,
    isActive: coupon.isActive,
    usedCount: coupon.usedCount || 0,
  };

  // Only add optional fields if they're defined
  if (coupon.maxUses !== undefined) cleanedCoupon.maxUses = coupon.maxUses;
  if (coupon.expiryDate) cleanedCoupon.expiryDate = coupon.expiryDate;

  if (coupon.id && coupon.id.trim()) {
    // Update existing
    await updateDoc(doc(db, COUPONS_COLLECTION, coupon.id), {
      ...cleanedCoupon,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Create new
    await setDoc(doc(db, COUPONS_COLLECTION, id), {
      ...cleanedCoupon,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return id;
}

export async function deleteCoupon(couponId: string): Promise<void> {
  await deleteDoc(doc(db, COUPONS_COLLECTION, couponId));
}

export async function initializeDefaultCoupons(): Promise<void> {
  const defaultCoupons = [
    {
      code: "LAUNCH",
      type: "percent" as const,
      value: 15,
      label: "15% off — Launch special",
      isActive: true,
      usedCount: 0,
    },
  ];

  for (const coupon of defaultCoupons) {
    const docRef = doc(db, COUPONS_COLLECTION, coupon.code);
    await setDoc(docRef, {
      ...coupon,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
