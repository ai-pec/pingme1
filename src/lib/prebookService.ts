import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import DOMPurify from 'dompurify';
import { db, auth } from '@/lib/firebase';
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

export interface NfcLineProfile {
  lineKey: string;
  itemId: string;
  title: string;
  nfcProfile: NFCProfile;
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
  nfcLineProfiles?: NfcLineProfile[];
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

export interface SyncNfcOrderData {
  userId?: string;
  items?: CartItem[];
  totalAmount?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status?: PrebookingData["status"];
  payment?: PrebookingData["payment"];
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

const getPaymentApiBaseUrl = () => {
  const base = import.meta.env.VITE_PAYMENT_API_BASE_URL;
  return typeof base === 'string' ? base.replace(/\/$/, '') : '';
};

// Robust text sanitizer to prevent XSS using DOMPurify
// Prevents: malformed tags, event handlers, HTML entities, data URIs, encoded payloads
export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  
  // Use DOMPurify to properly parse and sanitize HTML
  // ALLOWED_TAGS: [] means NO HTML tags allowed (strip everything)
  // This handles entity encoding, malformed tags, and event handlers
  const cleaned = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  // DOMPurify handles most entity decoding, but decode remaining ones
  const textarea = document.createElement('textarea');
  textarea.innerHTML = cleaned;
  return textarea.value.trim();
};

const sanitizeNfcLineProfiles = (lines: NfcLineProfile[]): NfcLineProfile[] => {
  return lines.map((line) => ({
    lineKey: sanitizeText(line.lineKey || ''),
    itemId: sanitizeText(line.itemId || ''),
    title: sanitizeText(line.title || 'NFC Card'),
    nfcProfile: sanitizeNFCProfile(line.nfcProfile),
  }));
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
    ...(data.nfcLineProfiles && data.nfcLineProfiles.length > 0
      ? {
          nfcLineProfiles: sanitizeNfcLineProfiles(data.nfcLineProfiles),
        }
      : {}),
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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const getNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const normalizeItemImage = (item: unknown): string | undefined => {
  if (!isRecord(item)) return undefined;

  const images = Array.isArray(item.images) ? item.images : undefined;
  const candidates = [
    item.image,
    item.imageUrl,
    item.productImage,
    item.photoURL,
    item.photoUrl,
    item.photo,
    images?.[0],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const resolved = resolveProductImageUrl(candidate.trim());
      if (resolved) return resolved;
      if (/^https?:\/\//i.test(candidate.trim()) || /^data:/i.test(candidate.trim())) {
        return candidate.trim();
      }
    }
  }
  return undefined;
};

const normalizeRecord = (id: string, data: unknown): PrebookingRecord => {
  const safeData = isRecord(data) ? data : {};
  const rawItems = Array.isArray(safeData.items) ? safeData.items : [];

  const items: CartItem[] = rawItems.map((item) => {
    const safeItem = isRecord(item) ? item : {};
    const priceValue = safeItem.price;
    const quantityValue = getNumber(safeItem.quantity);

    return {
      id: getString(safeItem.id) || '',
      title: getString(safeItem.title) || 'Product',
      price: typeof priceValue === 'string' ? priceValue : typeof priceValue === 'number' ? String(priceValue) : '0',
      quantity: quantityValue ?? 1,
      originalPrice: getString(safeItem.originalPrice),
      image: normalizeItemImage(safeItem),
      emoji: getString(safeItem.emoji),
    };
  });

  return {
    ...(safeData as Omit<PrebookingRecord, 'id' | 'items'>),
    id,
    items,
  } as PrebookingRecord;
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
        ...bookingSnapshot.docs.map(doc => normalizeRecord(doc.id, doc.data())),
        ...legacySnapshot.docs.map(doc => normalizeRecord(doc.id, doc.data())),
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
        ...bookingSnapshot.docs.map(doc => normalizeRecord(doc.id, doc.data())),
        ...legacySnapshot.docs.map(doc => normalizeRecord(doc.id, doc.data())),
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
  nfcProfile: NFCProfile,
  profileId?: string,
  lineKey?: string
): Promise<void> => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  const sanitizedProfile = sanitizeNFCProfile(nfcProfile);

  if (lineKey) {
    const bookingRef = doc(db, BOOKING_COLLECTION, orderId);
    const legacyRef = doc(db, LEGACY_PREBOOKINGS_COLLECTION, orderId);
    const [bookingDoc, legacyDoc] = await Promise.all([
      getDoc(bookingRef),
      getDoc(legacyRef),
    ]);

    const existingData = bookingDoc.exists()
      ? bookingDoc.data()
      : legacyDoc.exists()
        ? legacyDoc.data()
        : null;

    const existingLines = Array.isArray(existingData?.nfcLineProfiles)
      ? (existingData.nfcLineProfiles as NfcLineProfile[])
      : [];

    const updatedLines = existingLines.length > 0
      ? existingLines.map((line) =>
          line.lineKey === lineKey
            ? { ...line, nfcProfile: sanitizedProfile }
            : line
        )
      : [
          {
            lineKey,
            itemId: lineKey.split('__')[0] || 'nfc-legacy',
            title: 'NFC Card',
            nfcProfile: sanitizedProfile,
          },
        ];

    const updatePayload: Record<string, unknown> = {
      nfcLineProfiles: sanitizeNfcLineProfiles(updatedLines),
      updatedAt: serverTimestamp(),
    };

    if (updatedLines.length === 1) {
      updatePayload.nfcProfile = sanitizedProfile;
    }

    await ensureAtLeastOneWriteSucceeded([
      updateDoc(bookingRef, updatePayload),
      updateDoc(legacyRef, updatePayload),
    ], 'update prebooking NFC profile');
  } else {
    await ensureAtLeastOneWriteSucceeded([
      updateDoc(doc(db, BOOKING_COLLECTION, orderId), {
        nfcProfile: sanitizedProfile,
        updatedAt: serverTimestamp(),
      }),
      updateDoc(doc(db, LEGACY_PREBOOKINGS_COLLECTION, orderId), {
        nfcProfile: sanitizedProfile,
        updatedAt: serverTimestamp(),
      }),
    ], 'update prebooking NFC profile');
  }

  await syncNfcProfileToPublicDomain(profileId || orderId, sanitizedProfile);
};

export const syncNfcProfileToPublicDomain = async (
  profileId: string,
  nfcProfile: NFCProfile,
  orderData?: SyncNfcOrderData
): Promise<void> => {
  const baseUrl = getPaymentApiBaseUrl();
  if (!baseUrl) {
    throw new Error('Payment API is not configured. Add VITE_PAYMENT_API_BASE_URL to your env.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be logged in to sync your profile.');
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch(`${baseUrl}/syncNfcProfileDraft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      profileId,
      nfcProfile,
      ...(orderData ? { orderData } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to sync NFC profile to public domain.');
  }
};
