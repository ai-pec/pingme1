import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { normalizeCategorySlug, ProductVariant, resolveProductImageUrl } from "./productCatalog";

export interface DbProduct extends ProductVariant {
  categorySlug: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const normalizeFeatures = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((feature): feature is string => typeof feature === "string")
    .map((feature) => feature.trim())
    .filter(Boolean);
};

const mapToDbProduct = (id: string, value: Record<string, unknown>): DbProduct => {
  const categorySlug = normalizeCategorySlug(typeof value.categorySlug === "string" ? value.categorySlug : "") || "uncategorized";
  const image = resolveProductImageUrl(typeof value.image === "string" ? value.image : "");

  return {
    id,
    categorySlug,
    title: typeof value.title === "string" ? value.title : "",
    price: typeof value.price === "string" ? value.price : "",
    originalPrice: typeof value.originalPrice === "string" && value.originalPrice.trim() ? value.originalPrice : undefined,
    image: image || undefined,
    emoji: typeof value.emoji === "string" && value.emoji.trim() ? value.emoji : undefined,
    popular: Boolean(value.popular),
    features: normalizeFeatures(value.features),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const subscribeToProducts = (
  onUpdate: (products: DbProduct[]) => void,
  onError: (error: Error) => void
) => {
  const productsRef = collection(db, "products");
  
  return onSnapshot(
    productsRef,
    (snapshot) => {
      const products: DbProduct[] = [];
      snapshot.forEach((doc) => {
        products.push(mapToDbProduct(doc.id, doc.data() as Record<string, unknown>));
      });
      onUpdate(products);
    },
    (error) => {
      console.error("Error subscribing to products:", error);
      onError(error);
    }
  );
};

export const getProducts = async (): Promise<DbProduct[]> => {
  const productsRef = collection(db, "products");
  const snapshot = await getDocs(productsRef);
  const products: DbProduct[] = [];
  snapshot.forEach((doc) => {
    products.push(mapToDbProduct(doc.id, doc.data() as Record<string, unknown>));
  });
  return products;
};

export const saveProduct = async (product: Omit<DbProduct, "updatedAt">) => {
  if (!product.id) {
    product.id = doc(collection(db, "products")).id;
  }

  const normalizedCategorySlug = normalizeCategorySlug(product.categorySlug) || "uncategorized";
  const normalizedImage = resolveProductImageUrl(product.image);
  const normalizedEmoji = typeof product.emoji === "string" && product.emoji.trim() ? product.emoji.trim() : "";
  const cleanedProduct: Record<string, unknown> = {
    id: product.id,
    categorySlug: normalizedCategorySlug,
    title: product.title,
    price: product.price,
    popular: Boolean(product.popular),
    features: normalizeFeatures(product.features),
    updatedAt: serverTimestamp(),
    ...(normalizedImage ? { image: normalizedImage } : {}),
    ...(normalizedEmoji ? { emoji: normalizedEmoji } : {}),
    ...(typeof product.originalPrice === "string" && product.originalPrice.trim()
      ? { originalPrice: product.originalPrice.trim() }
      : {}),
    ...(product.createdAt ? { createdAt: product.createdAt } : {}),
  };

  const productRef = doc(db, "products", product.id);
  await setDoc(productRef, cleanedProduct, { merge: true });
};

export const deleteProductDoc = async (id: string) => {
  await deleteDoc(doc(db, "products", id));
};

export const uploadProductImage = async (file: File, rawCategorySlug?: string): Promise<string> => {
  if (!file) throw new Error("No file provided");
  const categorySlug = normalizeCategorySlug(rawCategorySlug || "") || "uncategorized";
  const safeFileName = file.name.replace(/\s+/g, "_");
  const fileName = `products/${categorySlug}/${Date.now()}_${safeFileName}`;
  const storageRef = ref(storage, fileName);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "public,max-age=31536000,immutable",
  });
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};
