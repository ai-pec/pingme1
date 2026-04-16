import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PrebookingRecord } from "@/lib/prebookService";
import type { UserProfile } from "@/types/user";

const BOOKING_COLLECTION = "booking";
const LEGACY_PREBOOKINGS_COLLECTION = "prebookings";
const USERS_COLLECTION = "users";

const mapPrebooking = (snap: QueryDocumentSnapshot<DocumentData>): PrebookingRecord => {
  return {
    id: snap.id,
    ...(snap.data() as Omit<PrebookingRecord, "id">),
  };
};

const mapUser = (snap: QueryDocumentSnapshot<DocumentData>): UserProfile => {
  return {
    uid: snap.id,
    ...(snap.data() as Omit<UserProfile, "uid">),
  };
};

export async function getAllOrders(): Promise<PrebookingRecord[]> {
  const [bookingSnapshot, legacySnapshot] = await Promise.all([
    getDocs(query(collection(db, BOOKING_COLLECTION), orderBy("createdAt", "desc"))),
    getDocs(query(collection(db, LEGACY_PREBOOKINGS_COLLECTION), orderBy("createdAt", "desc"))),
  ]);

  const merged = new Map<string, PrebookingRecord>();
  bookingSnapshot.docs.forEach((snap) => {
    const record = mapPrebooking(snap);
    merged.set(record.id, record);
  });
  legacySnapshot.docs.forEach((snap) => {
    if (!merged.has(snap.id)) {
      const record = mapPrebooking(snap);
      merged.set(record.id, record);
    }
  });

  return Array.from(merged.values()).sort((a, b) => {
    const left = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
    const right = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
    return right - left;
  });
}

export async function deleteOrder(orderId: string): Promise<void> {
  await Promise.allSettled([
    deleteDoc(doc(db, BOOKING_COLLECTION, orderId)),
    deleteDoc(doc(db, LEGACY_PREBOOKINGS_COLLECTION, orderId)),
  ]);
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(mapUser);
}

export async function updateOrderStatus(orderId: string, status: PrebookingRecord["status"]): Promise<void> {
  await Promise.allSettled([
    updateDoc(doc(db, BOOKING_COLLECTION, orderId), { status }),
    updateDoc(doc(db, LEGACY_PREBOOKINGS_COLLECTION, orderId), { status }),
  ]);
}
