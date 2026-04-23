import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, Save, Search, Shield, SlidersHorizontal, XCircle, Plus, Edit, Trash2 } from "lucide-react";
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
import { subscribeToOrders, updateOrderStatus } from "@/lib/adminService";
import { categoryNameFromSlug, normalizeCategorySlug } from "@/lib/productCatalog";
import { subscribeToProducts, saveProduct, deleteProductDoc, uploadProductImage, DbProduct } from "@/lib/productService";
import type { PrebookingRecord } from "@/lib/prebookService";

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
  const [orders, setOrders] = useState<PrebookingRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PrebookingRecord | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");
  
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [isProductDialogOpn, setIsProductDialogOpn] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  const categorizedProducts = useMemo(() => {
    const groups = new Map<string, DbProduct[]>();

    dbProducts.forEach((product) => {
      const slug = normalizeCategorySlug(product.categorySlug) || DEFAULT_CATEGORY_SLUG;
      const existing = groups.get(slug) || [];
      existing.push({ ...product, categorySlug: slug });
      groups.set(slug, existing);
    });

    return Array.from(groups.entries())
      .map(([slug, products]) => ({
        slug,
        name: categoryNameFromSlug(slug),
        icon: getCategoryIcon(products),
        products: products.sort((left, right) => left.title.localeCompare(right.title)),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [dbProducts]);

  const categoryOptions = useMemo(() => categorizedProducts.map((category) => category.slug), [categorizedProducts]);

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
      const leftCreated = left.createdAt?.seconds ? left.createdAt.seconds * 1000 : 0;
      const rightCreated = right.createdAt?.seconds ? right.createdAt.seconds * 1000 : 0;

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

  return (
    <MainLayout>
      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground">Switch between orders and products from the tabs below.</p>
          </div>
          <Badge className="px-3 py-1 text-sm" variant="secondary">
            <Shield className="w-4 h-4 mr-2" />
            {user?.email}
          </Badge>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:w-[360px]">
            <TabsTrigger value="orders">Order History</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs max-w-[140px] truncate">{order.id}</TableCell>
                          <TableCell>{order.fullName || "-"}</TableCell>
                          <TableCell>{order.phone || "-"}</TableCell>
                          <TableCell>₹{Number(order.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "confirmed" ? "default" : order.status === "cancelled" ? "destructive" : "outline"}>
                              {order.status || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingOrderId === order.id || order.status === "confirmed"}
                                onClick={() => handleStatusUpdate(order.id, "confirmed")}
                              >
                                {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" />Confirm</>}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={updatingOrderId === order.id || order.status === "cancelled"}
                                onClick={() => handleStatusUpdate(order.id, "cancelled")}
                              >
                                {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1" />Cancel</>}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Manage Products</CardTitle>
                  <CardDescription>View, Add, Edit, and Delete products.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditProduct(null)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
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
                          <AccordionTrigger className="py-4 hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <span className="text-xl">{category.icon}</span>
                              <div>
                                <h3 className="font-semibold text-lg leading-tight">{category.name}</h3>
                                <p className="text-xs text-muted-foreground">/{category.slug} • {category.products.length} product{category.products.length === 1 ? "" : "s"}</p>
                              </div>
                            </div>
                          </AccordionTrigger>
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
        </Tabs>

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
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Product Dialog */}
        <Dialog open={isProductDialogOpn} onOpenChange={setIsProductDialogOpn}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProduct?.id ? "Edit Product" : "Add Product"}</DialogTitle>
              <DialogDescription>Modify product details here. Changes sync to Firestore instantly.</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <form onSubmit={handleSaveProduct} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
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
                    <p className="text-xs text-muted-foreground">Use lowercase words with hyphens (for example: bike-tags).</p>
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
      </div>
    </MainLayout>
  );
}