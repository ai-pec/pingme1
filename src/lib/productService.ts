import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp, writeBatch, query, where, getDoc, onSnapshot as onSnap, type DocumentData } from "firebase/firestore";
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

  const formatPrice = (v: unknown): string => {
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number" && Number.isFinite(v)) return `₹${v}`;
    return "";
  };

  return {
    id,
    categorySlug,
    title: typeof value.title === "string" ? value.title : "",
    price: formatPrice(value.price),
    originalPrice: ((): string | undefined => {
      const op = formatPrice(value.originalPrice);
      return op ? op : undefined;
    })(),
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

export interface ProductCategoryDoc {
  name?: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  gradient?: string;
  updatedAt?: unknown;
}

export interface ProductCategoryFullDoc extends ProductCategoryDoc {
  howToUse?: string;
  proTip?: string;
}

export const saveProductCategory = async (rawSlugOrName: string, data: ProductCategoryFullDoc) => {
  const slug = normalizeCategorySlug(rawSlugOrName) || "uncategorized";
  const ref = doc(db, "productCategories", slug);

  const toSave: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, toSave, { merge: true });
};

export const subscribeToProductCategories = (
  onUpdate: (map: Record<string, ProductCategoryDoc>) => void,
  onError: (error: Error) => void,
) => {
  const ref = collection(db, "productCategories");
  return onSnapshot(
    ref,
    (snapshot) => {
      const map: Record<string, ProductCategoryDoc> = {};
      snapshot.forEach((d) => {
        try {
          map[d.id] = d.data() as ProductCategoryDoc;
        } catch {
          map[d.id] = {};
        }
      });
      onUpdate(map);
    },
    (error) => onError(error),
  );
};

export const renameCategory = async (oldSlug: string, newNameOrSlug: string) => {
  const newSlug = normalizeCategorySlug(newNameOrSlug) || "uncategorized";
  const categoriesRef = collection(db, "productCategories");
  const oldCatRef = doc(db, "productCategories", oldSlug);
  const newCatRef = doc(db, "productCategories", newSlug);

  // create or update new category doc with display name
  await setDoc(newCatRef, {
    name: newNameOrSlug,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  if (oldSlug === newSlug) {
    // only update display name
    return;
  }

  // Move all products from oldSlug to newSlug using batched writes
  const productsRef = collection(db, "products");
  const q = query(productsRef, where("categorySlug", "==", oldSlug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    // remove old category doc if exists
    await deleteDoc(oldCatRef).catch(() => {});
    return;
  }

  const batch = writeBatch(db);
  snapshot.forEach((p) => {
    const pRef = doc(db, "products", p.id);
    batch.update(pRef, { categorySlug: newSlug, updatedAt: serverTimestamp() });
  });

  // delete old category metadata doc
  batch.delete(oldCatRef);

  await batch.commit();
};

export const moveProductsToCategory = async (productIds: string[], targetSlugRaw: string) => {
  const targetSlug = normalizeCategorySlug(targetSlugRaw) || "uncategorized";
  if (!productIds || productIds.length === 0) return;
  const batch = writeBatch(db);
  productIds.forEach((id) => {
    const pRef = doc(db, "products", id);
    batch.update(pRef, { categorySlug: targetSlug, updatedAt: serverTimestamp() });
  });
  await batch.commit();
};

export const deleteCategory = async (slugRaw: string) => {
  const slug = normalizeCategorySlug(slugRaw);
  if (!slug || slug === "uncategorized") {
    throw new Error("Cannot delete the uncategorized category.");
  }

  const productsRef = collection(db, "products");
  const q = query(productsRef, where("categorySlug", "==", slug));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);

  // Move all products in this category to uncategorized
  snapshot.forEach((p) => {
    const pRef = doc(db, "products", p.id);
    batch.update(pRef, { categorySlug: "uncategorized", updatedAt: serverTimestamp() });
  });

  // Delete the category metadata document
  const catRef = doc(db, "productCategories", slug);
  batch.delete(catRef);

  await batch.commit();
};
