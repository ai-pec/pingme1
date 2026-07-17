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
    question: "Can I use PingME in basement parkings with no signal?",
    answer: "The person scanning needs a signal to send the alert. If you are in a dead zone, PingME will queue the notification and alert you the moment you reconnect to Wi-Fi or cellular data.",
    category: "Usage & Technical",
    sortOrder: 10,
  },
  // Lost & Found Stickers
  {
    question: "What are Lost & Found Stickers?",
    answer: "Lost & Found Stickers are durable, weatherproof QR code stickers (and optional NFC chips) you attach to valuable items like bicycles, luggage, laptops, cameras, or electronics. If your item is found, the finder scans the code or taps with their NFC phone to contact you through PingME's secure platform — no app needed, no personal details exposed.",
    category: "Lost & Found Stickers",
    sortOrder: 11,
  },
  {
    question: "Where can I use Lost & Found Stickers?",
    answer: "Attach them to any personal item you want to protect: bicycles, backpacks, suitcases, laptops, cameras, sports equipment, musical instruments, drones, gaming consoles, or any other valuables. They're weatherproof, UV-resistant, and designed to withstand daily wear, outdoor exposure, and extreme temperatures for years.",
    category: "Lost & Found Stickers",
    sortOrder: 12,
  },
  {
    question: "What happens if someone finds my item and scans the sticker?",
    answer: "When someone scans your Lost & Found Sticker, they see a friendly recovery message with your PingME contact link. They can send you a message with photos, location details, and information about where they found your item. You receive an instant notification and can coordinate pickup, delivery, or reward arrangements directly through the app.",
    category: "Lost & Found Stickers",
    sortOrder: 13,
  },
  {
    question: "Can I track my lost item in real-time?",
    answer: "The sticker doesn't provide GPS tracking on its own. However, when someone scans it and contacts you, their location (with permission) is shared through PingME, showing you exactly where your item was found. This helps you coordinate recovery quickly.",
    category: "Lost & Found Stickers",
    sortOrder: 14,
  },
  {
    question: "How durable are Lost & Found Stickers?",
    answer: "Our stickers are made from premium 3M materials with military-grade adhesive. They're water-resistant, UV-resistant, and can withstand extreme temperatures (-30°C to 60°C). The QR code remains scannable even after years of outdoor exposure.",
    category: "Lost & Found Stickers",
    sortOrder: 14.5,
  },
  {
    question: "Can I customize what message appears when my item is found?",
    answer: "Yes. Through the PingME app, you can set a custom recovery message, specify a reward amount, add item details (color, serial number), and even include a thank-you note. The finder sees exactly what you want them to see.",
    category: "Lost & Found Stickers",
    sortOrder: 14.6,
  },
  // NFC Cards
  {
    question: "What are NFC Cards and how do they work?",
    answer: "NFC (Near Field Communication) Cards are contactless cards embedded with a chip. Simply tap your NFC card on any NFC-enabled smartphone, and it instantly opens your PingME profile or performs a custom action without needing to scan a QR code.",
    category: "NFC Cards",
    sortOrder: 15,
  },
  {
    question: "Do I need special equipment to use NFC Cards?",
    answer: "No. Most modern smartphones (iPhone 11 and later, Android 4.1+) have built-in NFC readers. There's no app installation needed—users just tap the card on their phone to access your information.",
    category: "NFC Cards",
    sortOrder: 16,
  },
  {
    question: "What are the advantages of NFC Cards over QR codes?",
    answer: "NFC Cards are faster and more intuitive—just a tap instead of a scan. They work even in poor lighting conditions, don't require the phone to be perfectly aligned, and they feel more professional, especially for business cards or vehicle identification.",
    category: "NFC Cards",
    sortOrder: 17,
  },
  {
    question: "Can I customize what happens when someone taps my NFC Card?",
    answer: "Yes. You can set custom actions like opening your contact details, sending an alert, triggering a specific action, or displaying a custom message. All configurable through the PingME app.",
    category: "NFC Cards",
    sortOrder: 18,
  },
  {
    question: "Can NFC Cards be reused?",
    answer: "Absolutely. Unlike one-time-use cards, PingME NFC Cards can be reprogrammed and reused unlimited times. You can change the linked action anytime from your app without replacing the physical card.",
    category: "NFC Cards",
    sortOrder: 19,
  },
  // Smart Keychain Tags
  {
    question: "What are Smart Keychain Tags?",
    answer: "Smart Keychain Tags are compact, ultra-lightweight tags combining QR code + NFC technology in one device. Attach to your keys, bag, wallet, or any item you carry daily. Finders can either scan the QR code with their camera OR tap their NFC-enabled phone — both ways route them to a secure contact page where they can reach you without seeing your personal details.",
    category: "Smart Keychain Tags",
    sortOrder: 20,
  },
  {
    question: "Why use a Smart Keychain Tag instead of just keeping my keys safe?",
    answer: "Even with the best precautions, keys get lost. A Smart Keychain Tag ensures that if someone finds them, they can contact you immediately through PingME's secure platform. This dramatically increases recovery chances — and unlike traditional key tags or engraved labels, your phone number is never exposed.",
    category: "Smart Keychain Tags",
    sortOrder: 21,
  },
  {
    question: "How durable are Smart Keychain Tags?",
    answer: "Our Smart Keychain Tags are engineered for durability with military-grade materials, water-resistant (IP67 rated), and designed to withstand daily wear, temperature extremes (-20°C to 50°C), and impacts. They're backed by a comprehensive 2-year durability guarantee covering accidental damage.",
    category: "Smart Keychain Tags",
    sortOrder: 22,
  },
  {
    question: "Can I set multiple actions on one Smart Keychain Tag?",
    answer: "Each tag has one primary action (e.g., 'Lost Keys - Contact Me'). However, when someone contacts you through the tag, you can respond with various options: direct call, delivery arrangement, reward offer, or meet-up location based on the situation.",
    category: "Smart Keychain Tags",
    sortOrder: 23,
  },
  {
    question: "What if my Smart Keychain Tag gets damaged?",
    answer: "You can instantly deactivate the damaged tag through the app and link a replacement. Your contact information stays associated with your account, so there's no loss of recovery capability. We offer affordable replacement tags for long-term users.",
    category: "Smart Keychain Tags",
    sortOrder: 24,
  },
  {
    question: "What's the advantage of dual QR+NFC technology on Smart Keychain Tags?",
    answer: "Dual technology means finders have options: older phones can scan the QR code with their camera, while modern smartphones can tap the NFC chip for instant contact. This maximizes the chances of recovery since almost any smartphone can reach you, regardless of the device or user preference.",
    category: "Smart Keychain Tags",
    sortOrder: 24.5,
  },
  {
    question: "How do I attach a Smart Keychain Tag to my keys?",
    answer: "Smart Keychain Tags come with a durable stainless steel keyring attachment, secure carabiner clip, or keychain loop. Choose your preferred attachment style, and it locks securely to your keys, bags, or wallets. The attachment is rated for 100+ connect/disconnect cycles.",
    category: "Smart Keychain Tags",
    sortOrder: 24.6,
  },
  {
    question: "Can I use Smart Keychain Tags for multiple items (keys, bag, wallet)?",
    answer: "You can register multiple tags in the same PingME account, each linked to different items. This way, if you lose your keys, bag, or wallet, finders can reach you through the same secure account. You'll receive notifications for each tag separately.",
    category: "Smart Keychain Tags",
    sortOrder: 24.7,
  },
  // Pet Tags
  {
    question: "What are Pet Tags and how do they help?",
    answer: "Pet Tags are lightweight, durable tags with QR codes and/or NFC chips designed specifically for pet safety. If your dog, cat, or other pet gets lost, anyone who finds them can scan or tap the tag to contact you through PingME's secure platform. Your phone number stays hidden, but the finder can reach you instantly — dramatically improving recovery chances.",
    category: "Pet Tags",
    sortOrder: 25,
  },
  {
    question: "Are Pet Tags safe for my pets?",
    answer: "Absolutely. Pet Tags are engineered for animal safety with rounded edges, no sharp corners, lightweight materials (typically 15-25g), and secure attachment options for collars, harnesses, or microchip housings. They're non-toxic, water-resistant, and comfortable for pets to wear 24/7.",
    category: "Pet Tags",
    sortOrder: 26,
  },
  {
    question: "What information is shown when someone finds my pet?",
    answer: "When someone scans your Pet Tag, they see a friendly message like 'This pet is lost! Help reunite them with their family' along with a PingME contact link. They can send you a message with photos, location, and details about where they found your pet. You control what information they see — pet name, breed, special needs, or emergency contacts.",
    category: "Pet Tags",
    sortOrder: 27,
  },
  {
    question: "Can I track my pet's real-time location with Pet Tags?",
    answer: "Pet Tags don't provide GPS tracking on their own. However, when a finder scans the tag and sends you their location (with permission), you know exactly where your pet was found. For real-time GPS tracking, you can integrate a separate GPS collar with your PingME account.",
    category: "Pet Tags",
    sortOrder: 28,
  },
  {
    question: "What if my pet tag gets lost or damaged?",
    answer: "You can instantly deactivate the old tag through the PingME app and activate a replacement. Your pet's contact information is linked to your account, not the physical tag, so you can replace tags unlimited times without losing recovery capability.",
    category: "Pet Tags",
    sortOrder: 29,
  },
  {
    question: "Do I need to include my pet's name on the tag?",
    answer: "It's optional. For maximum privacy, keep the physical tag minimal — no personal details printed on it. The finder sees everything through PingME's secure platform, protecting your pet's identity and your location data.",
    category: "Pet Tags",
    sortOrder: 30,
  },
  {
    question: "How is a PingME Pet Tag different from traditional engraved tags?",
    answer: "Traditional tags expose your phone number and address to anyone — including potential thieves. PingME Pet Tags are completely private: finders can't see your details, they just know it's a lost pet and can help. Plus, you can update information anytime without buying a new tag, and you get detailed alerts when your pet is found.",
    category: "Pet Tags",
    sortOrder: 30.5,
  },
  {
    question: "Can I set multiple emergency contacts for my pet?",
    answer: "Yes. Through the PingME app, you can add secondary contacts (family members, neighbors, vets) who will receive alerts if your pet is found. This ensures someone can help reunite your pet with you even if you're unreachable.",
    category: "Pet Tags",
    sortOrder: 30.6,
  },
  // General / Comprehensive
  {
    question: "How do Lost & Found Tags, Pet Tags, and Smart Keychain Tags work together?",
    answer: "Each product uses the same PingME secure platform but serves different needs: Lost & Found Tags protect valuables (bags, laptops, bicycles), Pet Tags protect your furry family members, and Smart Keychain Tags protect everyday carry items (keys, wallets). You can use all three together under one account, receiving unified alerts for all your protected items.",
    category: "General / Multi-Product",
    sortOrder: 31,
  },
  {
    question: "Can I monitor all my PingME tags (vehicle, lost items, pet, keychain) from one app?",
    answer: "Yes. The PingME app provides a unified dashboard showing all your active tags, recent alerts, and recovery history. You can manage, customize, and monitor vehicle tags, Lost & Found tags, Pet Tags, and Smart Keychain Tags all in one place with separate notification settings for each.",
    category: "General / Multi-Product",
    sortOrder: 32,
  },
  {
    question: "What makes PingME different from Bluetooth trackers like AirTag or Tile?",
    answer: "PingME uses QR codes and NFC technology, so finders don't need to install an app or own a specific brand ecosystem. Any smartphone can help — they just scan or tap. Plus, PingME is specifically optimized for privacy: finders see no personal information unless you choose to share it. Ideal for vehicles, pets, bags, and everyday items where privacy matters most.",
    category: "General / Multi-Product",
    sortOrder: 33,
  },
  {
    question: "Is PingME only available in India?",
    answer: "PingME was built for the Indian market with features specifically designed for Indian cities and user needs. However, the QR/NFC technology works worldwide — if your item travels internationally, anyone with a smartphone can help reunite it with you securely.",
    category: "General / Multi-Product",
    sortOrder: 34,
  },
  {
    question: "What's your refund or warranty policy for tags that don't work?",
    answer: "All PingME tags come with a 30-day satisfaction guarantee. If your tag doesn't work as expected, we'll refund or replace it. Most tags also carry a 2-year durability warranty against manufacturing defects. Contact support for easy claims processing.",
    category: "General / Multi-Product",
    sortOrder: 35,
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
