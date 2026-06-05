import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const FAQS_COLLECTION = "faqs";

export const DEFAULT_FAQS: Omit<FAQItem, "id">[] = [
  // General Questions
  {
    question: "What is PingME?",
    answer: "PingME is a smart parking and privacy solution that uses QR codes to facilitate communication between vehicle owners and others without revealing personal phone numbers. It ensures your car is reachable when parked, while keeping your data secure.",
    category: "General Questions",
    sortOrder: 1,
  },
  {
    question: "How does the QR code work?",
    answer: "Once you place a PingME sticker on your vehicle, anyone who needs you to move your car can simply scan the QR code. This opens a secure portal where they can send you a notification or call you via our encrypted system.",
    category: "General Questions",
    sortOrder: 2,
  },
  {
    question: "Why should I use PingME instead of leaving my phone number on the dashboard?",
    answer: "Leaving your phone number in plain sight exposes you to unsolicited calls, scams, and privacy risks. PingME acts as a protective shield, allowing people to contact you only for vehicle-related matters while keeping your private number hidden.",
    category: "General Questions",
    sortOrder: 3,
  },
  // Privacy & Security
  {
    question: "Is my personal information safe?",
    answer: "Absolutely. The person scanning your QR code never sees your phone number or name. All communication is routed through our secure platform to maintain 100% anonymity.",
    category: "Privacy & Security",
    sortOrder: 4,
  },
  {
    question: "Is my location tracked when someone scans the code?",
    answer: "No. The scan only triggers a notification to you. PingME does not share your real-time GPS coordinates with the person scanning the code.",
    category: "Privacy & Security",
    sortOrder: 5,
  },
  {
    question: "How does PingME handle spam scans?",
    answer: "The interface is designed specifically for vehicle alerts. We use rate-limiting and reporting features to prevent misuse of the scanning system.",
    category: "Privacy & Security",
    sortOrder: 6,
  },
  // Usage & Technical
  {
    question: "Do I need a special app to scan the QR code?",
    answer: "No. Any smartphone with a standard camera can scan the PingME sticker. Vehicle owners use the app to manage alerts, but the person scanning does not need to install anything.",
    category: "Usage & Technical",
    sortOrder: 7,
  },
  {
    question: "Can I link multiple family members to the same car?",
    answer: "Yes. You can set up 'Secondary Contacts' so that if you don't respond to a scan, the system can automatically notify another person to ensure the vehicle is moved promptly.",
    category: "Usage & Technical",
    sortOrder: 8,
  },
  {
    question: "What if my QR sticker is damaged or stolen?",
    answer: "You can instantly deactivate that specific QR code through your app and link a replacement sticker to your profile in seconds.",
    category: "Usage & Technical",
    sortOrder: 9,
  },
  {
    question: "Can I use PingME in basement parkings with no signal?",
    answer: "The person scanning needs a signal to send the alert. If you are in a dead zone, PingME will queue the notification and alert you the moment you reconnect to Wi-Fi or cellular data.",
    category: "Usage & Technical",
    sortOrder: 10,
  },
];

export function subscribeToFAQs(
  onUpdate: (faqs: FAQItem[]) => void,
  onError: (error: Error) => void
): () => void {
  const faqsQuery = query(
    collection(db, FAQS_COLLECTION),
    orderBy("sortOrder", "asc")
  );

  return onSnapshot(
    faqsQuery,
    (snapshot) => {
      const items: FAQItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FAQItem, "id">),
      }));
      onUpdate(items);
    },
    (error) => {
      onError(error);
    }
  );
}

export async function getFAQs(): Promise<FAQItem[]> {
  const faqsQuery = query(
    collection(db, FAQS_COLLECTION),
    orderBy("sortOrder", "asc")
  );
  const snapshot = await getDocs(faqsQuery);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<FAQItem, "id">),
  }));
}

export async function saveFAQ(faq: Omit<FAQItem, "createdAt" | "updatedAt">): Promise<string> {
  const id = faq.id || doc(collection(db, FAQS_COLLECTION)).id;
  const docRef = doc(db, FAQS_COLLECTION, id);

  const payload = {
    question: faq.question.trim(),
    answer: faq.answer.trim(),
    category: faq.category.trim(),
    sortOrder: Number(faq.sortOrder) || 0,
    updatedAt: serverTimestamp(),
  };

  if (faq.id) {
    await setDoc(docRef, payload, { merge: true });
  } else {
    await setDoc(docRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  }

  return id;
}

export async function deleteFAQ(id: string): Promise<void> {
  await deleteDoc(doc(db, FAQS_COLLECTION, id));
}

export async function initializeDefaultFAQs(): Promise<void> {
  const existing = await getFAQs();
  if (existing.length > 0) return; // Don't overwrite if not empty

  const batchPromises = DEFAULT_FAQS.map((faq, index) => {
    const newDocRef = doc(collection(db, FAQS_COLLECTION));
    return setDoc(newDocRef, {
      ...faq,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await Promise.all(batchPromises);
}
