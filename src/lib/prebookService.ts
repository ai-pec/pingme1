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
import { expandNfcCartUnits, isNfcCartItem } from '@/lib/nfcCheckout';

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
  businessOverview?: string;
  businessTags?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  companyAddress?: string;
  googleMapsLink?: string;
  upiId?: string;
  razorpayLink?: string;
  appointmentBookingLink?: string;
  projects?: Array<{
    name: string;
    description?: string;
    link?: string;
    photo?: string;
    type?: string;
  }>;
  documents?: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
  themeBgColor?: string;
  themeAccentColor?: string;
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
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
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


// Unified, cross-product orders collection (shared with the app project).
const ORDERS_COLLECTION = 'orders';
// Marks which front-end created the order so each app can filter to its own.
const ORDER_SOURCE = 'website';

// Parse a possibly-formatted price string (e.g. "₹1,999") into a number.
const parsePrice = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

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
    ...(profile.businessOverview ? { businessOverview: sanitizeText(profile.businessOverview) } : {}),
    ...(profile.businessTags ? { businessTags: sanitizeText(profile.businessTags) } : {}),
    ...(profile.website ? { website: sanitizeText(profile.website) } : {}),
    ...(profile.address ? { address: sanitizeText(profile.address) } : {}),
    ...(profile.linkedin ? { linkedin: sanitizeText(profile.linkedin) } : {}),
    ...(profile.twitter ? { twitter: sanitizeText(profile.twitter) } : {}),
    ...(profile.instagram ? { instagram: sanitizeText(profile.instagram) } : {}),
    ...(profile.youtube ? { youtube: sanitizeText(profile.youtube) } : {}),
    ...(profile.facebook ? { facebook: sanitizeText(profile.facebook) } : {}),
    ...(profile.profilePhoto ? { profilePhoto: sanitizeText(profile.profilePhoto) } : {}),
    ...(profile.coverPhoto ? { coverPhoto: sanitizeText(profile.coverPhoto) } : {}),
    ...(profile.companyAddress ? { companyAddress: sanitizeText(profile.companyAddress) } : {}),
    ...(profile.googleMapsLink ? { googleMapsLink: sanitizeText(profile.googleMapsLink) } : {}),
    ...(profile.upiId ? { upiId: sanitizeText(profile.upiId) } : {}),
    ...(profile.razorpayLink ? { razorpayLink: sanitizeText(profile.razorpayLink) } : {}),
    ...(profile.appointmentBookingLink ? { appointmentBookingLink: sanitizeText(profile.appointmentBookingLink) } : {}),
    ...(profile.projects && profile.projects.length > 0
      ? {
          projects: profile.projects.map((project) => ({
            name: sanitizeText(project.name || ''),
            ...(project.description ? { description: sanitizeText(project.description) } : {}),
            ...(project.link ? { link: sanitizeText(project.link) } : {}),
            ...(project.photo ? { photo: sanitizeText(project.photo) } : {}),
            ...(project.type ? { type: sanitizeText(project.type) } : {}),
          })),
        }
      : {}),
    ...(profile.documents && profile.documents.length > 0
      ? {
          documents: profile.documents.map((doc) => ({
            title: sanitizeText(doc.title || ''),
            url: sanitizeText(doc.url || ''),
            ...(doc.type ? { type: sanitizeText(doc.type) } : {}),
          })),
        }
      : {}),
    ...(profile.themeBgColor ? { themeBgColor: sanitizeText(profile.themeBgColor) } : {}),
    ...(profile.themeAccentColor ? { themeAccentColor: sanitizeText(profile.themeAccentColor) } : {}),
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

  // Sanitize + map items into the canonical (cross-product) shape
  const items = data.items.map(item => {
    const cleanItem: Record<string, unknown> = {
      id: item.id,
      title: sanitizeText(item.title),
      productType: isNfcCartItem(item) ? 'nfc_card' : 'accessory',
      price: parsePrice(item.price),
      quantity: Math.min(Math.max(1, item.quantity), 10),
    };
    if (item.originalPrice) cleanItem.originalPrice = item.originalPrice;
    if (item.image) cleanItem.image = resolveProductImageUrl(item.image) || item.image;
    if (item.emoji) cleanItem.emoji = item.emoji;
    return cleanItem;
  });

  // NFC personalization lives under a namespaced object so non-NFC products are unaffected.
  const nfc: Record<string, unknown> = {};
  if (data.nfcLineProfiles && data.nfcLineProfiles.length > 0) {
    nfc.lineProfiles = sanitizeNfcLineProfiles(data.nfcLineProfiles);
  }
  if (data.nfcProfile) {
    nfc.profile = sanitizeNFCProfile(data.nfcProfile);
  }

  const canonicalOrder: Record<string, unknown> = {
    source: ORDER_SOURCE,
    status: data.status,
    customer: {
      uid: data.userId || null,
      name: sanitizeText(data.fullName),
      email: sanitizeText(data.email),
      phone: sanitizeText(data.phone),
    },
    delivery: {
      address: sanitizeText(data.address),
      city: sanitizeText(data.city),
      state: sanitizeText(data.state),
      pincode: sanitizeText(data.pincode),
    },
    items,
    amount: {
      subtotal: data.totalAmount,
      discount: 0,
      shipping: 0,
      total: data.totalAmount,
      currency: 'INR',
    },
    payment: data.payment
      ? {
          status: 'paid',
          gateway: data.payment.gateway,
          orderId: sanitizeText(data.payment.orderId),
          paymentId: sanitizeText(data.payment.paymentId),
          signature: sanitizeText(data.payment.signature),
          amount: data.payment.amount,
          currency: sanitizeText(data.payment.currency),
          ...(data.payment.paidAt ? { paidAt: sanitizeText(data.payment.paidAt) } : {}),
        }
      : { status: 'pending', gateway: null },
    ...(Object.keys(nfc).length > 0 ? { nfc } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 10000)
  );

  const docRef = await Promise.race([
    addDoc(collection(db, ORDERS_COLLECTION), canonicalOrder),
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

// Map a canonical (nested) `orders` document back into the website's flat
// PrebookingRecord shape so existing UI/invoice/admin code works unchanged.
// Tolerates already-flat (legacy) docs via the `?? data.X` fallbacks.
export const flattenOrder = (id: string, data: unknown): PrebookingRecord => {
  const d = isRecord(data) ? data : {};
  const customer = isRecord(d.customer) ? d.customer : {};
  const delivery = isRecord(d.delivery) ? d.delivery : {};
  const amount = isRecord(d.amount) ? d.amount : {};
  const nfc = isRecord(d.nfc) ? d.nfc : {};

  const flat: Record<string, unknown> = {
    ...d,
    userId: getString(customer.uid) ?? getString(d.userId),
    fullName: getString(customer.name) ?? getString(d.fullName) ?? '',
    email: getString(customer.email) ?? getString(d.email) ?? '',
    phone: getString(customer.phone) ?? getString(d.phone) ?? '',
    address: getString(delivery.address) ?? getString(d.address) ?? '',
    city: getString(delivery.city) ?? getString(d.city) ?? '',
    state: getString(delivery.state) ?? getString(d.state) ?? '',
    pincode: getString(delivery.pincode) ?? getString(d.pincode) ?? '',
    totalAmount: getNumber(amount.total) ?? getNumber(d.totalAmount) ?? 0,
    nfcProfile: isRecord(nfc.profile) ? nfc.profile : d.nfcProfile,
    nfcLineProfiles: Array.isArray(nfc.lineProfiles) ? nfc.lineProfiles : d.nfcLineProfiles,
  };

  return normalizeRecord(id, flat);
};

// Treat docs created by the website (or legacy docs with no `source`) as ours.
const isWebsiteOrder = (data: unknown): boolean => {
  const source = isRecord(data) ? data.source : undefined;
  return source === undefined || source === ORDER_SOURCE;
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

    // Prefer the uid query because email can change later in account settings.
    if (userId) {
      const snapshot = await getDocs(
        query(collection(db, ORDERS_COLLECTION), where('customer.uid', '==', userId))
      );
      const records = snapshot.docs
        .filter(doc => isWebsiteOrder(doc.data()))
        .map(doc => flattenOrder(doc.id, doc.data()));

      if (records.length > 0) {
        return mergeAndSort(records);
      }
    }

    if (email) {
      const snapshot = await getDocs(
        query(collection(db, ORDERS_COLLECTION), where('customer.email', '==', email))
      );
      const records = snapshot.docs
        .filter(doc => isWebsiteOrder(doc.data()))
        .map(doc => flattenOrder(doc.id, doc.data()));

      return mergeAndSort(records);
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch orders:', error);
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
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  if (lineKey) {
    const orderDoc = await getDoc(orderRef);
    const existingData = orderDoc.exists() ? orderDoc.data() : null;
    const existingNfc = isRecord(existingData?.nfc) ? (existingData!.nfc as Record<string, unknown>) : {};

    const existingLines = Array.isArray(existingNfc.lineProfiles)
      ? (existingNfc.lineProfiles as NfcLineProfile[])
      : Array.isArray(existingData?.nfcLineProfiles)
        ? (existingData!.nfcLineProfiles as NfcLineProfile[])
        : [];
    const existingProfileSource = isRecord(existingNfc.profile)
      ? existingNfc.profile
      : isRecord(existingData?.nfcProfile)
        ? existingData!.nfcProfile
        : null;
    const existingProfile = existingProfileSource
      ? sanitizeNFCProfile(existingProfileSource as unknown as NFCProfile)
      : sanitizedProfile;
    const units = expandNfcCartUnits(Array.isArray(existingData?.items) ? (existingData!.items as CartItem[]) : []);
    const seededLines = units.length > 0
      ? units.map((unit) => ({
          lineKey: unit.lineKey,
          itemId: unit.itemId,
          title: unit.title,
          nfcProfile: existingProfile,
        }))
      : [
          {
            lineKey,
            itemId: lineKey.split('__')[0] || 'nfc-legacy',
            title: 'NFC Card',
            nfcProfile: existingProfile,
          },
        ];

    const sourceLines = existingLines.length > 0 ? existingLines : seededLines;
    const hasTargetLine = sourceLines.some((line) => line.lineKey === lineKey);
    const updatedLines = (
      hasTargetLine
        ? sourceLines.map((line) =>
          line.lineKey === lineKey
            ? { ...line, nfcProfile: sanitizedProfile }
            : line
        )
        : [
          ...sourceLines,
          {
            lineKey,
            itemId: lineKey.split('__')[0] || 'nfc-legacy',
            title: 'NFC Card',
            nfcProfile: sanitizedProfile,
          },
        ]
    );

    const updatePayload: Record<string, unknown> = {
      'nfc.lineProfiles': sanitizeNfcLineProfiles(updatedLines),
      updatedAt: serverTimestamp(),
    };

    if (updatedLines.length === 1) {
      updatePayload['nfc.profile'] = sanitizedProfile;
    }

    await updateDoc(orderRef, updatePayload);
  } else {
    await updateDoc(orderRef, {
      'nfc.profile': sanitizedProfile,
      updatedAt: serverTimestamp(),
    });
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
