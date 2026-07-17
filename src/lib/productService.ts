import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp, writeBatch, query, where, getDoc, onSnapshot as onSnap, type DocumentData } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { normalizeCategorySlug, ProductVariant, ColorVariant, resolveProductImageUrl } from "./productCatalog";

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

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const normalizeColorVariants = (value: unknown): ColorVariant[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      color: typeof v.color === "string" ? v.color.trim() : "",
      image: resolveProductImageUrl(typeof v.image === "string" ? v.image : ""),
    }))
    .filter((v) => v.color && v.image);
};

// Keeps videoLinks/videoTitles index-aligned while dropping empty links
const normalizeVideoPairs = (linksValue: unknown, titlesValue: unknown): { videoLinks: string[]; videoTitles: string[] } => {
  const links = Array.isArray(linksValue) ? linksValue : [];
  const titles = Array.isArray(titlesValue) ? titlesValue : [];
  const pairs = links
    .map((link, i) => ({
      link: typeof link === "string" ? link.trim() : "",
      title: typeof titles[i] === "string" ? (titles[i] as string).trim() : "",
    }))
    .filter((p) => p.link !== "");
  return { videoLinks: pairs.map((p) => p.link), videoTitles: pairs.map((p) => p.title) };
};

const mapToDbProduct = (id: string, value: Record<string, unknown>): DbProduct => {
  const categorySlug = normalizeCategorySlug(typeof value.categorySlug === "string" ? value.categorySlug : "") || "uncategorized";
  const image = resolveProductImageUrl(typeof value.image === "string" ? value.image : "");

  const formatPrice = (v: unknown): string => {
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number" && Number.isFinite(v)) return `₹${v}`;
    return "";
  };

  const images = Array.isArray(value.images)
    ? value.images
        .filter((img): img is string => typeof img === "string")
        .map((img) => resolveProductImageUrl(img))
        .filter(Boolean)
    : [];

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
    images: images.length > 0 ? images : undefined,
    emoji: typeof value.emoji === "string" && value.emoji.trim() ? value.emoji : undefined,
    popular: Boolean(value.popular),
    disabled: Boolean(value.disabled),
    features: normalizeFeatures(value.features),
    tags: normalizeTags(value.tags),
    colorVariants: (() => {
      const cv = normalizeColorVariants(value.colorVariants);
      return cv.length > 0 ? cv : undefined;
    })(),
    ...normalizeVideoPairs(value.videoLinks, value.videoTitles),
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
  const q = query(collection(db, "products"));
  const querySnapshot = await getDocs(q);
  const products: DbProduct[] = [];
  querySnapshot.forEach((doc) => {
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
    disabled: Boolean(product.disabled),
    features: normalizeFeatures(product.features),
    updatedAt: serverTimestamp(),
    ...(normalizedImage ? { image: normalizedImage } : {}),
    ...(normalizedEmoji ? { emoji: normalizedEmoji } : {}),
    ...(typeof product.originalPrice === "string" && product.originalPrice.trim()
      ? { originalPrice: product.originalPrice.trim() }
      : {}),
    ...(Array.isArray(product.images) && product.images.length > 0
      ? { images: product.images.map((img) => resolveProductImageUrl(img)).filter(Boolean) }
      : { images: [] }),
    ...(Array.isArray(product.tags) && product.tags.length > 0
      ? { tags: normalizeTags(product.tags) }
      : {}),
    ...(Array.isArray(product.colorVariants) && product.colorVariants.length > 0
      ? {
          colorVariants: product.colorVariants
            .filter((v) => v.color?.trim() && v.image?.trim())
            .map((v) => ({ color: v.color.trim(), image: resolveProductImageUrl(v.image) })),
        }
      : { colorVariants: [] }),
    ...normalizeVideoPairs(product.videoLinks, product.videoTitles),
    ...(product.createdAt ? { createdAt: product.createdAt } : {}),
  };

  const productRef = doc(db, "products", product.id);
  await setDoc(productRef, cleanedProduct, { merge: true });
};

export const deleteProductDoc = async (id: string) => {
  await deleteDoc(doc(db, "products", id));
};

export const toggleProductDisabled = async (id: string, disabled: boolean) => {
  const productRef = doc(db, "products", id);
  await setDoc(productRef, { disabled }, { merge: true });
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

export interface ProductReview {
  id: string;
  productId: string;
  categorySlug: string;
  authorName: string;
  title: string;
  comment: string;
  rating: number;
  images?: string[];
  createdAt?: unknown;
}

export const saveProductReview = async (review: Omit<ProductReview, "id" | "createdAt">) => {
  const reviewCollection = collection(db, "reviews");
  const reviewRef = doc(reviewCollection);
  const data: Record<string, unknown> = {
    id: reviewRef.id,
    ...review,
    createdAt: serverTimestamp(),
  };
  await setDoc(reviewRef, data);
};

export const subscribeToReviews = (
  productId: string,
  onUpdate: (reviews: ProductReview[]) => void,
  onError: (error: Error) => void
) => {
  const reviewsRef = collection(db, "reviews");
  const q = query(reviewsRef, where("productId", "==", productId));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const reviews: ProductReview[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          productId: data.productId || "",
          categorySlug: data.categorySlug || "",
          authorName: data.authorName || "",
          title: data.title || "",
          comment: data.comment || "",
          rating: Number(data.rating) || 5,
          images: Array.isArray(data.images) ? data.images.map(String) : [],
          createdAt: data.createdAt,
        });
      });
      // Sort reviews by createdAt descending
      reviews.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt as any).seconds || 0 : 0;
        const timeB = b.createdAt ? (b.createdAt as any).seconds || 0 : 0;
        return timeB - timeA;
      });
      onUpdate(reviews);
    },
    (error) => {
      console.error("Error subscribing to reviews:", error);
      onError(error);
    }
  );
};
