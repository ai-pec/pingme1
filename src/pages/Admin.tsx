/**
 * Admin.tsx — Mobile-first, fully responsive admin panel.
 *
 * Mobile patterns used:
 *  • Bottom tab bar (fixed, safe-area aware) replaces top TabsList on phones
 *  • Bottom-sheet dialogs (slide up from bottom) on < sm screens
 *  • Card-list view instead of tables on phones; tables only on md+
 *  • 44 px minimum tap targets throughout
 *  • Pull-to-reveal filter drawer (no cluttered rows)
 *  • Skeleton loaders instead of spinners
 *  • Sticky section headers inside accordion on mobile
 *  • Safe-area padding for iPhone notch / home indicator
 */

import {
  useEffect, useMemo, useRef, useState, startTransition,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Copy, Eye, Loader2, MessageSquare, Save,
  Search, Shield, SlidersHorizontal, XCircle, Plus, Edit,
  Trash2, HelpCircle, ChevronDown, ChevronRight, Filter,
  ReceiptText, Package, ArrowLeft, MoreVertical, X,
} from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/layouts/MainLayout";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox }  from "@/components/ui/checkbox";
import { Textarea }  from "@/components/ui/textarea";
import { Label }     from "@/components/ui/label";
import { useAuth }   from "@/contexts/AuthContext";
import {
  subscribeToOrders, updateOrderStatus,
  subscribeToContactMessages, deleteContactMessage,
  markContactMessageRead, type ContactMessage,
} from "@/lib/adminService";
import { downloadReceipt } from "@/lib/invoiceUtils";
import {
  categoryDescriptionFromName, categoryNameFromSlug, normalizeCategorySlug,
} from "@/lib/productCatalog";
import {
  subscribeToProducts, saveProduct, deleteProductDoc, uploadProductImage,
  DbProduct, renameCategory, moveProductsToCategory,
  subscribeToProductCategories, saveProductCategory, deleteCategory,
} from "@/lib/productService";
import type { PrebookingRecord } from "@/lib/prebookService";
import {
  subscribeToFAQs, saveFAQ, deleteFAQ, initializeDefaultFAQs, type FAQItem,
} from "@/lib/faqService";

/* ──────────────────────── pure helpers ──────────────────────── */

const fmtDate = (v: unknown): string => {
  if (!v || typeof v !== "object") return "—";
  const t = v as { toDate?: () => Date; seconds?: number };
  if (typeof t.toDate === "function") return t.toDate().toLocaleString("en-IN");
  if (typeof t.seconds === "number")
    return new Date(t.seconds * 1000).toLocaleString("en-IN");
  return "—";
};

const fmtPrice = (raw: string): string | null => {
  const n = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₹${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2)}`;
};

const DEFAULT_SLUG = "uncategorized";
const catIcon = (ps: DbProduct[]) =>
  ps.find((p) => typeof p.emoji === "string" && p.emoji.trim())?.emoji?.trim() ?? "📦";

const statusColor = (s?: string) =>
  s === "confirmed" ? "default" : s === "cancelled" ? "destructive" : "outline";

/* ──────────────────────── tiny shared UI ──────────────────────── */

/** Skeleton shimmer line */
const Bone = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded bg-muted animate-pulse`} />
);

const SkeletonCard = () => (
  <div className="border rounded-xl p-4 space-y-3">
    <div className="flex justify-between"><Bone w="w-1/3" /><Bone w="w-16" h="h-5" /></div>
    <Bone w="w-1/2" h="h-3" />
    <Bone w="w-full" h="h-3" />
    <div className="flex gap-2 pt-1">
      <Bone w="w-full" h="h-8" /><Bone w="w-full" h="h-8" /><Bone w="w-full" h="h-8" />
    </div>
  </div>
);

/** Stat tile — compact on mobile */
const Stat = ({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) => (
  <div className={`rounded-xl border p-3 sm:p-4 flex flex-col gap-0.5 ${accent ? "border-primary/30 bg-primary/5" : ""}`}>
    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
    <span className="text-xl sm:text-2xl font-bold leading-none">{value}</span>
  </div>
);

/** 44px icon button with tooltip */
const IconBtn = ({
  icon: Icon, onClick, label, variant = "ghost", danger = false, disabled = false,
}: {
  icon: React.ElementType; onClick: () => void; label: string;
  variant?: "ghost" | "outline"; danger?: boolean; disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    aria-label={label}
    title={label}
    className={[
      "inline-flex items-center justify-center rounded-lg transition-colors",
      "min-w-[44px] min-h-[44px] w-11 h-11",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:opacity-40 disabled:pointer-events-none",
      danger
        ? "text-destructive hover:bg-destructive/10"
        : variant === "outline"
        ? "border border-input hover:bg-accent"
        : "hover:bg-accent text-muted-foreground hover:text-foreground",
    ].join(" ")}
  >
    <Icon className="w-4 h-4" />
  </button>
);

/** Section empty state */
const Empty = ({ icon: Icon, title, cta }: {
  icon: React.ElementType; title: string; cta?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
    <Icon className="w-10 h-10 opacity-20" />
    <p className="text-sm text-center max-w-xs">{title}</p>
    {cta}
  </div>
);

/** Search input */
const SearchBar = ({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 h-11 text-[15px] rounded-xl border-muted-foreground/20"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

/** Bottom-sheet / centered dialog that is sheet on mobile */
const Sheet = ({
  open, onClose, title, description, children,
}: {
  open: boolean; onClose: () => void;
  title: string; description?: string;
  children: React.ReactNode;
}) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent
      data-lenis-prevent
      className={[
        /* mobile: slide up from bottom, full-width, max 90vh */
        "fixed bottom-0 left-0 right-0 top-auto",
        "translate-x-0 translate-y-0",
        "rounded-t-2xl rounded-b-none",
        "max-h-[92dvh] w-full overflow-y-auto",
        "px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        /* desktop: centered card, max width */
        "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
        "sm:-translate-x-1/2 sm:-translate-y-1/2",
        "sm:rounded-2xl sm:max-w-lg sm:w-[calc(100vw-2rem)]",
        "sm:max-h-[85dvh] sm:px-6 sm:py-6",
      ].join(" ")}
    >
      {/* drag handle – mobile only */}
      <div className="sm:hidden mx-auto mb-3 w-10 h-1 rounded-full bg-muted-foreground/30" />
      <DialogHeader className="text-left mb-4">
        <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        {description && (
          <DialogDescription className="text-xs leading-relaxed">{description}</DialogDescription>
        )}
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);

/* ──────────────────────── product media ──────────────────────── */

const ProductMedia = ({ product }: { product: DbProduct }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="aspect-[4/3] bg-muted flex items-center justify-center relative overflow-hidden">
      {product.popular && (
        <Badge className="absolute top-2 right-2 text-[10px] z-10">Popular</Badge>
      )}
      {product.image && !failed ? (
        <img
          src={product.image} alt={product.title}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-4xl select-none">{product.emoji ?? "📦"}</span>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */

type TabId = "orders" | "products" | "messages" | "faqs";

export default function Admin() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>("orders");

  /* ── orders ── */
  const [orders,          setOrders]          = useState<PrebookingRecord[]>([]);
  const [loadingOrders,   setLoadingOrders]   = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder,   setSelectedOrder]   = useState<PrebookingRecord | null>(null);
  const [orderSearch,     setOrderSearch]     = useState("");
  const [orderStatus,     setOrderStatus]     = useState("all");
  const [orderSort,       setOrderSort]       = useState("newest");
  const [showFilters,     setShowFilters]     = useState(false);

  /* ── products ── */
  const [dbProducts,        setDbProducts]        = useState<DbProduct[]>([]);
  const [editingProduct,    setEditingProduct]    = useState<DbProduct | null>(null);
  const [isProductOpen,     setIsProductOpen]     = useState(false);
  const [categoryMeta,      setCategoryMeta]      = useState<Record<string, {
    name?: string; description?: string; icon?: string; coverImage?: string; gradient?: string;
  }>>({});
  const [isCategoryOpen,    setIsCategoryOpen]    = useState(false);
  const [newCatName,        setNewCatName]        = useState("");
  const [newCatIcon,        setNewCatIcon]        = useState("");
  const [newCatDesc,        setNewCatDesc]        = useState("");
  const [newCatTip,         setNewCatTip]         = useState("");
  const [isRenameOpen,      setIsRenameOpen]      = useState(false);
  const [renameTarget,      setRenameTarget]      = useState<string | null>(null);
  const [renameName,        setRenameName]        = useState("");
  const [isMoveOpen,        setIsMoveOpen]        = useState(false);
  const [moveProductId,     setMoveProductId]     = useState<string | null>(null);
  const [moveSlug,          setMoveSlug]          = useState("");
  const [isCopyOpen,        setIsCopyOpen]        = useState(false);
  const [copyProductId,     setCopyProductId]     = useState<string | null>(null);
  const [copySlug,          setCopySlug]          = useState("");
  const [savingProductId,   setSavingProductId]   = useState<string | null>(null);
  const [isUploadingImage,  setIsUploadingImage]  = useState(false);

  /* ── messages ── */
  const [messages,        setMessages]        = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [msgSearch,       setMsgSearch]       = useState("");
  const [selectedMsg,     setSelectedMsg]     = useState<ContactMessage | null>(null);

  /* ── faqs ── */
  const [faqs,           setFaqs]           = useState<FAQItem[]>([]);
  const [loadingFaqs,    setLoadingFaqs]    = useState(true);
  const [faqSearch,      setFaqSearch]      = useState("");
  const [editingFaq,     setEditingFaq]     = useState<Omit<FAQItem, "createdAt"|"updatedAt"> | null>(null);
  const [isFaqOpen,      setIsFaqOpen]      = useState(false);
  const [savingFaqId,    setSavingFaqId]    = useState<string | null>(null);
  const [initFaqs,       setInitFaqs]       = useState(false);

  /* ── subscriptions ── */
  useEffect(() => {
    setLoadingOrders(true);
    return subscribeToOrders(
      (d) => { setOrders(d); setLoadingOrders(false); },
      (e) => { console.error(e); toast.error("Failed to sync orders"); setLoadingOrders(false); },
    );
  }, []);

  useEffect(() => subscribeToProducts(
    (d) => setDbProducts(d),
    (e) => { console.error(e); toast.error("Failed to load products"); },
  ), []);

  useEffect(() => {
    setLoadingMessages(true);
    return subscribeToContactMessages(
      (d) => { setMessages(d); setLoadingMessages(false); },
      (e) => { console.error(e); toast.error("Failed to load messages"); setLoadingMessages(false); },
    );
  }, []);

  useEffect(() => subscribeToProductCategories(
    (m) => setCategoryMeta(m),
    (e) => console.error(e),
  ), []);

  useEffect(() => {
    setLoadingFaqs(true);
    return subscribeToFAQs(
      (d) => { setFaqs(d); setLoadingFaqs(false); },
      (e) => { console.error(e); toast.error("Failed to load FAQs"); setLoadingFaqs(false); },
    );
  }, []);

  /* ── derived ── */
  const categorized = useMemo(() => {
    const groups = new Map<string, DbProduct[]>();
    dbProducts.forEach((p) => {
      const slug = normalizeCategorySlug(p.categorySlug) || DEFAULT_SLUG;
      groups.set(slug, [...(groups.get(slug) ?? []), { ...p, categorySlug: slug }]);
    });
    const slugs = new Set([...groups.keys(), ...Object.keys(categoryMeta)]);
    return Array.from(slugs).map((slug) => {
      const products = (groups.get(slug) ?? []).sort((a, b) => a.title.localeCompare(b.title));
      const meta = categoryMeta[slug] ?? {};
      const name = meta.name || categoryNameFromSlug(slug);
      return {
        slug, name,
        description: meta.description || categoryDescriptionFromName(slug, name),
        icon: meta.icon?.trim() || catIcon(products),
        products,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbProducts, categoryMeta]);

  const catOptions    = useMemo(() => categorized.map((c) => c.slug), [categorized]);
  const faqCategories = useMemo(() => Array.from(new Set(faqs.map((f) => f.category).filter(Boolean))), [faqs]);
  const defaultSlug   = catOptions[0] ?? DEFAULT_SLUG;

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders
      .filter((o) => {
        const hay = [o.id, o.fullName, o.email, o.phone, o.address, o.city, o.state, o.pincode,
          ...(o.items ?? []).map((i) => i.title)].filter(Boolean).join(" ").toLowerCase();
        return (!q || hay.includes(q)) && (orderStatus === "all" || o.status === orderStatus);
      })
      .sort((a, b) => {
        const at = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const bt = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        if (orderSort === "oldest")      return at - bt;
        if (orderSort === "amount-high") return +((b.totalAmount ?? 0)) - +((a.totalAmount ?? 0));
        if (orderSort === "amount-low")  return +((a.totalAmount ?? 0)) - +((b.totalAmount ?? 0));
        if (orderSort === "name-az")     return (a.fullName ?? "").localeCompare(b.fullName ?? "");
        if (orderSort === "name-za")     return (b.fullName ?? "").localeCompare(a.fullName ?? "");
        return bt - at;
      });
  }, [orders, orderSearch, orderStatus, orderSort]);

  const filteredMsgs = useMemo(() => {
    const q = msgSearch.toLowerCase();
    return messages.filter((m) => !q || [m.name, m.email, m.message].join(" ").toLowerCase().includes(q));
  }, [messages, msgSearch]);

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.toLowerCase();
    return faqs.filter((f) => !q || [f.question, f.answer, f.category].join(" ").toLowerCase().includes(q));
  }, [faqs, faqSearch]);

  /* badge counts for tabs */
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const unreadCount  = messages.filter((m) => m.status === "new").length;

  /* ── handlers ── */
  const openProduct = (product: DbProduct | null, categorySlug?: string) => {
    const slug = normalizeCategorySlug(categorySlug ?? "") || defaultSlug;
    setEditingProduct(product
      ? { ...product, categorySlug: normalizeCategorySlug(product.categorySlug) || defaultSlug }
      : { id: "", categorySlug: slug, title: "", price: "", originalPrice: "", image: "", emoji: "", features: [""], popular: false },
    );
    setIsProductOpen(true);
  };

  const saveProductHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setSavingProductId(editingProduct.id || "new");
      await saveProduct({
        ...editingProduct,
        categorySlug: normalizeCategorySlug(editingProduct.categorySlug) || defaultSlug,
        price: fmtPrice(editingProduct.price) ?? editingProduct.price,
        originalPrice: editingProduct.originalPrice ? (fmtPrice(editingProduct.originalPrice) ?? editingProduct.originalPrice) : "",
        features: editingProduct.features.filter((f) => f.trim()),
      });
      toast.success("Product saved");
      setIsProductOpen(false);
    } catch (err) { console.error(err); toast.error("Failed to save product"); }
    finally { setSavingProductId(null); }
  };

  const copyProductHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyProductId || !copySlug) return;
    const src = dbProducts.find((p) => p.id === copyProductId);
    if (!src) { toast.error("Product not found"); return; }
    try {
      setSavingProductId(copyProductId);
      await saveProduct({ ...src, id: "", categorySlug: normalizeCategorySlug(copySlug) || defaultSlug, features: [...src.features] });
      toast.success("Product copied");
      setIsCopyOpen(false); setCopyProductId(null); setCopySlug("");
    } catch (err) { console.error(err); toast.error("Failed to copy product"); }
    finally { setSavingProductId(null); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    try {
      setIsUploadingImage(true);
      const url = await uploadProductImage(file, editingProduct.categorySlug);
      setEditingProduct({ ...editingProduct, image: url });
      toast.success("Image uploaded");
    } catch (err) { console.error(err); toast.error("Failed to upload image"); }
    finally { setIsUploadingImage(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try { await deleteProductDoc(id); toast.success("Product deleted"); }
    catch (err) { console.error(err); toast.error("Failed to delete"); }
  };

  const deleteCat = async (slug: string) => {
    if (!confirm("Delete category? Products move to Uncategorized.")) return;
    try { await deleteCategory(slug); toast.success("Category deleted"); }
    catch (err) { console.error(err); toast.error(err instanceof Error ? err.message : "Failed to delete"); }
  };

  const updateOrder = async (id: string, status: PrebookingRecord["status"]) => {
    try {
      setUpdatingOrderId(id);
      await updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
      setSelectedOrder((prev) => prev?.id === id ? { ...prev, status } : prev);
      toast.success(`Order ${status}`);
    } catch (err) { console.error(err); toast.error("Failed to update order"); }
    finally { setUpdatingOrderId(null); }
  };

  const openMsg = (msg: ContactMessage) => {
    setSelectedMsg(msg);
    if (msg.status === "new") markContactMessageRead(msg.id).catch(console.error);
  };

  const deleteMsg = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      setSelectedMsg((p) => p?.id === id ? null : p);
      await deleteContactMessage(id);
      toast.success("Message deleted");
    } catch (err) { console.error(err); toast.error("Failed to delete"); }
  };

  const openFaq = (faq: FAQItem | null) => {
    setEditingFaq(faq
      ? { id: faq.id, question: faq.question, answer: faq.answer, category: faq.category, sortOrder: faq.sortOrder }
      : { id: "", question: "", answer: "", category: "General Questions", sortOrder: faqs.length + 1 },
    );
    setIsFaqOpen(true);
  };

  const saveFaqHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;
    try {
      setSavingFaqId(editingFaq.id || "new");
      await saveFAQ(editingFaq);
      toast.success("FAQ saved");
      setIsFaqOpen(false); setEditingFaq(null);
    } catch (err) { console.error(err); toast.error("Failed to save FAQ"); }
    finally { setSavingFaqId(null); }
  };

  const deleteFaqHandler = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try { await deleteFAQ(id); toast.success("FAQ deleted"); }
    catch (err) { console.error(err); toast.error("Failed to delete"); }
  };

  const initDefaultFaqs = async () => {
    if (!confirm("Load default FAQ entries?")) return;
    try {
      setInitFaqs(true);
      await initializeDefaultFAQs();
      toast.success("Default FAQs loaded");
    } catch (err) { console.error(err); toast.error("Failed to load default FAQs"); }
    finally { setInitFaqs(false); }
  };

  /* ── tab definitions ── */
  const tabs: { id: TabId; label: string; shortLabel: string; icon: React.ElementType; badge?: number }[] = [
    { id: "orders",   label: "Orders",   shortLabel: "Orders",   icon: ReceiptText,   badge: pendingCount },
    { id: "products", label: "Products", shortLabel: "Products", icon: Package },
    { id: "messages", label: "Messages", shortLabel: "Msgs",     icon: MessageSquare, badge: unreadCount },
    { id: "faqs",     label: "FAQs",     shortLabel: "FAQs",     icon: HelpCircle },
  ];

  /* ══════ RENDER ══════ */
  return (
    <MainLayout>
      <style>{`
        /* ── bottom nav safe area ── */
        .admin-bottom-nav {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        /* ── main content padding on mobile (account for fixed bottom nav 64px + safe area) ── */
        @media (max-width: 639px) {
          .admin-content {
            padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
          }
        }
        /* ── smooth form scroll ── */
        .admin-form-scroll {
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        .admin-form-scroll::-webkit-scrollbar { width: 4px; }
        .admin-form-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
        /* ── sticky category header ── */
        .sticky-cat-header { position: sticky; top: 0; z-index: 10; background: hsl(var(--background)); }
        /* ── slide-up sheet on mobile ── */
        @media (max-width: 639px) {
          [role="dialog"][data-sheet] {
            animation: slideUp 240ms cubic-bezier(0.32,0.72,0,1) both;
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        }
        /* ── tab transitions ── */
        .tab-panel { animation: fadeIn 180ms ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        /* Active bottom tab indicator */
        .bottom-tab-active::before {
          content: "";
          position: absolute;
          top: 0; left: 50%; transform: translateX(-50%);
          width: 24px; height: 2px;
          background: hsl(var(--primary));
          border-radius: 0 0 2px 2px;
        }
      `}</style>

      {/* ── page wrapper ── */}
      <div className="admin-content max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-5">

        {/* ── header ── */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Admin Panel</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              Orders · Products · Messages · FAQs
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs max-w-[180px]">
            <Shield className="w-3 h-3 shrink-0" />
            <span className="truncate">{user?.email}</span>
          </Badge>
        </div>

        {/* ── desktop tab bar (hidden on mobile — bottom nav handles it) ── */}
        <div className="hidden sm:flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {!!badge && (
                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 shrink-0">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── tab content ── */}
        <div className="tab-panel" key={activeTab}>

          {/* ╔══════════════ ORDERS ══════════════╗ */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {/* stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Stat label="Total" value={orders.length} />
                <Stat label="Pending" value={orders.filter((o) => o.status === "pending").length} accent />
                <Stat label="Confirmed" value={orders.filter((o) => o.status === "confirmed").length} />
              </div>

              {/* search + filter toggle */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchBar value={orderSearch} onChange={setOrderSearch} placeholder="Search orders…" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    className={[
                      "h-11 w-11 rounded-xl border flex items-center justify-center transition-colors shrink-0",
                      showFilters ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent",
                    ].join(" ")}
                    aria-label="Toggle filters"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>

                {/* collapsible filters */}
                {showFilters && (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl border border-dashed">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                      <Select value={orderStatus} onValueChange={setOrderStatus}>
                        <SelectTrigger className="h-9 text-sm rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sort by</p>
                      <Select value={orderSort} onValueChange={setOrderSort}>
                        <SelectTrigger className="h-9 text-sm rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="oldest">Oldest</SelectItem>
                          <SelectItem value="amount-high">Amount ↓</SelectItem>
                          <SelectItem value="amount-low">Amount ↑</SelectItem>
                          <SelectItem value="name-az">Name A–Z</SelectItem>
                          <SelectItem value="name-za">Name Z–A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* result count */}
                <p className="text-xs text-muted-foreground px-0.5">
                  {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                  {orderSearch || orderStatus !== "all" ? " matching" : ""}
                </p>
              </div>

              {/* loading */}
              {loadingOrders && (
                <div className="space-y-3">
                  {[1,2,3].map((i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {/* empty */}
              {!loadingOrders && filteredOrders.length === 0 && (
                <Empty icon={ReceiptText} title="No orders found. Try adjusting your search or filters." />
              )}

              {/* ── mobile: card list ── */}
              {!loadingOrders && filteredOrders.length > 0 && (
                <>
                  <div className="md:hidden space-y-3">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-card border rounded-xl p-4 space-y-3 active:scale-[0.99] transition-transform"
                      >
                        {/* top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {order.userId ? (
                              <button
                                onClick={() => navigate(`/profile/${order.userId}`)}
                                className="font-semibold text-[15px] text-primary hover:underline text-left truncate block w-full"
                              >
                                {order.fullName || "Unknown"}
                              </button>
                            ) : (
                              <p className="font-semibold text-[15px] truncate">{order.fullName || "Unknown"}</p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{order.id}</p>
                          </div>
                          <Badge variant={statusColor(order.status)} className="text-[11px] shrink-0 capitalize">
                            {order.status || "pending"}
                          </Badge>
                        </div>

                        {/* meta row */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-base">₹{Number(order.totalAmount || 0).toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">{order.phone || "—"}</span>
                        </div>

                        {/* items preview */}
                        {(order.items ?? []).length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {order.items!.map((i) => i.title).join(", ")}
                          </p>
                        )}

                        {/* actions */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 text-xs rounded-lg gap-1"
                            onClick={() => startTransition(() => setSelectedOrder(order))}
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 text-xs rounded-lg gap-1 text-green-700 border-green-200 hover:bg-green-50"
                            disabled={updatingOrderId === order.id || order.status === "confirmed"}
                            onClick={() => updateOrder(order.id, "confirmed")}
                          >
                            {updatingOrderId === order.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <><CheckCircle2 className="w-3.5 h-3.5" />OK</>}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-10 text-xs rounded-lg gap-1"
                            disabled={updatingOrderId === order.id || order.status === "cancelled"}
                            onClick={() => updateOrder(order.id, "cancelled")}
                          >
                            {updatingOrderId === order.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <><XCircle className="w-3.5 h-3.5" />Cancel</>}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── desktop table ── */}
                  <div className="hidden md:block rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="whitespace-nowrap font-semibold">Order ID</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Customer</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Phone</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Amount</TableHead>
                          <TableHead className="whitespace-nowrap font-semibold">Status</TableHead>
                          <TableHead className="hidden lg:table-cell whitespace-nowrap font-semibold">Created</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate">{order.id}</TableCell>
                            <TableCell className="font-medium max-w-[140px] truncate">
                              {order.userId
                                ? <button onClick={() => navigate(`/profile/${order.userId}`)} className="text-primary hover:underline text-left">{order.fullName || "—"}</button>
                                : order.fullName || "—"}
                            </TableCell>
                            <TableCell className="text-sm">{order.phone || "—"}</TableCell>
                            <TableCell className="font-semibold">₹{Number(order.totalAmount || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={statusColor(order.status)} className="capitalize text-xs">{order.status || "pending"}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(order.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => startTransition(() => setSelectedOrder(order))}>
                                  <Eye className="w-3.5 h-3.5" /><span className="hidden lg:inline">View</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 gap-1 text-green-700 hover:bg-green-50 hover:text-green-700"
                                  disabled={updatingOrderId === order.id || order.status === "confirmed"}
                                  onClick={() => updateOrder(order.id, "confirmed")}>
                                  {updatingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" /><span className="hidden lg:inline">Confirm</span></>}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={updatingOrderId === order.id || order.status === "cancelled"}
                                  onClick={() => updateOrder(order.id, "cancelled")}>
                                  {updatingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><XCircle className="w-3.5 h-3.5" /><span className="hidden lg:inline">Cancel</span></>}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ╔══════════════ PRODUCTS ══════════════╗ */}
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {dbProducts.length} product{dbProducts.length !== 1 ? "s" : ""} across {categorized.length} categor{categorized.length !== 1 ? "ies" : "y"}
                  </p>
                </div>
                <Button size="sm" className="h-9 gap-1.5 rounded-lg text-xs" onClick={() => setIsCategoryOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </Button>
              </div>

              {categorized.length === 0 ? (
                <Empty icon={Package} title="No products yet. Add a category first, then add products to it." />
              ) : (
                <Accordion type="single" collapsible className="space-y-2.5">
                  {categorized.map((cat) => (
                    <AccordionItem key={cat.slug} value={cat.slug} className="border rounded-xl overflow-hidden px-0">
                      {/* category header */}
                      <div className="flex items-center pl-4 pr-2 sticky-cat-header">
                        <AccordionTrigger className="flex-1 py-3.5 hover:no-underline gap-3">
                          <div className="flex items-center gap-3 text-left w-full">
                            <span className="text-2xl leading-none">{cat.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm sm:text-base truncate">{cat.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                /{cat.slug} · {cat.products.length} item{cat.products.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <IconBtn icon={Edit} label={`Rename ${cat.name}`} onClick={() => { setRenameTarget(cat.slug); setRenameName(cat.name); setIsRenameOpen(true); }} />
                          <IconBtn icon={Trash2} label={`Delete ${cat.name}`} danger disabled={cat.slug === "uncategorized"} onClick={() => deleteCat(cat.slug)} />
                        </div>
                      </div>

                      <AccordionContent className="px-4 pb-4">
                        <div className="flex justify-end mb-3">
                          <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs rounded-lg" onClick={() => openProduct(null, cat.slug)}>
                            <Plus className="w-3.5 h-3.5" /> Add to {cat.name}
                          </Button>
                        </div>

                        {cat.products.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6 italic">No products here yet.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {cat.products.map((product) => (
                              <div key={product.id} className="border rounded-xl overflow-hidden flex flex-col bg-card">
                                <ProductMedia product={product} />
                                <div className="p-3 flex-1 flex flex-col gap-2">
                                  <p className="font-semibold text-xs sm:text-sm leading-snug line-clamp-2" title={product.title}>
                                    {product.title}
                                  </p>
                                  <div className="flex items-center gap-1 mt-auto">
                                    <span className="font-bold text-primary text-xs sm:text-sm">{product.price}</span>
                                    {product.originalPrice && (
                                      <span className="text-[10px] text-muted-foreground line-through">{product.originalPrice}</span>
                                    )}
                                  </div>
                                  {/* 4-action row — equal sized touch targets */}
                                  <div className="grid grid-cols-4 gap-0.5 -mx-1">
                                    <IconBtn icon={Edit}             label="Edit product"       onClick={() => openProduct(product)} />
                                    <IconBtn icon={Copy}             label="Copy product"       onClick={() => { setCopyProductId(product.id); setCopySlug(normalizeCategorySlug(product.categorySlug) || defaultSlug); setIsCopyOpen(true); }} />
                                    <IconBtn icon={SlidersHorizontal} label="Move product"      onClick={() => { setMoveProductId(product.id); setIsMoveOpen(true); }} />
                                    <IconBtn icon={Trash2}           label="Delete product" danger onClick={() => deleteProduct(product.id)} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          )}

          {/* ╔══════════════ MESSAGES ══════════════╗ */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Stat label="Total" value={messages.length} />
                <Stat label="Unread" value={messages.filter((m) => m.status === "new").length} accent />
                <Stat label="With phone" value={messages.filter((m) => m.phone?.trim()).length} />
              </div>

              <SearchBar value={msgSearch} onChange={setMsgSearch} placeholder="Search name, email, message…" />

              <p className="text-xs text-muted-foreground px-0.5">
                {filteredMsgs.length} message{filteredMsgs.length !== 1 ? "s" : ""}
                {msgSearch ? " matching" : ""}
              </p>

              {loadingMessages && <div className="space-y-3">{[1,2,3].map((i) => <SkeletonCard key={i} />)}</div>}

              {!loadingMessages && filteredMsgs.length === 0 && (
                <Empty
                  icon={MessageSquare}
                  title={messages.length === 0
                    ? "No messages yet. They'll appear here when someone fills in the contact form."
                    : "No messages match your search."}
                />
              )}

              {/* mobile cards */}
              {!loadingMessages && filteredMsgs.length > 0 && (
                <>
                  <div className="md:hidden space-y-3">
                    {filteredMsgs.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => openMsg(msg)}
                        className="bg-card border rounded-xl p-4 space-y-2 cursor-pointer active:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[15px] text-primary truncate">{msg.name}</p>
                          <Badge variant={msg.status === "new" ? "default" : "outline"} className="text-[10px] shrink-0">
                            {msg.status === "new" ? "New" : "Read"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{msg.email}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{msg.message}</p>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[10px] text-muted-foreground">{fmtDate(msg.createdAt)}</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteMsg(msg.id); }}
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Delete message"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* desktop table */}
                  <div className="hidden md:block rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold w-[80px]">Status</TableHead>
                          <TableHead className="font-semibold">Email</TableHead>
                          <TableHead className="hidden lg:table-cell font-semibold">Phone</TableHead>
                          <TableHead className="font-semibold">Message</TableHead>
                          <TableHead className="hidden xl:table-cell font-semibold">Received</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMsgs.map((msg) => (
                          <TableRow key={msg.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openMsg(msg)}>
                            <TableCell className="font-medium">
                              <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openMsg(msg); }}>{msg.name}</button>
                            </TableCell>
                            <TableCell>
                              <Badge variant={msg.status === "new" ? "default" : "outline"} className="text-[10px]">
                                {msg.status === "new" ? "New" : "Read"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <a href={`mailto:${msg.email}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{msg.email}</a>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {msg.phone?.trim() ? <a href={`tel:${msg.phone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{msg.phone}</a> : <span className="opacity-40">—</span>}
                            </TableCell>
                            <TableCell>
                              <p className="text-xs text-muted-foreground max-w-[220px] truncate">{msg.message}</p>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{fmtDate(msg.createdAt)}</TableCell>
                            <TableCell>
                              <button type="button" onClick={(e) => { e.stopPropagation(); deleteMsg(msg.id); }}
                                className="h-9 w-9 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ╔══════════════ FAQS ══════════════╗ */}
          {activeTab === "faqs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Stat label="Total FAQs" value={faqs.length} />
                <Stat label="Categories" value={faqCategories.length} />
                <Stat
                  label="Status"
                  value={
                    faqs.length > 0
                      ? <span className="text-green-600 text-sm sm:text-base flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Live</span>
                      : <span className="text-amber-500 text-sm sm:text-base flex items-center gap-1"><XCircle className="w-4 h-4" />Empty</span>
                  }
                />
              </div>

              {/* actions */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchBar value={faqSearch} onChange={setFaqSearch} placeholder="Search questions…" />
                </div>
                <Button size="sm" className="h-11 gap-1.5 rounded-xl shrink-0" onClick={() => openFaq(null)}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add FAQ</span>
                </Button>
              </div>

              {faqs.length === 0 && !loadingFaqs && (
                <Button variant="outline" className="w-full h-11 rounded-xl gap-2" onClick={initDefaultFaqs} disabled={initFaqs}>
                  {initFaqs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Load Default FAQs
                </Button>
              )}

              <p className="text-xs text-muted-foreground px-0.5">
                {filteredFaqs.length} FAQ{filteredFaqs.length !== 1 ? "s" : ""}{faqSearch ? " matching" : ""}
              </p>

              {loadingFaqs && <div className="space-y-3">{[1,2,3].map((i) => <SkeletonCard key={i} />)}</div>}

              {!loadingFaqs && filteredFaqs.length === 0 && (
                <Empty icon={HelpCircle} title={faqs.length === 0 ? "No FAQs yet. Load defaults or add your first question." : "No FAQs match your search."} />
              )}

              {/* mobile cards */}
              {!loadingFaqs && filteredFaqs.length > 0 && (
                <>
                  <div className="md:hidden space-y-3">
                    {filteredFaqs.map((faq) => (
                      <div key={faq.id} className="bg-card border rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">{faq.category}</Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">#{faq.sortOrder}</span>
                        </div>
                        <p className="font-semibold text-sm leading-snug">{faq.question}</p>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{faq.answer}</p>
                        <div className="flex justify-end gap-1 pt-1">
                          <IconBtn icon={Edit}  label="Edit FAQ"   onClick={() => openFaq(faq)} />
                          <IconBtn icon={Trash2} label="Delete FAQ" danger onClick={() => deleteFaqHandler(faq.id)} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* desktop table */}
                  <div className="hidden md:block rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-[60px] font-semibold">#</TableHead>
                          <TableHead className="w-[160px] font-semibold">Category</TableHead>
                          <TableHead className="font-semibold">Question / Answer</TableHead>
                          <TableHead className="w-[90px] text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFaqs.map((faq) => (
                          <TableRow key={faq.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground">{faq.sortOrder}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{faq.category}</Badge></TableCell>
                            <TableCell className="max-w-md">
                              <p className="font-semibold text-sm">{faq.question}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{faq.answer}</p>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end">
                                <IconBtn icon={Edit}  label="Edit FAQ"   onClick={() => openFaq(faq)} />
                                <IconBtn icon={Trash2} label="Delete FAQ" danger onClick={() => deleteFaqHandler(faq.id)} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

        </div>{/* end tab-panel */}
      </div>{/* end admin-content */}

      {/* ══════════════════════════════════════════
          MOBILE BOTTOM TAB BAR (sm:hidden)
      ══════════════════════════════════════════ */}
      <nav className="admin-bottom-nav sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t">
        <div className="grid grid-cols-4 h-16">
          {tabs.map(({ id, shortLabel, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                "relative flex flex-col items-center justify-center gap-1 transition-colors",
                activeTab === id ? "bottom-tab-active text-primary" : "text-muted-foreground",
              ].join(" ")}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {!!badge && (
                  <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold w-[14px] h-[14px]">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          DIALOGS / BOTTOM SHEETS
      ══════════════════════════════════════════ */}

      {/* ── Order detail ── */}
      <Sheet
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        description={`Order ID: ${selectedOrder?.id ?? ""}`}
      >
        {selectedOrder && (
          <div className="space-y-4 admin-form-scroll max-h-[60dvh]">
            {/* customer info grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {([
                ["Name",        selectedOrder.fullName],
                ["Email",       selectedOrder.email],
                ["Phone",       selectedOrder.phone],
                ["Status",      selectedOrder.status || "pending"],
                ["Amount",      `₹${Number(selectedOrder.totalAmount || 0).toFixed(2)}`],
                ["Created",     fmtDate(selectedOrder.createdAt)],
                ["Address",     selectedOrder.address],
                ["City",        selectedOrder.city],
                ["State",       selectedOrder.state],
                ["Pincode",     selectedOrder.pincode],
              ] as [string, string | undefined][]).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{k}</p>
                  <p className="text-sm font-medium truncate">{v || "—"}</p>
                </div>
              ))}
            </div>

            {/* items */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Items</p>
              <div className="space-y-1.5">
                {(selectedOrder.items ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 text-sm">
                    <span className="truncate mr-2">{item.title}</span>
                    <span className="text-muted-foreground shrink-0">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* payment */}
            {selectedOrder.payment && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payment</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Gateway",    selectedOrder.payment.gateway],
                    ["Order ID",   selectedOrder.payment.orderId],
                    ["Payment ID", selectedOrder.payment.paymentId],
                    ["Currency",   selectedOrder.payment.currency],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">{k}</p>
                      <p className="text-sm font-mono truncate">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* actions */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="h-11 rounded-xl text-xs gap-1 text-green-700 border-green-200"
                disabled={updatingOrderId === selectedOrder.id || selectedOrder.status === "confirmed"}
                onClick={() => updateOrder(selectedOrder.id, "confirmed")}>
                <CheckCircle2 className="w-4 h-4" /> Confirm
              </Button>
              <Button variant="destructive" size="sm" className="h-11 rounded-xl text-xs gap-1"
                disabled={updatingOrderId === selectedOrder.id || selectedOrder.status === "cancelled"}
                onClick={() => updateOrder(selectedOrder.id, "cancelled")}>
                <XCircle className="w-4 h-4" /> Cancel
              </Button>
              <Button variant="outline" size="sm" className="h-11 rounded-xl text-xs gap-1"
                disabled={!selectedOrder.payment}
                onClick={() => downloadReceipt(selectedOrder, selectedOrder.email ?? "")}>
                <ReceiptText className="w-4 h-4" /> Invoice
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* ── Message detail ── */}
      <Sheet
        open={!!selectedMsg}
        onClose={() => setSelectedMsg(null)}
        title={`Message from ${selectedMsg?.name ?? ""}`}
        description="Contact form submission"
      >
        {selectedMsg && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {([
                ["Name",     selectedMsg.name],
                ["Email",    selectedMsg.email],
                ["Phone",    selectedMsg.phone?.trim() || "Not provided"],
                ["Received", fmtDate(selectedMsg.createdAt)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{k}</p>
                  {k === "Email"
                    ? <a href={`mailto:${v}`} className="text-sm text-primary hover:underline break-all">{v}</a>
                    : <p className="text-sm font-medium break-all">{v}</p>}
                </div>
              ))}
            </dl>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Message</p>
              <div className="bg-muted/40 rounded-xl p-3.5 text-sm whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {selectedMsg.message}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <Button variant="destructive" size="sm" className="h-11 rounded-xl gap-1 text-xs"
                onClick={() => deleteMsg(selectedMsg.id)}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <Button variant="outline" size="sm" className="h-11 rounded-xl gap-1 text-xs" asChild>
                <a href={`mailto:${selectedMsg.email}`}><MessageSquare className="w-4 h-4" /> Reply</a>
              </Button>
              <Button variant="outline" size="sm" className="h-11 rounded-xl text-xs" onClick={() => setSelectedMsg(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* ── Product add / edit ── */}
      <Sheet
        open={isProductOpen}
        onClose={() => setIsProductOpen(false)}
        title={editingProduct?.id ? "Edit Product" : "Add Product"}
        description="Changes sync to Firestore instantly."
      >
        {editingProduct && (
          <form onSubmit={saveProductHandler} className="space-y-4 admin-form-scroll max-h-[65dvh] pr-0.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Input
                  value={editingProduct.categorySlug}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categorySlug: normalizeCategorySlug(e.target.value) })}
                  placeholder="e.g. car-tags"
                  list="cat-slugs"
                  required
                  className="h-11 text-sm rounded-xl"
                />
                <datalist id="cat-slugs">{catOptions.map((s) => <option key={s} value={s} />)}</datalist>
                <p className="text-[10px] text-muted-foreground">Lowercase with hyphens — e.g. car-tags</p>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Title</Label>
                <Input value={editingProduct.title} onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  placeholder="Product title" required className="h-11 text-sm rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Price</Label>
                <Input value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  placeholder="499 or ₹499" required className="h-11 text-sm rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Original Price</Label>
                <Input value={editingProduct.originalPrice} onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: e.target.value })}
                  placeholder="599" className="h-11 text-sm rounded-xl" />
              </div>
            </div>

            {/* image upload */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Product Image</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage}
                className="h-11 text-sm rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium file:h-7 file:px-3" />
              <Input value={editingProduct.image} onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                placeholder="Or paste image URL" className="h-11 text-sm rounded-xl" />
              {isUploadingImage && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                </div>
              )}
              {editingProduct.image && (
                <div className="w-20 h-20 rounded-xl border overflow-hidden bg-muted">
                  <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Emoji (fallback if no image)</Label>
              <Input value={editingProduct.emoji ?? ""} onChange={(e) => setEditingProduct({ ...editingProduct, emoji: e.target.value })}
                placeholder="🚗" maxLength={5} className="h-11 text-sm rounded-xl w-24" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Key Features (one per line)</Label>
              <Textarea
                rows={4}
                value={editingProduct.features.join("\n")}
                onChange={(e) => setEditingProduct({ ...editingProduct, features: e.target.value.split("\n") })}
                placeholder={"Premium quality card\nFits car's front mirror"}
                required
                className="text-sm rounded-xl resize-none"
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox checked={editingProduct.popular} onCheckedChange={(c) => setEditingProduct({ ...editingProduct, popular: !!c })} />
              <div>
                <p className="text-sm font-medium">Mark as Popular</p>
                <p className="text-xs text-muted-foreground">Shows a "Popular" badge on this product</p>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setIsProductOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11 rounded-xl gap-2" disabled={savingProductId !== null}>
                {savingProductId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Product
              </Button>
            </div>
          </form>
        )}
      </Sheet>

      {/* ── Create category ── */}
      <Sheet open={isCategoryOpen} onClose={() => setIsCategoryOpen(false)} title="New Category" description="Metadata shown on the storefront.">
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await saveProductCategory(newCatName || newCatIcon || String(Date.now()), { name: newCatName, icon: newCatIcon, description: newCatDesc, proTip: newCatTip });
            toast.success("Category created");
            setIsCategoryOpen(false);
            setNewCatName(""); setNewCatIcon(""); setNewCatDesc(""); setNewCatTip("");
          } catch (err) { console.error(err); toast.error("Failed to create category"); }
        }} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Name</Label>
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Pet Tags" required className="h-11 text-sm rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Emoji icon</Label>
            <Input value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} placeholder="🐾" className="h-11 text-sm rounded-xl w-24" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Brief description shown on the products page" rows={2} className="text-sm rounded-xl resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Pro Tip</Label>
            <Input value={newCatTip} onChange={(e) => setNewCatTip(e.target.value)} placeholder="Quick tip shown below features" className="h-11 text-sm rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setIsCategoryOpen(false)}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-xl">Create</Button>
          </div>
        </form>
      </Sheet>

      {/* ── Rename category ── */}
      <Sheet open={isRenameOpen} onClose={() => { setIsRenameOpen(false); setRenameTarget(null); }} title="Rename Category">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!renameTarget) return;
          try { await renameCategory(renameTarget, renameName); toast.success("Category renamed"); setIsRenameOpen(false); setRenameTarget(null); }
          catch (err) { console.error(err); toast.error("Failed to rename"); }
        }} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">New Name</Label>
            <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} placeholder="e.g. Pet Tags" required className="h-11 text-sm rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => { setIsRenameOpen(false); setRenameTarget(null); }}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-xl">Save</Button>
          </div>
        </form>
      </Sheet>

      {/* ── Move product ── */}
      <Sheet open={isMoveOpen} onClose={() => { setIsMoveOpen(false); setMoveProductId(null); setMoveSlug(""); }} title="Move Product" description="Select a category to move this product to.">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!moveProductId || !moveSlug) return;
          try { await moveProductsToCategory([moveProductId], moveSlug); toast.success("Product moved"); setIsMoveOpen(false); setMoveProductId(null); setMoveSlug(""); }
          catch (err) { console.error(err); toast.error("Failed to move product"); }
        }} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Category</Label>
            <Select value={moveSlug} onValueChange={setMoveSlug}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {catOptions.map((slug) => (
                  <SelectItem key={slug} value={slug}>{categoryMeta[slug]?.name ?? categoryNameFromSlug(slug)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => { setIsMoveOpen(false); setMoveProductId(null); setMoveSlug(""); }}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-xl">Move</Button>
          </div>
        </form>
      </Sheet>

      {/* ── Copy product ── */}
      <Sheet open={isCopyOpen} onClose={() => { setIsCopyOpen(false); setCopyProductId(null); setCopySlug(""); }} title="Copy Product" description="Duplicate this product to another category.">
        <form onSubmit={copyProductHandler} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Category</Label>
            <Select value={copySlug} onValueChange={setCopySlug}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {catOptions.map((slug) => (
                  <SelectItem key={slug} value={slug}>{categoryMeta[slug]?.name ?? categoryNameFromSlug(slug)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => { setIsCopyOpen(false); setCopyProductId(null); setCopySlug(""); }}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-xl" disabled={savingProductId === copyProductId}>Copy</Button>
          </div>
        </form>
      </Sheet>

      {/* ── FAQ add / edit ── */}
      <Sheet
        open={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
        title={editingFaq?.id ? "Edit FAQ" : "Add FAQ"}
        description="Updates the public FAQ page instantly."
      >
        {editingFaq && (
          <form onSubmit={saveFaqHandler} className="space-y-4 admin-form-scroll max-h-[60dvh] pr-0.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Question</Label>
              <Input value={editingFaq.question} onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                placeholder="Enter the question" required className="h-11 text-sm rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Answer</Label>
              <Textarea rows={4} value={editingFaq.answer} onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                placeholder="Enter the answer" required className="text-sm rounded-xl resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Input value={editingFaq.category} onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                  placeholder="General Questions" list="faq-cats" required className="h-11 text-sm rounded-xl" />
                <datalist id="faq-cats">{faqCategories.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sort Order</Label>
                <Input type="number" value={editingFaq.sortOrder}
                  onChange={(e) => setEditingFaq({ ...editingFaq, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  required className="h-11 text-sm rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setIsFaqOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11 rounded-xl gap-2" disabled={savingFaqId !== null}>
                {savingFaqId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save FAQ
              </Button>
            </div>
          </form>
        )}
      </Sheet>

    </MainLayout>
  );
}