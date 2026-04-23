import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resolveProductImageUrl } from '@/lib/productCatalog';

export interface CartItem {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  image?: string;
  emoji?: string;
  quantity: number;
}

export interface NFCProfile {
  username?: string;
  name: string;
  companyName?: string;
  jobTitle?: string;
  email: string;
  phone: string;
  bio?: string;
  businessTags?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  profilePhoto?: string;
  projects?: Array<{
    name: string;
    description?: string;
    link?: string;
    photo?: string;
  }>;
}

export interface PrebookingData {
  userId?: string;
  items: CartItem[];
  totalAmount: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  nfcProfile?: NFCProfile;
  payment?: {
    gateway: 'razorpay';
    orderId: string;
    paymentId: string;
    signature: string;
    amount: number;
    currency: string;
    paidAt?: string;
  };
}

type SanitizedCartItem = {
  id: string;
  title: string;
  price: string;
  quantity: number;
  originalPrice?: string;
  image?: string;
  emoji?: string;
};

const BOOKING_COLLECTION = 'booking';
const LEGACY_PREBOOKINGS_COLLECTION = 'prebookings';

// Simple text sanitizer to prevent XSS
const sanitizeText = (text: string): string => {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

const sanitizeNFCProfile = (profile: NFCProfile): NFCProfile => {
  return {
    ...(profile.username ? { username: sanitizeText(profile.username).toLowerCase() } : {}),
    name: sanitizeText(profile.name || ''),
    ...(profile.companyName ? { companyName: sanitizeText(profile.companyName) } : {}),
    ...(profile.jobTitle ? { jobTitle: sanitizeText(profile.jobTitle) } : {}),
    email: sanitizeText(profile.email || ''),
    phone: sanitizeText(profile.phone || ''),
    ...(profile.bio ? { bio: sanitizeText(profile.bio) } : {}),
    ...(profile.businessTags ? { businessTags: sanitizeText(profile.businessTags) } : {}),
    ...(profile.website ? { website: sanitizeText(profile.website) } : {}),
    ...(profile.address ? { address: sanitizeText(profile.address) } : {}),
    ...(profile.linkedin ? { linkedin: sanitizeText(profile.linkedin) } : {}),
    ...(profile.twitter ? { twitter: sanitizeText(profile.twitter) } : {}),
    ...(profile.instagram ? { instagram: sanitizeText(profile.instagram) } : {}),
    ...(profile.youtube ? { youtube: sanitizeText(profile.youtube) } : {}),
    ...(profile.facebook ? { facebook: sanitizeText(profile.facebook) } : {}),
    ...(profile.profilePhoto ? { profilePhoto: sanitizeText(profile.profilePhoto) } : {}),
    ...(profile.projects && profile.projects.length > 0
      ? {
          projects: profile.projects.map((project) => ({
            name: sanitizeText(project.name || ''),
            ...(project.description ? { description: sanitizeText(project.description) } : {}),
            ...(project.link ? { link: sanitizeText(project.link) } : {}),
            ...(project.photo ? { photo: sanitizeText(project.photo) } : {}),
          })),
        }
      : {}),
  };
};

export const createPrebooking = async (data: PrebookingData): Promise<string> => {
  // Validate required fields
  if (!data.fullName || !data.phone || !data.address || !data.city || !data.state || !data.pincode) {
    throw new Error('All required fields must be provided');
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('Cart is empty');
  }

  // Sanitize all text inputs and format items
  const sanitizedData = {
    items: data.items.map(item => {
      const cleanItem: SanitizedCartItem = {
        id: item.id,
        title: sanitizeText(item.title),
        price: item.price,
        quantity: Math.min(Math.max(1, item.quantity), 10),
      };
      if (item.originalPrice) cleanItem.originalPrice = item.originalPrice;
      if (item.image) cleanItem.image = resolveProductImageUrl(item.image) || item.image;
      if (item.emoji) cleanItem.emoji = item.emoji;
      return cleanItem;
    }),
    totalAmount: data.totalAmount,
    fullName: sanitizeText(data.fullName),
    email: sanitizeText(data.email),
    phone: sanitizeText(data.phone),
    address: sanitizeText(data.address),
    city: sanitizeText(data.city),
    state: sanitizeText(data.state),
    pincode: sanitizeText(data.pincode),
    status: data.status,
    ...(data.nfcProfile
      ? {
          nfcProfile: sanitizeNFCProfile(data.nfcProfile),
        }
      : {}),
    ...(data.payment
      ? {
          payment: {
            gateway: data.payment.gateway,
            orderId: sanitizeText(data.payment.orderId),
            paymentId: sanitizeText(data.payment.paymentId),
            signature: sanitizeText(data.payment.signature),
            amount: data.payment.amount,
            currency: sanitizeText(data.payment.currency),
            ...(data.payment.paidAt ? { paidAt: sanitizeText(data.payment.paidAt) } : {}),
          },
        }
      : {}),
    ...(data.userId ? { userId: data.userId } : {}),
    createdAt: serverTimestamp(),
  };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 10000)
  );

  const docRef = await Promise.race([
    addDoc(collection(db, BOOKING_COLLECTION), sanitizedData),
    timeoutPromise,
  ]);

  return docRef.id;
};

export interface PrebookingRecord extends PrebookingData {
  id: string;
  createdAt: unknown;
}

interface GetUserPrebookingsParams {
  userId?: string;
  email?: string;
}

const toMillis = (createdAt: unknown): number => {
  if (!createdAt || typeof createdAt !== 'object') return 0;

  const timestamp = createdAt as {
    toMillis?: () => number;
    seconds?: number;
  };

  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000;
  return 0;
};

const ensureAtLeastOneWriteSucceeded = async (
  writes: Promise<unknown>[],
  operation: string,
): Promise<void> => {
  const results = await Promise.allSettled(writes);

  if (results.some((result) => result.status === 'fulfilled')) {
    return;
  }

  const firstFailure = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
  if (firstFailure?.reason instanceof Error) {
    throw firstFailure.reason;
  }

  throw new Error(`Failed to ${operation}.`);
};

export const getUserPrebookings = async ({ userId, email }: GetUserPrebookingsParams): Promise<PrebookingRecord[]> => {
  try {
    if (!userId && !email) return [];

    const mergeAndSort = (records: PrebookingRecord[]) => {
      const deduped = new Map<string, PrebookingRecord>();
      records.forEach((record) => {
        deduped.set(record.id, record);
      });

      return Array.from(deduped.values()).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    };

    // Prefer userId query because email can change later in account settings.
    if (userId) {
      const [bookingSnapshot, legacySnapshot] = await Promise.all([
        getDocs(query(collection(db, BOOKING_COLLECTION), where('userId', '==', userId))),
        getDocs(query(collection(db, LEGACY_PREBOOKINGS_COLLECTION), where('userId', '==', userId))),
      ]);

      const records = [
        ...bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrebookingRecord)),
        ...legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrebookingRecord)),
      ];

      if (records.length > 0) {
        return mergeAndSort(records);
      }
    }

    if (email) {
      const [bookingSnapshot, legacySnapshot] = await Promise.all([
        getDocs(query(collection(db, BOOKING_COLLECTION), where('email', '==', email))),
        getDocs(query(collection(db, LEGACY_PREBOOKINGS_COLLECTION), where('email', '==', email))),
      ]);

      const records = [
        ...bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrebookingRecord)),
        ...legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrebookingRecord)),
      ];

      return mergeAndSort(records);
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch prebookings:', error);
    return [];
  }
};

export const updatePrebookingNFCProfile = async (
  orderId: string,
  nfcProfile: NFCProfile
): Promise<void> => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  const sanitizedProfile = sanitizeNFCProfile(nfcProfile);
  await ensureAtLeastOneWriteSucceeded([
    updateDoc(doc(db, BOOKING_COLLECTION, orderId), {
      nfcProfile: sanitizedProfile,
      updatedAt: serverTimestamp(),
    }),
    updateDoc(doc(db, LEGACY_PREBOOKINGS_COLLECTION, orderId), {
      nfcProfile: sanitizedProfile,
      updatedAt: serverTimestamp(),
    }),
  ], 'update NFC profile');
};
