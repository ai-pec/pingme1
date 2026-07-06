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
import { flattenOrder, type PrebookingRecord } from "@/lib/prebookService";
import type { UserProfile } from "@/types/user";

// Unified, cross-product orders collection (shared with the app project).
const ORDERS_COLLECTION = "orders";
const ORDER_SOURCE = "website";
const USERS_COLLECTION = "users";
const CONTACTS_COLLECTION = "contacts";

// Only surface website-created orders in the website admin (legacy docs with no
// `source` are treated as website orders too).
const isWebsiteOrder = (data: DocumentData): boolean => {
  const source = (data as { source?: unknown }).source;
  return source === undefined || source === ORDER_SOURCE;
};

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
  return flattenOrder(snap.id, snap.data());
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


export async function getAllOrders(): Promise<PrebookingRecord[]> {
  const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));

  return mergeAndSortOrders(
    snapshot.docs.filter((snap) => isWebsiteOrder(snap.data())).map(mapPrebooking),
  );
}

export function subscribeToOrders(
  onUpdate: (orders: PrebookingRecord[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, ORDERS_COLLECTION),
    (snapshot) => {
      const orders = snapshot.docs
        .filter((snap) => isWebsiteOrder(snap.data()))
        .map(mapPrebooking);
      onUpdate(mergeAndSortOrders(orders));
    },
    (error) => {
      onError(error);
    },
  );
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(mapUser);
}

export async function updateOrderStatus(orderId: string, status: PrebookingRecord["status"]): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
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
