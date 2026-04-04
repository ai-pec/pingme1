import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CartItem {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  image?: string;
  emoji?: string;
  quantity: number;
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
}

// Simple text sanitizer to prevent XSS
const sanitizeText = (text: string): string => {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
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
      const cleanItem: Record<string, any> = {
        id: item.id,
        title: sanitizeText(item.title),
        price: item.price,
        quantity: Math.min(Math.max(1, item.quantity), 10),
      };
      if (item.originalPrice) cleanItem.originalPrice = item.originalPrice;
      if (item.image) cleanItem.image = item.image;
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
    ...(data.userId ? { userId: data.userId } : {}),
    createdAt: serverTimestamp(),
  };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 10000)
  );

  const docRef = await Promise.race([
    addDoc(collection(db, 'prebookings'), sanitizedData),
    timeoutPromise,
  ]);

  return docRef.id;
};

export interface PrebookingRecord extends PrebookingData {
  id: string;
  createdAt: any;
}

interface GetUserPrebookingsParams {
  userId?: string;
  email?: string;
}

const toMillis = (createdAt: any): number => {
  if (!createdAt) return 0;
  if (typeof createdAt?.toMillis === 'function') return createdAt.toMillis();
  if (createdAt?.seconds) return createdAt.seconds * 1000;
  return 0;
};

export const getUserPrebookings = async ({ userId, email }: GetUserPrebookingsParams): Promise<PrebookingRecord[]> => {
  try {
    if (!userId && !email) return [];

    // Prefer userId query because email can change later in account settings.
    if (userId) {
      const byUserId = query(collection(db, 'prebookings'), where('userId', '==', userId));
      const userSnapshot = await getDocs(byUserId);
      if (!userSnapshot.empty) {
        return userSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as PrebookingRecord))
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      }
    }

    if (email) {
      const byEmail = query(collection(db, 'prebookings'), where('email', '==', email));
      const emailSnapshot = await getDocs(byEmail);
      return emailSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as PrebookingRecord))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch prebookings:', error);
    return [];
  }
};
