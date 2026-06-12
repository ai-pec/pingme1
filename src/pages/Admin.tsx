import { useEffect, useMemo, useState, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, Eye, Loader2, MessageSquare, Save, Search, Shield, SlidersHorizontal, XCircle, Plus, Edit, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/layouts/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToOrders, updateOrderStatus, subscribeToContactMessages, deleteContactMessage, markContactMessageRead, type ContactMessage } from "@/lib/adminService";
import { downloadReceipt } from "@/lib/invoiceUtils";
import { categoryDescriptionFromName, categoryNameFromSlug, normalizeCategorySlug } from "@/lib/productCatalog";
import { subscribeToProducts, saveProduct, deleteProductDoc, uploadProductImage, DbProduct, renameCategory, moveProductsToCategory, subscribeToProductCategories, saveProductCategory, deleteCategory } from "@/lib/productService";
import type { PrebookingRecord } from "@/lib/prebookService";
import { subscribeToFAQs, saveFAQ, deleteFAQ, initializeDefaultFAQs, type FAQItem } from "@/lib/faqService";

const formatDate = (value: unknown): string => {
  if (!value || typeof value !== "object") return "-";

  const timestampValue = value as {
    toDate?: () => Date;
    seconds?: number;
  };

  if (typeof timestampValue.toDate === "function") return timestampValue.toDate().toLocaleString("en-IN");
  if (typeof timestampValue.seconds === "number") return new Date(timestampValue.seconds * 1000).toLocaleString("en-IN");
  return "-";
};

const normalizePriceInput = (rawValue: string): string | null => {
  const numericValue = Number(rawValue.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return `₹${Number.isInteger(numericValue) ? numericValue.toFixed(0) : numericValue.toFixed(2)}`;
};

const DEFAULT_CATEGORY_SLUG = "uncategorized";

const getCategoryIcon = (products: DbProduct[]): string => {
  const iconSource = products.find((product) => typeof product.emoji === "string" && product.emoji.trim());
  return iconSource?.emoji?.trim() || "📦";
};

const AdminProductMedia = ({ product }: { product: DbProduct }) => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="aspect-[4/3] bg-muted flex items-center justify-center p-2 relative">
      {product.popular && (
        <Badge className="absolute top-2 right-2">Popular</Badge>
      )}
      {product.image && !imageFailed ? (
        <img
          src={product.image}
          alt={product.title}
          className="max-h-full object-contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-4xl">{product.emoji || "📦"}</span>
      )}
    </div>
  );
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PrebookingRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PrebookingRecord | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");
  
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [renameCategoryTarget, setRenameCategoryTarget] = useState<string | null>(null);
  const [renameCategoryName, setRenameCategoryName] = useState<string>("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetProductId, setMoveTargetProductId] = useState<string | null>(null);
  const [moveTargetSlug, setMoveTargetSlug] = useState<string>("");
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyTargetProductId, setCopyTargetProductId] = useState<string | null>(null);
  const [copyTargetSlug, setCopyTargetSlug] = useState<string>("");
  const [categoryMetadata, setCategoryMetadata] = useState<Record<string, { name?: string; description?: string; icon?: string; coverImage?: string; gradient?: string }>>({});
  const [isProductDialogOpn, setIsProductDialogOpn] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryProTip, setNewCategoryProTip] = useState("");
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageSearch, setMessageSearch] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqSearch, setFaqSearch] = useState("");
  const [editingFaq, setEditingFaq] = useState<Omit<FAQItem, "createdAt" | "updatedAt"> | null>(null);
  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false);
  const [savingFaqId, setSavingFaqId] = useState<string | null>(null);
  const [isInitializingFaqs, setIsInitializingFaqs] = useState(false);

  useEffect(() => {
    setLoadingOrders(true);
    const unsubscribe = subscribeToOrders(
      (latest) => {
        setOrders(latest);
        setLoadingOrders(false);
      },
      (error) => {
        console.error("Failed to sync orders", error);
        toast.error("Failed to sync orders from Firebase.");
        setLoadingOrders(false);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (latest) => setDbProducts(latest),
      (error) => {
        console.error("Failed to load products", error);
        toast.error("Failed to load products from Firebase.");
      },
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    setLoadingMessages(true);
    const unsubscribe = subscribeToContactMessages(
      (latest) => {
        setContactMessages(latest);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("Failed to sync contact messages", error);
        toast.error("Failed to load message queries from Firebase.");
        setLoadingMessages(false);
      },
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsub = subscribeToProductCategories(
      (map) => setCategoryMetadata(map),
      (err) => console.error("Failed to load category metadata", err),
    );
    return unsub;
  }, []);

  useEffect(() => {
    setLoadingFaqs(true);
    const unsubscribe = subscribeToFAQs(
      (latest) => {
        setFaqs(latest);
        setLoadingFaqs(false);
      },
      (error) => {
        console.error("Failed to sync FAQs", error);
        toast.error("Failed to load FAQs from Firebase.");
        setLoadingFaqs(false);
      }
    );
    return unsubscribe;
  }, []);

  const categorizedProducts = useMemo(() => {
    const groups = new Map<string, DbProduct[]>();

    dbProducts.forEach((product) => {
      const slug = normalizeCategorySlug(product.categorySlug) || DEFAULT_CATEGORY_SLUG;
      const existing = groups.get(slug) || [];
      existing.push({ ...product, categorySlug: slug });
      groups.set(slug, existing);
    });

    const allSlugs = new Set<string>([...groups.keys(), ...Object.keys(categoryMetadata)]);

    return Array.from(allSlugs)
      .map((slug) => {
        const products = groups.get(slug) || [];
        const meta = categoryMetadata[slug] || {};
        const name = meta.name || categoryNameFromSlug(slug);

        return {
          slug,
          name,
          description: meta.description || categoryDescriptionFromName(slug, name),
          icon: meta.icon?.trim() || getCategoryIcon(products),
          products: products.sort((left, right) => left.title.localeCompare(right.title)),
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [dbProducts, categoryMetadata]);
  

  const categoryOptions = useMemo(() => categorizedProducts.map((category) => category.slug), [categorizedProducts]);

  const faqCategories = useMemo(() => {
    const cats = new Set(faqs.map((f) => f.category).filter(Boolean));
    return Array.from(cats);
  }, [faqs]);

  const defaultCategorySlug = categoryOptions[0] || DEFAULT_CATEGORY_SLUG;

  const handleEditProduct = (product: DbProduct | null, categorySlug?: string) => {
    const resolvedCategorySlug = normalizeCategorySlug(categorySlug || "") || defaultCategorySlug;

    if (product) {
      setEditingProduct({
        ...product,
        categorySlug: normalizeCategorySlug(product.categorySlug) || defaultCategorySlug,
      });
    } else {
      setEditingProduct({
        id: "",
        categorySlug: resolvedCategorySlug,
        title: "",
        price: "",
        originalPrice: "",
        image: "",
        emoji: "",
        features: [""],
        popular: false,
      });
    }
    setIsProductDialogOpn(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    try {
      setIsUploadingImage(true);
      const downloadURL = await uploadProductImage(file, editingProduct.categorySlug);
      setEditingProduct({ ...editingProduct, image: downloadURL });
      toast.success("Image uploaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image. Ensure Storage is enabled in Firebase Console.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    try {
      setSavingProductId(editingProduct.id || "new");
      const normalizedPrice = normalizePriceInput(editingProduct.price) || editingProduct.price;
      const normalizedOrig = editingProduct.originalPrice ? (normalizePriceInput(editingProduct.originalPrice) || editingProduct.originalPrice) : "";
      const normalizedCategorySlug = normalizeCategorySlug(editingProduct.categorySlug) || defaultCategorySlug;
      
      await saveProduct({
        ...editingProduct,
        categorySlug: normalizedCategorySlug,
        price: normalizedPrice,
        originalPrice: normalizedOrig,
        features: editingProduct.features.filter(f => f.trim() !== ""),
      });
      toast.success("Product saved successfully.");
      setIsProductDialogOpn(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save product.");
    } finally {
      setSavingProductId(null);
    }
  };

  const handleCopyProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyTargetProductId || !copyTargetSlug) return;

    const sourceProduct = dbProducts.find((product) => product.id === copyTargetProductId);
    if (!sourceProduct) {
      toast.error("Could not find the product to copy.");
      return;
    }

    try {
      setSavingProductId(copyTargetProductId);
      await saveProduct({
        ...sourceProduct,
        id: "",
        categorySlug: normalizeCategorySlug(copyTargetSlug) || defaultCategorySlug,
        title: sourceProduct.title,
        features: [...sourceProduct.features],
      });
      toast.success("Product copied successfully.");
      setIsCopyDialogOpen(false);
      setCopyTargetProductId(null);
      setCopyTargetSlug("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy product.");
    } finally {
      setSavingProductId(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProductDoc(id);
      toast.success("Product deleted.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product.");
    }
  };

  const handleDeleteCategory = async (slug: string) => {
    if (!window.confirm("Are you sure you want to delete this category? All products in this category will be moved to 'Uncategorized'.")) return;
    try {
      await deleteCategory(slug);
      toast.success("Category deleted and products moved to Uncategorized.");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Failed to delete category.";
      toast.error(message);
    }
  };

  const filteredOrders = useMemo(() => {
    const searchTerm = orderSearch.trim().toLowerCase();

    const filtered = orders.filter((order) => {
      const haystack = [
        order.id,
        order.fullName,
        order.email,
        order.phone,
        order.address,
        order.city,
        order.state,
        order.pincode,
        ...(order.items || []).map((item) => item.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (!searchTerm || haystack.includes(searchTerm)) && (orderStatusFilter === "all" || order.status === orderStatusFilter);
    });

    return filtered.sort((left, right) => {
      const leftTs = left.createdAt as { seconds?: number } | undefined;
      const rightTs = right.createdAt as { seconds?: number } | undefined;
      const leftCreated = (leftTs?.seconds ?? 0) * 1000;
      const rightCreated = (rightTs?.seconds ?? 0) * 1000;

      switch (orderSort) {
        case "oldest":
          return leftCreated - rightCreated;
        case "amount-high":
          return Number(right.totalAmount || 0) - Number(left.totalAmount || 0);
        case "amount-low":
          return Number(left.totalAmount || 0) - Number(right.totalAmount || 0);
        case "name-az":
          return (left.fullName || "").localeCompare(right.fullName || "");
        case "name-za":
          return (right.fullName || "").localeCompare(left.fullName || "");
        case "newest":
        default:
          return rightCreated - leftCreated;
      }
    });
  }, [orderSearch, orderSort, orderStatusFilter, orders]);

  const handleStatusUpdate = async (orderId: string, status: PrebookingRecord["status"]) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, status);
      setOrders((previousOrders) => previousOrders.map((order) => (order.id === orderId ? { ...order, status } : order)));
      setSelectedOrder((previousOrder) => (previousOrder && previousOrder.id === orderId ? { ...previousOrder, status } : previousOrder));
      toast.success(`Order marked as ${status}.`);
    } catch (error) {
      console.error("Failed to update order status", error);
      toast.error("Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleViewOrder = (order: PrebookingRecord) => {
    startTransition(() => {
      setSelectedOrder(order);
    });
  };

  const handleOpenMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    // Mark as read silently — real-time listener will update the count automatically
    if (msg.status === "new") {
      markContactMessageRead(msg.id).catch((err) =>
        console.error("Failed to mark message as read", err),
      );
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Delete this message query? This cannot be undone.")) return;
    try {
      // Close dialog if the deleted message is currently open
      setSelectedMessage((prev) => (prev?.id === msgId ? null : prev));
      await deleteContactMessage(msgId);
      toast.success("Message deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete message.");
    }
  };

  const handleEditFaq = (faq: FAQItem | null) => {
    if (faq) {
      setEditingFaq({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: faq.sortOrder,
      });
    } else {
      setEditingFaq({
        id: "",
        question: "",
        answer: "",
        category: "General Questions",
        sortOrder: faqs.length + 1,
      });
    }
    setIsFaqDialogOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;

    try {
      setSavingFaqId(editingFaq.id || "new");
      await saveFAQ(editingFaq);
      toast.success("FAQ saved successfully.");
      setIsFaqDialogOpen(false);
      setEditingFaq(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save FAQ.");
    } finally {
      setSavingFaqId(null);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this FAQ item?")) return;
    try {
      await deleteFAQ(id);
      toast.success("FAQ deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete FAQ.");
    }
  };

  const handleInitializeDefaultFaqs = async () => {
    if (!window.confirm("This will load the default FAQ questions into your database. Continue?")) return;
    try {
      setIsInitializingFaqs(true);
      await initializeDefaultFAQs();
      toast.success("Default FAQs loaded.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load default FAQs.");
    } finally {
      setIsInitializingFaqs(false);
    }
  };

  return (
    <MainLayout>
      <style>{`
        .admin-scroll-form {
          max-height: 70vh;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          touch-action: pan-y;
        }
        .admin-scroll-form::-webkit-scrollbar {
          width: 8px;
        }
        .admin-scroll-form::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-scroll-form::-webkit-scrollbar-thumb {
          background: hsl(var(--primary));
          border-radius: 4px;
        }
        .admin-scroll-form::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.8);
        }
      `}</style>
      <div className="container py-4 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage orders, products, messages and FAQs.</p>
          </div>
          <Badge className="px-3 py-1 text-xs sm:text-sm" variant="secondary">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            <span className="max-w-[160px] truncate">{user?.email}</span>
          </Badge>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders" className="text-xs sm:text-sm px-1 sm:px-3">
              <span className="hidden sm:inline">Order History</span>
              <span className="sm:hidden">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm px-1 sm:px-3">Products</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm px-1 sm:px-3 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 flex-shrink-0" />
              <span className="hidden sm:inline">Message Queries</span>
              <span className="sm:hidden">Msgs</span>
              {contactMessages.length > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex-shrink-0">
                  {contactMessages.length > 99 ? "99+" : contactMessages.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="faqs" className="text-xs sm:text-sm px-1 sm:px-3 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 flex-shrink-0" />
              <span className="hidden sm:inline">FAQ Manager</span>
              <span className="sm:hidden">FAQs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Orders</CardDescription>
                  <CardTitle className="text-3xl">{orders.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Pending Orders</CardDescription>
                  <CardTitle className="text-3xl">{orders.filter((order) => order.status === "pending").length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Confirmed Orders</CardDescription>
                  <CardTitle className="text-3xl">{orders.filter((order) => order.status === "confirmed").length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>Search, sort, filter, confirm, or cancel orders from this panel only.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3 mb-6">
                  <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search by order no, name, phone, email..."
                      className="pl-9"
                    />
                  </div>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={orderSort} onValueChange={setOrderSort}>
                    <SelectTrigger>
                      <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Sort orders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="amount-high">Amount high to low</SelectItem>
                      <SelectItem value="amount-low">Amount low to high</SelectItem>
                      <SelectItem value="name-az">Name A to Z</SelectItem>
                      <SelectItem value="name-za">Name Z to A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loadingOrders ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders found.</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Order ID</TableHead>
                        <TableHead className="whitespace-nowrap">Customer</TableHead>
                        <TableHead className="hidden sm:table-cell whitespace-nowrap">Phone</TableHead>
                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="hidden md:table-cell whitespace-nowrap">Created</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs max-w-[100px] truncate">{order.id}</TableCell>
                          <TableCell className="max-w-[120px] truncate">
                            {order.userId ? (
                              <button
                                onClick={() => navigate(`/profile/${order.userId}`)}
                                className="text-primary hover:underline cursor-pointer text-left"
                                title="View customer profile"
                              >
                                {order.fullName || "-"}
                              </button>
                            ) : (
                              order.fullName || "-"
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell whitespace-nowrap">{order.phone || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">₹{Number(order.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "confirmed" ? "default" : order.status === "cancelled" ? "destructive" : "outline"} className="whitespace-nowrap text-xs">
                              {order.status || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell whitespace-nowrap text-sm">{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)} className="h-8 w-8 p-0 sm:w-auto sm:px-3">
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline ml-1">View</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingOrderId === order.id || order.status === "confirmed"}
                                onClick={() => handleStatusUpdate(order.id, "confirmed")}
                                className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                              >
                                {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span className="hidden sm:inline ml-1">Confirm</span></>}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={updatingOrderId === order.id || order.status === "cancelled"}
                                onClick={() => handleStatusUpdate(order.id, "cancelled")}
                                className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                              >
                                {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /><span className="hidden sm:inline ml-1">Cancel</span></>}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <CardTitle>Manage Products</CardTitle>
                  <CardDescription>View, Add, Edit, and Delete products.</CardDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Add Product Category</span>
                    <span className="sm:hidden">Add Category</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {categorizedProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No products found. Use Add Product to create your first item.
                    </p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full space-y-4">
                      {categorizedProducts.map((category) => (
                        <AccordionItem key={category.slug} value={category.slug} className="rounded-xl border px-4">
                          <div className="flex items-center gap-2">
                            <AccordionTrigger className="flex-1 py-4 hover:no-underline">
                              <div className="flex items-center gap-3 text-left">
                                <span className="text-xl">{category.icon}</span>
                                <div>
                                  <h3 className="font-semibold text-lg leading-tight">{category.name}</h3>
                                  <p className="text-xs text-muted-foreground">/{category.slug} • {category.products.length} product{category.products.length === 1 ? "" : "s"}</p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                setRenameCategoryTarget(category.slug);
                                setRenameCategoryName(category.name);
                                setIsRenameDialogOpen(true);
                              }}
                              aria-label={`Rename ${category.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={category.slug === "uncategorized"}
                              className="text-destructive hover:bg-destructive/10 disabled:text-muted-foreground disabled:hover:bg-transparent"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteCategory(category.slug);
                              }}
                              aria-label={`Delete ${category.name}`}
                              title={category.slug === "uncategorized" ? "Cannot delete the Uncategorized category" : `Delete ${category.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <AccordionContent className="pb-4">
                            <div className="mb-4 flex justify-end">
                              <Button variant="ghost" size="sm" onClick={() => handleEditProduct(null, category.slug)}>
                                <Plus className="w-3 h-3 mr-1" /> Add to {category.name}
                              </Button>
                            </div>

                            {category.products.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">No products in this category.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {category.products.map((product) => (
                                  <Card key={product.id} className="overflow-hidden flex flex-col">
                                    <AdminProductMedia product={product} />
                                    <CardContent className="p-4 flex-1 flex flex-col">
                                      <h4 className="font-bold truncate mb-1" title={product.title}>{product.title}</h4>
                                      <div className="flex items-center justify-between mt-auto pt-4">
                                        <div>
                                          <span className="font-bold text-primary">{product.price}</span>
                                          {product.originalPrice && (
                                            <span className="text-xs text-muted-foreground line-through ml-2">{product.originalPrice}</span>
                                          )}
                                        </div>
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => { setCopyTargetProductId(product.id); setCopyTargetSlug(normalizeCategorySlug(product.categorySlug) || defaultCategorySlug); setIsCopyDialogOpen(true); }}>
                                            <Copy className="w-4 h-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => { setMoveTargetProductId(product.id); setIsMoveDialogOpen(true); }}>
                                            <SlidersHorizontal className="w-4 h-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(product.id)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Messages</CardDescription>
                  <CardTitle className="text-3xl">{contactMessages.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>New / Unread</CardDescription>
                  <CardTitle className="text-3xl">
                    {contactMessages.filter((m) => m.status === "new").length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>With Phone</CardDescription>
                  <CardTitle className="text-3xl">
                    {contactMessages.filter((m) => m.phone && m.phone.trim()).length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Message Queries
                </CardTitle>
                <CardDescription>
                  Real-time contact form submissions from the website. New entries appear instantly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="relative mb-4 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    placeholder="Search by name, email or message..."
                    className="pl-9"
                  />
                </div>

                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading messages…</span>
                  </div>
                ) : contactMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No messages yet. They'll appear here as soon as someone fills in the contact form.</p>
                  </div>
                ) : (() => {
                  const filtered = contactMessages.filter((m) => {
                    const q = messageSearch.toLowerCase();
                    return (
                      !q ||
                      m.name.toLowerCase().includes(q) ||
                      m.email.toLowerCase().includes(q) ||
                      m.message.toLowerCase().includes(q)
                    );
                  });

                  return filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No messages match your search.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px] whitespace-nowrap">Name</TableHead>
                            <TableHead className="w-[80px] whitespace-nowrap">Status</TableHead>
                            <TableHead className="w-[200px] whitespace-nowrap">Email</TableHead>
                            <TableHead className="hidden sm:table-cell w-[130px] whitespace-nowrap">Phone</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="hidden md:table-cell w-[160px] whitespace-nowrap">Received At</TableHead>
                            <TableHead className="w-[60px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((msg) => (
                            <TableRow
                              key={msg.id}
                              className="cursor-pointer hover:bg-muted/60 transition-colors"
                              onClick={() => handleOpenMessage(msg)}
                            >
                              <TableCell className="font-medium whitespace-nowrap">
                                <button
                                  className="text-primary hover:underline text-left font-medium"
                                  onClick={(e) => { e.stopPropagation(); handleOpenMessage(msg); }}
                                >
                                  {msg.name}
                                </button>
                              </TableCell>
                              <TableCell>
                                <Badge variant={msg.status === "new" ? "default" : "outline"} className="whitespace-nowrap text-xs">
                                  {msg.status === "new" ? "New" : "Read"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <a
                                  href={`mailto:${msg.email}`}
                                  className="text-primary hover:underline break-all text-xs sm:text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {msg.email}
                                </a>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell whitespace-nowrap text-muted-foreground">
                                {msg.phone && msg.phone.trim() ? (
                                  <a
                                    href={`tel:${msg.phone}`}
                                    className="hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {msg.phone}
                                  </a>
                                ) : (
                                  <span className="italic opacity-50">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <p className="max-w-[180px] text-sm text-muted-foreground truncate">
                                  {msg.message}
                                </p>
                              </TableCell>
                              <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-muted-foreground">
                                {formatDate(msg.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10 h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                                  title="Delete message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faqs" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total FAQs</CardDescription>
                  <CardTitle className="text-3xl">{faqs.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Categories</CardDescription>
                  <CardTitle className="text-3xl">{faqCategories.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Status</CardDescription>
                  <CardTitle className="text-xl">
                    {faqs.length > 0 ? (
                      <span className="text-green-600 flex items-center gap-1.5 font-semibold text-lg">
                        <CheckCircle2 className="w-5 h-5" /> Active
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1.5 font-semibold text-lg">
                        <XCircle className="w-5 h-5" /> Not Initialized
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                <div>
                  <CardTitle>FAQ Manager</CardTitle>
                  <CardDescription>Manage and update FAQ entries shown on the website.</CardDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  {faqs.length === 0 && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleInitializeDefaultFaqs} 
                      disabled={isInitializingFaqs}
                    >
                      {isInitializingFaqs ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      <span className="hidden sm:inline">Load Default FAQs</span>
                      <span className="sm:hidden">Load Defaults</span>
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleEditFaq(null)}>
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Add FAQ Item</span>
                    <span className="sm:hidden">Add FAQ</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search FAQs by question or category..."
                    className="pl-9"
                  />
                </div>

                {loadingFaqs ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading FAQs...</span>
                  </div>
                ) : faqs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <HelpCircle className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No FAQs found in Firestore.</p>
                    <Button onClick={handleInitializeDefaultFaqs} disabled={isInitializingFaqs}>
                      {isInitializingFaqs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Load Default FAQs
                    </Button>
                  </div>
                ) : (() => {
                  const filtered = faqs.filter((faq) => {
                    const q = faqSearch.toLowerCase();
                    return (
                      !q ||
                      faq.question.toLowerCase().includes(q) ||
                      faq.answer.toLowerCase().includes(q) ||
                      faq.category.toLowerCase().includes(q)
                    );
                  });

                  return filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No FAQs match your search.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Order</TableHead>
                            <TableHead className="w-[180px]">Category</TableHead>
                            <TableHead>Question / Answer</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((faq) => (
                            <TableRow key={faq.id}>
                              <TableCell className="font-mono text-xs">{faq.sortOrder}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{faq.category}</Badge>
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="font-semibold text-sm mb-1">{faq.question}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditFaq(faq)}
                                    title="Edit FAQ"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteFaq(faq.id)}
                                    title="Delete FAQ"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Message Detail Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Message from {selectedMessage?.name}
              </DialogTitle>
              <DialogDescription>Full message details from the contact form</DialogDescription>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                  <span className="font-semibold text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedMessage.name}</span>

                  <span className="font-semibold text-muted-foreground">Email</span>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="text-primary hover:underline break-all"
                  >
                    {selectedMessage.email}
                  </a>

                  <span className="font-semibold text-muted-foreground">Phone</span>
                  {selectedMessage.phone && selectedMessage.phone.trim() ? (
                    <a href={`tel:${selectedMessage.phone}`} className="hover:underline">
                      {selectedMessage.phone}
                    </a>
                  ) : (
                    <span className="italic text-muted-foreground opacity-60">Not provided</span>
                  )}

                  <span className="font-semibold text-muted-foreground">Received</span>
                  <span>{formatDate(selectedMessage.createdAt)}</span>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Message</p>
                  <div className="rounded-lg bg-muted/50 border p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.message}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete Query
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`mailto:${selectedMessage.email}`}>
                        Reply via Email
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedMessage(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>Full order data from Firestore</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p><span className="font-medium">Order ID:</span> {selectedOrder.id}</p>
                  <p><span className="font-medium">Status:</span> {selectedOrder.status || "pending"}</p>
                  <p><span className="font-medium">Name:</span> {selectedOrder.fullName || "-"}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.email || "-"}</p>
                  <p><span className="font-medium">Invoice Email:</span> {selectedOrder.email || "-"}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrder.phone || "-"}</p>
                  <p><span className="font-medium">Amount:</span> ₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                  <p><span className="font-medium">Address:</span> {selectedOrder.address || "-"}</p>
                  <p><span className="font-medium">City/State:</span> {selectedOrder.city || "-"}, {selectedOrder.state || "-"}</p>
                  <p><span className="font-medium">Pincode:</span> {selectedOrder.pincode || "-"}</p>
                  <p><span className="font-medium">Created:</span> {formatDate(selectedOrder.createdAt)}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  <div className="space-y-2">
                    {(selectedOrder.items || []).map((item) => (
                      <div key={item.id} className="rounded-md border p-3 text-sm flex items-center justify-between">
                        <span>{item.title}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.payment && (
                  <div>
                    <h3 className="font-semibold mb-2">Payment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <p><span className="font-medium">Gateway:</span> {selectedOrder.payment.gateway}</p>
                      <p><span className="font-medium">Order ID:</span> {selectedOrder.payment.orderId}</p>
                      <p><span className="font-medium">Payment ID:</span> {selectedOrder.payment.paymentId}</p>
                      <p><span className="font-medium">Currency:</span> {selectedOrder.payment.currency}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => selectedOrder && handleStatusUpdate(selectedOrder.id, "confirmed")}
                    disabled={!selectedOrder || updatingOrderId === selectedOrder.id || selectedOrder.status === "confirmed"}
                  >
                    Confirm Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => selectedOrder && handleStatusUpdate(selectedOrder.id, "cancelled")}
                    disabled={!selectedOrder || updatingOrderId === selectedOrder.id || selectedOrder.status === "cancelled"}
                  >
                    Cancel Order
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectedOrder && downloadReceipt(selectedOrder, selectedOrder.email || "")}
                    disabled={!selectedOrder?.payment}
                  >
                    Download Invoice
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

          {/* Rename Category Dialog */}
          <Dialog open={isRenameDialogOpen} onOpenChange={(open) => { if (!open) { setIsRenameDialogOpen(false); setRenameCategoryTarget(null); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Rename Section</DialogTitle>
                <DialogDescription>Provide a new display name or slug for this section. Slug will be generated automatically.</DialogDescription>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!renameCategoryTarget) return;
                try {
                  await renameCategory(renameCategoryTarget, renameCategoryName || "");
                  toast.success("Section renamed successfully.");
                  setIsRenameDialogOpen(false);
                  setRenameCategoryTarget(null);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to rename section.");
                }
              }} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="newName">New Name</Label>
                  <Input id="newName" value={renameCategoryName} onChange={(e) => setRenameCategoryName(e.target.value)} placeholder="e.g. Pet Tags" required />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => { setIsRenameDialogOpen(false); setRenameCategoryTarget(null); }}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Move Product Dialog */}
          <Dialog open={isMoveDialogOpen} onOpenChange={(open) => { if (!open) { setIsMoveDialogOpen(false); setMoveTargetProductId(null); setMoveTargetSlug(""); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Move Tag to Section</DialogTitle>
                <DialogDescription>Select the target section to move this product to.</DialogDescription>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!moveTargetProductId || !moveTargetSlug) return;
                try {
                  await moveProductsToCategory([moveTargetProductId], moveTargetSlug);
                  toast.success("Product moved successfully.");
                  setIsMoveDialogOpen(false);
                  setMoveTargetProductId(null);
                  setMoveTargetSlug("");
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to move product.");
                }
              }} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="target">Target Section</Label>
                  <Select value={moveTargetSlug} onValueChange={(v) => setMoveTargetSlug(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose section" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((slug) => (
                        <SelectItem key={slug} value={slug}>{(categoryMetadata[slug] && categoryMetadata[slug].name) ? categoryMetadata[slug].name : categoryNameFromSlug(slug)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => { setIsMoveDialogOpen(false); setMoveTargetProductId(null); setMoveTargetSlug(""); }}>Cancel</Button>
                  <Button type="submit">Move</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Copy Product Dialog */}
          <Dialog open={isCopyDialogOpen} onOpenChange={(open) => { if (!open) { setIsCopyDialogOpen(false); setCopyTargetProductId(null); setCopyTargetSlug(""); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Copy Product to Another Section</DialogTitle>
                <DialogDescription>Create a duplicate of this product in a selected category.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCopyProduct} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="copyTarget">Target Section</Label>
                  <Select value={copyTargetSlug} onValueChange={(value) => setCopyTargetSlug(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose section" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((slug) => (
                        <SelectItem key={slug} value={slug}>
                          {(categoryMetadata[slug] && categoryMetadata[slug].name) ? categoryMetadata[slug].name : categoryNameFromSlug(slug)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => { setIsCopyDialogOpen(false); setCopyTargetProductId(null); setCopyTargetSlug(""); }}>Cancel</Button>
                  <Button type="submit" disabled={savingProductId === copyTargetProductId}>Copy</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

        {/* Product Dialog */}
        <Dialog open={isProductDialogOpn} onOpenChange={setIsProductDialogOpn}>
          <DialogContent className="max-w-2xl flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>{editingProduct?.id ? "Edit Product" : "Add Product"}</DialogTitle>
              <DialogDescription>Modify product details here. Changes sync to Firestore instantly.</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <form
                onSubmit={handleSaveProduct}
                className="admin-scroll-form grid gap-4 py-4 overflow-y-auto px-1"
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category Slug</Label>
                    <Input
                      id="category"
                      value={editingProduct.categorySlug}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categorySlug: normalizeCategorySlug(e.target.value) })}
                      placeholder="e.g. car-tags"
                      list="category-slug-options"
                      required
                    />
                    <datalist id="category-slug-options">
                      {categoryOptions.map((slug) => (
                        <option key={slug} value={slug} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">Use lowercase words with hyphens (for example: car-tags).</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={editingProduct.title} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })} 
                      placeholder="Product title" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input 
                      id="price" 
                      value={editingProduct.price} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })} 
                      placeholder="e.g. 499 or ₹499" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">Original Price (₹) [Optional]</Label>
                    <Input 
                      id="originalPrice" 
                      value={editingProduct.originalPrice} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value })} 
                      placeholder="e.g. 599" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image">Product Image</Label>
                    <div className="flex gap-2">
                      <Input
                        id="imageFile"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                        className="flex-1"
                      />
                      <Input
                        id="image"
                        value={editingProduct.image}
                        onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                        placeholder="Or paste URL"
                        className="flex-1"
                      />
                    </div>
                    {isUploadingImage && <p className="text-xs text-muted-foreground flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</p>}
                    {editingProduct.image && (
                      <div className="mt-2 w-full max-w-[200px] border rounded overflow-hidden">
                        <img src={editingProduct.image} alt="Preview" className="w-full h-auto" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emoji">Emoji (fallback if no image)</Label>
                    <Input 
                      id="emoji" 
                      value={editingProduct.emoji || ""} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, emoji: e.target.value })} 
                      placeholder="🚗" 
                      maxLength={5}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Key Features (One per line)</Label>
                  <Textarea 
                    id="features" 
                    rows={4}
                    value={editingProduct.features.join("\n")} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, features: e.target.value.split("\n") })} 
                    placeholder="Premium quality card with QR code&#10;Fits perfectly on car's front mirror..." 
                    required 
                  />
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox 
                    id="popular" 
                    checked={editingProduct.popular} 
                    onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, popular: !!checked })} 
                  />
                  <Label htmlFor="popular" className="font-medium cursor-pointer">
                    Mark as Popular (Best Seller)
                  </Label>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsProductDialogOpn(false)}>Cancel</Button>
                  <Button type="submit" disabled={savingProductId !== null}>
                    {savingProductId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Product
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Category Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { if (!open) { setIsCategoryDialogOpen(false); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Product Category</DialogTitle>
              <DialogDescription>Provide metadata for the new category. This appears on the storefront.</DialogDescription>
            </DialogHeader>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveProductCategory(newCategoryName || newCategoryIcon || Date.now().toString(), {
                  name: newCategoryName,
                  icon: newCategoryIcon,
                  description: newCategoryDescription,
                  proTip: newCategoryProTip,
                });
                toast.success("Category created.");
                setIsCategoryDialogOpen(false);
                setNewCategoryName("");
                setNewCategoryIcon("");
                setNewCategoryDescription("");
                setNewCategoryProTip("");
              } catch (err) {
                console.error(err);
                toast.error("Failed to create category.");
              }
            }} className="space-y-4 py-4">
              <div>
                <Label htmlFor="catName">Category Name</Label>
                <Input id="catName" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Pet Tags" required />
              </div>
              <div>
                <Label htmlFor="catIcon">Category Icon (emoji)</Label>
                <Input id="catIcon" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} placeholder="e.g. 🐾" />
              </div>
              <div>
                <Label htmlFor="catDescription">Short Description</Label>
                <Textarea id="catDescription" value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} placeholder="Short description shown on products page" />
              </div>
              <div>
                <Label htmlFor="proTip">Pro Tip</Label>
                <Input id="proTip" value={newCategoryProTip} onChange={(e) => setNewCategoryProTip(e.target.value)} placeholder="Short pro tip shown below points" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Category</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* FAQ Dialog */}
        <Dialog open={isFaqDialogOpen} onOpenChange={setIsFaqDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFaq?.id ? "Edit FAQ Item" : "Add FAQ Item"}</DialogTitle>
              <DialogDescription>Create or update FAQ questions and answers. Changes update the public FAQ page.</DialogDescription>
            </DialogHeader>
            {editingFaq && (
              <form onSubmit={handleSaveFaq} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="faqQuestion">Question</Label>
                  <Input 
                    id="faqQuestion" 
                    value={editingFaq.question} 
                    onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })} 
                    placeholder="Enter the question" 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="faqAnswer">Answer</Label>
                  <Textarea 
                    id="faqAnswer" 
                    rows={5}
                    value={editingFaq.answer} 
                    onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })} 
                    placeholder="Enter the answer" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="faqCategory">Category</Label>
                    <Input 
                      id="faqCategory" 
                      value={editingFaq.category} 
                      onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })} 
                      placeholder="e.g. General Questions" 
                      list="faq-category-options"
                      required 
                    />
                    <datalist id="faq-category-options">
                      {faqCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="faqSortOrder">Sort Order</Label>
                    <Input 
                      id="faqSortOrder" 
                      type="number"
                      value={editingFaq.sortOrder} 
                      onChange={(e) => setEditingFaq({ ...editingFaq, sortOrder: parseInt(e.target.value, 10) || 0 })} 
                      placeholder="e.g. 1" 
                      required 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsFaqDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={savingFaqId !== null}>
                    {savingFaqId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save FAQ
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}