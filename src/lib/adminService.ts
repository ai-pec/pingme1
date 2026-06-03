import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
const CONTACTS_COLLECTION = "contacts";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: string;
  createdAt: unknown;
}

const toMillis = (createdAt: unknown): number => {
  if (!createdAt || typeof createdAt !== "object") return 0;

  const dateValue = createdAt as {
    toMillis?: () => number;
    seconds?: number;
  };

  if (typeof dateValue.toMillis === "function") {
    return dateValue.toMillis();
  }

  if (typeof dateValue.seconds === "number") {
    return dateValue.seconds * 1000;
  }

  return 0;
};

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

const mergeAndSortOrders = (orders: PrebookingRecord[]): PrebookingRecord[] => {
  const merged = new Map<string, PrebookingRecord>();
  orders.forEach((order) => {
    merged.set(order.id, order);
  });

  return Array.from(merged.values()).sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
};

const ensureAtLeastOneWriteSucceeded = async (writes: Promise<unknown>[], operation: string): Promise<void> => {
  const results = await Promise.allSettled(writes);
  if (results.some((result) => result.status === "fulfilled")) {
    return;
  }

  const firstFailure = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
  if (firstFailure?.reason instanceof Error) {
    throw firstFailure.reason;
  }

  throw new Error(`Failed to ${operation}.`);
};

export async function getAllOrders(): Promise<PrebookingRecord[]> {
  const [bookingSnapshot, legacySnapshot] = await Promise.all([
    getDocs(collection(db, BOOKING_COLLECTION)),
    getDocs(collection(db, LEGACY_PREBOOKINGS_COLLECTION)),
  ]);

  return mergeAndSortOrders([
    ...bookingSnapshot.docs.map(mapPrebooking),
    ...legacySnapshot.docs.map(mapPrebooking),
  ]);
}

export function subscribeToOrders(
  onUpdate: (orders: PrebookingRecord[]) => void,
  onError: (error: Error) => void,
): () => void {
  let bookingOrders: PrebookingRecord[] = [];
  let legacyOrders: PrebookingRecord[] = [];
  let bookingReady = false;
  let legacyReady = false;

  const emitMergedOrders = () => {
    if (!bookingReady || !legacyReady) return;
    onUpdate(mergeAndSortOrders([...bookingOrders, ...legacyOrders]));
  };

  const bookingUnsubscribe = onSnapshot(
    collection(db, BOOKING_COLLECTION),
    (snapshot) => {
      bookingOrders = snapshot.docs.map(mapPrebooking);
      bookingReady = true;
      emitMergedOrders();
    },
    (error) => {
      onError(error);
    },
  );

  const legacyUnsubscribe = onSnapshot(
    collection(db, LEGACY_PREBOOKINGS_COLLECTION),
    (snapshot) => {
      legacyOrders = snapshot.docs.map(mapPrebooking);
      legacyReady = true;
      emitMergedOrders();
    },
    (error) => {
      onError(error);
    },
  );

  return () => {
    bookingUnsubscribe();
    legacyUnsubscribe();
  };
}

export async function deleteOrder(orderId: string): Promise<void> {
  await ensureAtLeastOneWriteSucceeded([
    deleteDoc(doc(db, BOOKING_COLLECTION, orderId)),
    deleteDoc(doc(db, LEGACY_PREBOOKINGS_COLLECTION, orderId)),
  ], "delete order");
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(mapUser);
}

export async function updateOrderStatus(orderId: string, status: PrebookingRecord["status"]): Promise<void> {
  await ensureAtLeastOneWriteSucceeded([
    updateDoc(doc(db, BOOKING_COLLECTION, orderId), {
      status,
      updatedAt: serverTimestamp(),
    }),
    updateDoc(doc(db, LEGACY_PREBOOKINGS_COLLECTION, orderId), {
      status,
      updatedAt: serverTimestamp(),
    }),
  ], "update order status");
}

export function subscribeToContactMessages(
  onUpdate: (messages: ContactMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const contactsQuery = query(
    collection(db, CONTACTS_COLLECTION),
    orderBy("createdAt", "desc"),
  );

  const unsubscribe = onSnapshot(
    contactsQuery,
    (snapshot) => {
      const messages: ContactMessage[] = snapshot.docs.map((snap) => ({
        id: snap.id,
        ...(snap.data() as Omit<ContactMessage, "id">),
      }));
      onUpdate(messages);
    },
    (error) => {
      onError(error);
    },
  );

  return unsubscribe;
}

export async function deleteContactMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(db, CONTACTS_COLLECTION, messageId));
}

export async function markContactMessageRead(messageId: string): Promise<void> {
  await updateDoc(doc(db, CONTACTS_COLLECTION, messageId), {
    status: "read",
  });
}
