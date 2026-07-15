export interface ColorVariant {
  color: string;
  image: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  image?: string;
  images?: string[];
  emoji?: string;
  popular?: boolean;
  features: string[];
  disabled?: boolean;
  tags?: string[];
  colorVariants?: ColorVariant[];
}

export interface ProductCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  coverImage: string;
  gradient: string;
  products: ProductVariant[];
}

export interface CategoryTutorial {
  title: string;
  subtitle: string;
  steps: string[];
  tip: string;
}

const storageBucketName = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").replace(/^gs:\/\//, "");

const normalizeStorageObjectPath = (rawPath: string): string => {
  const normalized = rawPath.trim().replace(/\\/g, "/").replace(/^\/+/, "");

  if (!normalized) {
    return "";
  }

  return normalized.startsWith("products/") ? normalized : `products/${normalized}`;
};

const decodeObjectPath = (path: string): string => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const extractStoragePathFromUrl = (urlValue: string): string => {
  try {
    const parsed = new URL(urlValue);
    const marker = "/o/";
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return "";
    }

    const encodedPath = parsed.pathname.slice(markerIndex + marker.length);
    return normalizeStorageObjectPath(decodeObjectPath(encodedPath));
  } catch {
    return "";
  }
};

export const buildProductImageUrl = (fileNameOrPath: string): string => {
  const objectPath = normalizeStorageObjectPath(fileNameOrPath);

  if (!storageBucketName || !objectPath) {
    return "";
  }

  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucketName}/o/${encodedPath}?alt=media`;
};

export const resolveProductImageUrl = (image?: string): string => {
  const rawImage = (image || "").trim();

  if (!rawImage) {
    return "";
  }

  if (/^data:/i.test(rawImage)) {
    return rawImage;
  }

  if (/^https?:\/\//i.test(rawImage)) {
    const objectPath = extractStoragePathFromUrl(rawImage);
    return objectPath ? buildProductImageUrl(objectPath) : rawImage;
  }

  const withoutQuery = rawImage.split("?")[0].split("#")[0].trim();
  const normalized = withoutQuery.replace(/\\/g, "/");

  const productsIndex = normalized.toLowerCase().lastIndexOf("products/");
  if (productsIndex >= 0) {
    const pathFromProducts = normalizeStorageObjectPath(normalized.slice(productsIndex));
    return pathFromProducts ? buildProductImageUrl(pathFromProducts) : "";
  }

  const fileName = decodeObjectPath(normalized.split("/").pop() || "").trim();

  if (!fileName) {
    return "";
  }

  return buildProductImageUrl(fileName);
};

const CATEGORY_GRADIENTS = [
  "from-amber-500/20 to-yellow-500/10",
  "from-rose-500/20 to-pink-500/10",
  "from-teal-500/20 to-emerald-500/10",
  "from-sky-500/20 to-blue-500/10",
  "from-slate-500/20 to-zinc-500/10",
  "from-gray-500/20 to-neutral-500/10",
];

const DEFAULT_CATEGORY_ICON = "📦";

export const normalizeCategorySlug = (rawSlug: string): string => {
  return rawSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const categoryNameFromSlug = (slug: string): string => {
  const normalized = normalizeCategorySlug(slug);

  if (!normalized) {
    return "Uncategorized";
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const categoryGradientFromSlug = (slug: string): string => {
  const normalized = normalizeCategorySlug(slug);
  if (!normalized) {
    return CATEGORY_GRADIENTS[0];
  }

  return CATEGORY_GRADIENTS[hashString(normalized) % CATEGORY_GRADIENTS.length];
};

export const categoryDescriptionFromName = (categorySlugOrName: string, categoryName?: string): string => {
  const normalizedSlug = normalizeCategorySlug(categorySlugOrName);
  const displayName = categoryName || categoryNameFromSlug(categorySlugOrName);

  const descriptionBySlug: Record<string, string> = {
    "car-tags": "Hang on your dashboard. Anyone who needs to reach you about parking or an emergency can scan and alert you — without ever seeing your phone number.",
    "pet-tags": "Clip onto your pet's collar. If they wander off, whoever finds them can call or message you immediately — safely and anonymously.",
    "nfc-cards": "Tap your card to share contact details instantly. No app needed for the other person — seamless, private, and effortless.",
    "keychain-tags": "Attach to your keys or wallet. A quick scan lets anyone who finds them reach you safely, without knowing who you are.",
    "smart-keychain-tags": "Attach to your keys, bag, or wallet. A quick scan lets anyone who finds them reach you safely and privately.",
    "backpack-stickers": "Stick it on your bag or laptop. If it ever gets lost, the finder can contact you instantly and privately — no personal details exposed.",
  };

  return descriptionBySlug[normalizedSlug] || `Smart ${displayName} products for secure identification and faster owner contact.`;
};

export const categoryIconFromProducts = (products: ProductVariant[]): string => {
  const iconSource = products.find((product) => typeof product.emoji === "string" && product.emoji.trim());
  return iconSource?.emoji?.trim() || DEFAULT_CATEGORY_ICON;
};

export const categoryCoverImageFromProducts = (products: ProductVariant[]): string => {
  const coverSource = [...products]
    .filter((product) => typeof product.image === "string" && product.image.trim())
    .sort((left, right) => {
      if (Boolean(left.popular) !== Boolean(right.popular)) {
        return Number(Boolean(right.popular)) - Number(Boolean(left.popular));
      }

      return left.title.localeCompare(right.title);
    })[0];

  return coverSource?.image?.trim() || "";
};

export const startingPriceFromProducts = (products: ProductVariant[]): string => {
  if (!products || products.length === 0) return "";

  let minPrice = Number.POSITIVE_INFINITY;
  let minPriceStr = "";

  for (const p of products) {
    const raw = (p.price || "").trim();
    if (!raw) continue;

    const numeric = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(numeric)) continue;

    if (numeric < minPrice) {
      minPrice = numeric;
      minPriceStr = raw;
    }
  }

  return minPriceStr;
};
export const buildGenericCategoryTutorial = (categoryName: string): CategoryTutorial => {
  return {
    title: `How to Use Your ${categoryName}`,
    subtitle: "Set it up once, keep details updated, and stay reachable when someone scans it.",
    steps: [
      "Choose your design and complete checkout.",
      "Open your profile and add the contact details you want to share.",
      "Place or carry the product where it stays visible and easy to scan.",
      "Update your details anytime from your profile without replacing the product.",
    ],
    tip: "Run one quick scan test after setup to confirm your public profile opens correctly.",
  };
};

const buildStorageImageUrl = (fileName: string): string => {
  return buildProductImageUrl(fileName);
};

const nfcShinchan = buildStorageImageUrl("nfc_shinchan.png");
const nfcOnepiece = buildStorageImageUrl("nfc_onepiece.png");
const nfcPhoenix = buildStorageImageUrl("nfc_phoenix.png");
const nfcMindset = buildStorageImageUrl("nfc_mindset.png");
const nfcYoucan = buildStorageImageUrl("nfc_youcan.png");
const backpackSticker = buildStorageImageUrl("products/backpack-stickers/backpack_sticker.png");
const backpackSticker1 = buildStorageImageUrl("products/backpack-stickers/backpack_sticker1.png");
const backpackSticker2 = buildStorageImageUrl("products/backpack-stickers/backpack_sticker2.png");
const keytagBlack = buildStorageImageUrl("keytag_black.png");
const keytagRed = buildStorageImageUrl("keytag_red.png");
const keytagNavy = buildStorageImageUrl("keytag_navy.png");
const keytagTeal = buildStorageImageUrl("keytag_teal.png");
const petSafetyTag = buildStorageImageUrl("Pet Tags.jpeg");
const tagCircle1 = buildStorageImageUrl("tag_circle1.png");
const tagCircle2 = buildStorageImageUrl("tag_circle2.png");
const tagOval = buildStorageImageUrl("tag_oval.png");
const tagSquareBlack = buildStorageImageUrl("tag_square_black.png");
const tagSquareYellow = buildStorageImageUrl("tag_square_yellow.png");
const carcardFront = buildStorageImageUrl("product-card.png");

// Make the in-repo static product catalog empty so Firestore is the canonical source of truth.
// The helpers and types in this file are still exported for UI utilities, but product data
// should be populated from Firestore via `productService` / subscriptions.
export const productCatalog: ProductCategory[] = [];

export const baseCategories: Omit<ProductCategory, "products">[] = productCatalog.map(({ products, ...category }) => category);

export const categoryTutorials: Record<string, CategoryTutorial> = {
  "car-tags": {
    title: "How to Use Your Car Tag",
    subtitle: "Set it once and help people reach you when your car needs attention.",
    steps: [
      "Attach the card clearly on your dashboard or near the windshield.",
      "Activate your profile after purchase and add your preferred contact method.",
      "If someone scans the QR, they can contact you without seeing your personal details.",
      "Update phone or emergency message anytime from your profile dashboard.",
    ],
    tip: "Best placement: front dashboard where the QR is visible from outside.",
  },

  "pet-tags": {
    title: "How to Use Your Pet Tag",
    subtitle: "Help anyone who finds your pet contact you in seconds.",
    steps: [
      "Attach the tag to your pet collar with the QR side facing outward.",
      "Activate the profile and add pet name, your contact, and emergency details.",
      "If your pet is lost, a quick scan lets finders reach you safely.",
      "Update profile whenever your address or phone number changes.",
    ],
    tip: "Use a secure ring and test the scan once after attaching to the collar.",
  },
  "nfc-cards": {
    title: "How to Use Your NFC Card",
    subtitle: "Tap or scan to instantly share your profile, links, or contact details.",
    steps: [
      "Activate your NFC card and set your public profile details.",
      "To share, ask the other person to tap phone on card or scan the QR.",
      "For phones with NFC off, QR scan works as the backup method.",
      "Edit links and contact details any time without changing the card.",
    ],
    tip: "Ask users to unlock their phone before tapping for fastest NFC detection.",
  },
  "keychain-tags": {
    title: "How to Use Your Keychain Tag",
    subtitle: "Keep your keys protected with a scannable owner-contact tag.",
    steps: [
      "Attach the tag to your keychain with QR clearly visible.",
      "Activate the QR profile and add how you prefer to be contacted.",
      "If keys are lost, the finder scans and contacts you securely.",
      "Keep your contact details updated to ensure faster returns.",
    ],
    tip: "Use a sturdy ring to avoid bending or accidental tag loss.",
  },
  "backpack-stickers": {
    title: "How to Use Backpack & Laptop Stickers",
    subtitle: "Smart identification for bags and devices with easy scan recovery.",
    steps: [
      "Clean the surface and apply sticker on a flat visible area.",
      "Press firmly for a few seconds for better long-term adhesion.",
      "Activate your QR profile with contact details and return note.",
      "If found, scanner can contact you quickly without exposing private data.",
    ],
    tip: "Avoid curved or dusty surfaces for best sticking strength.",
  },
};