import {
  collection,
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

const PREBOOKINGS_COLLECTION = "prebookings";
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
  const ordersQuery = query(
    collection(db, PREBOOKINGS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(ordersQuery);
  return snapshot.docs.map(mapPrebooking);
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, PREBOOKINGS_COLLECTION, orderId));
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(mapUser);
}

export async function updateOrderStatus(orderId: string, status: PrebookingRecord["status"]): Promise<void> {
  await updateDoc(doc(db, PREBOOKINGS_COLLECTION, orderId), {
    status,
  });
}
