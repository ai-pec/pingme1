import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { ProductVariant } from "./productCatalog";

export interface DbProduct extends ProductVariant {
  categorySlug: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

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
        products.push({ id: doc.id, ...doc.data() } as DbProduct);
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
    products.push({ id: doc.id, ...doc.data() } as DbProduct);
  });
  return products;
};

export const saveProduct = async (product: Omit<DbProduct, "createdAt" | "updatedAt">) => {
  if (!product.id) {
    product.id = doc(collection(db, "products")).id;
  }
  const productRef = doc(db, "products", product.id);
  await setDoc(productRef, {
    ...product,
    updatedAt: serverTimestamp(),
    createdAt: product.createdAt || serverTimestamp(),
  }, { merge: true });
};

export const deleteProductDoc = async (id: string) => {
  await deleteDoc(doc(db, "products", id));
};

export const uploadProductImage = async (file: File): Promise<string> => {
  if (!file) throw new Error("No file provided");
  const fileName = `products/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, fileName);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};
