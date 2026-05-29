import { useEffect, useMemo, useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import { Shield, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useParams, useNavigate } from "react-router-dom";
import { ToastAction } from "@/components/ui/toast";
import {
  buildGenericCategoryTutorial,
  categoryCoverImageFromProducts,
  categoryDescriptionFromName,
  categoryGradientFromSlug,
  categoryIconFromProducts,
  categoryNameFromSlug,
  normalizeCategorySlug,
  type ProductVariant,
  type ProductCategory,
} from "../lib/productCatalog";
import { subscribeToProducts, type DbProduct, subscribeToProductCategories } from "../lib/productService";

const categoryEmojiBySlug: Record<string, string> = {
  "car-tags": "🚗",
  "pet-tags": "🐾",
  "nfc-cards": "💳",
  "keychain-tags": "🔑",
  "backpack-stickers": "🎒",
};

// ─── Components ─────────────────────────────────────────

const ProductCardItem = ({ product }: { product: ProductVariant }) => {
  const { addToCart, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const responsiveImageSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw";
  const responsiveSrcSet = product.image
    ? `${product.image} 480w, ${product.image} 768w, ${product.image} 1024w, ${product.image} 1280w`
    : undefined;

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      emoji: product.emoji,
    });
    toast({ 
      title: "Added to Cart", 
      description: `${product.title} was added to your cart.`,
      action: <ToastAction altText="Checkout" onClick={() => navigate("/booking")}>Checkout</ToastAction>
    });
  };

  const handleBuyNow = () => {
    clearCart();
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      emoji: product.emoji,
      quantity: 1,
    });
    setIsDialogOpen(false);
    navigate("/booking");
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className={`bg-card rounded-2xl p-5 border transition-all hover:shadow-xl flex flex-col h-full relative group cursor-pointer ${
          product.popular ? "border-primary/60 border-2 shadow-md" : "border-border"
        }`}>
          {product.popular && (
            <span className="absolute top-4 right-4 z-10 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-sm">
              Best Seller
            </span>
          )}

          <div className="aspect-[4/3] sm:aspect-[5/4] md:aspect-[16/11] xl:aspect-[4/3] 2xl:aspect-[5/4] bg-secondary/40 rounded-xl mb-5 flex items-center justify-center p-3 overflow-hidden transition-colors group-hover:bg-secondary/70">
            {product.image && !imageFailed ? (
              <img
                src={product.image}
                srcSet={responsiveSrcSet}
                sizes={responsiveImageSizes}
                alt={product.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="text-6xl transition-transform duration-300 group-hover:scale-110">{product.emoji}</span>
            )}
          </div>

          <h3 className="font-bold text-base mb-1.5 leading-tight group-hover:text-primary transition-colors">{product.title}</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-xl font-black text-primary">{product.price}</span>
            {product.originalPrice && <span className="text-muted-foreground line-through text-sm mb-0.5">{product.originalPrice}</span>}
          </div>

          <p className="text-sm text-foreground/75 mt-auto  hover:text-yellow-400 hover:underline">Click to view details</p>
        </div>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1.25rem)] sm:max-w-[390px] p-0 overflow-hidden bg-card rounded-2xl">
        <div className="bg-secondary/30 p-4 sm:p-5 flex justify-center items-center relative">
          {product.popular && (
            <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-sm">
              Best Seller
            </span>
          )}
          {product.image && !imageFailed ? (
            <img
              src={product.image}
              srcSet={responsiveSrcSet}
              sizes="100vw"
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="w-full h-auto max-h-[220px] sm:max-h-[280px] md:max-h-[360px] lg:max-h-[420px] object-contain drop-shadow-xl"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="text-9xl">{product.emoji}</span>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg sm:text-xl font-bold">{product.title}</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-end gap-2 mb-4">
            <span className="text-xl sm:text-2xl font-black text-primary">{product.price}</span>
            {product.originalPrice && (
              <span className="text-muted-foreground line-through text-sm sm:text-base mb-1">{product.originalPrice}</span>
            )}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wider mb-2.5">Key Features</h4>
            <ul className="space-y-2">
              {product.features.map((feature, i) => (
                <li key={i} className="text-xs sm:text-sm font-medium flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:h-11 text-sm sm:text-base font-bold"
              onClick={handleBuyNow}
            >
              Buy Now
            </Button>
            <Button
              type="button"
              className="h-10 sm:h-11 text-sm sm:text-base font-bold shadow-lg shadow-primary/20"
              onClick={() => {
                handleAddToCart();
                setIsDialogOpen(false);
              }}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ─────────────────────────────────────

const Products = () => {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const navigate = useNavigate();
  const selectedCategory = categorySlug ? normalizeCategorySlug(categorySlug) : null;
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [categoryMetadata, setCategoryMetadata] = useState<Record<string, { name?: string; description?: string; icon?: string; coverImage?: string; gradient?: string }>>({});

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (latest) => {
        setDbProducts(latest);
      },
      (error) => {
        console.error("Failed to load products", error);
      }
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

  const categories = useMemo(() => {
    const groups = new Map<string, DbProduct[]>();

    dbProducts.forEach((product) => {
      const slug = normalizeCategorySlug(product.categorySlug) || "uncategorized";
      const existing = groups.get(slug) || [];
      existing.push(product);
      groups.set(slug, existing);
    });

    const allSlugs = new Set<string>([...groups.keys(), ...Object.keys(categoryMetadata)]);

    return Array.from(allSlugs)
      .map((slug) => {
        const categoryProducts = (groups.get(slug) || []) as unknown as ProductVariant[];
        const meta = categoryMetadata[slug] || {};
        const name = meta.name || categoryNameFromSlug(slug);

        return {
          slug,
          name,
          description: meta.description || categoryDescriptionFromName(name),
          icon: meta.icon?.trim() || categoryEmojiBySlug[slug] || categoryIconFromProducts(categoryProducts),
          coverImage: meta.coverImage || categoryCoverImageFromProducts(categoryProducts),
          gradient: meta.gradient || categoryGradientFromSlug(slug),
          products: categoryProducts.sort((left, right) => {
            // If one is popular and the other isn't, popular comes first
            if (left.popular !== right.popular) {
              return left.popular ? -1 : 1;
            }
            // If they are both the same popularity, prioritize "car sticker" or "car tag" in title
            const leftIsCar = /car\s?(sticker|tag)/i.test(left.title);
            const rightIsCar = /car\s?(sticker|tag)/i.test(right.title);
            if (leftIsCar && !rightIsCar) return -1;
            if (!leftIsCar && rightIsCar) return 1;
            // Otherwise alphabetical
            return left.title.localeCompare(right.title);
          }),
        };
      })
      .sort((left, right) => {
        if (left.slug === "car-tags") return -1;
        if (right.slug === "car-tags") return 1;
        return left.name.localeCompare(right.name);
      });
  }, [dbProducts, categoryMetadata]);

  const activeCategory = categories.find((c) => c.slug === selectedCategory);
  const activeTutorial = useMemo(
    () => (activeCategory ? buildGenericCategoryTutorial(activeCategory.name) : null),
    [activeCategory],
  );

  const CategoryCoverImage = ({ category }: { category: ProductCategory }) => {
    const [coverFailed, setCoverFailed] = useState(false);
    const responsiveCategorySrcSet = category.coverImage
      ? `${category.coverImage} 600w, ${category.coverImage} 900w, ${category.coverImage} 1200w`
      : undefined;

    if (!category.coverImage || coverFailed) {
      return <span className="text-6xl" aria-hidden="true">{category.icon}</span>;
    }

    return (
      <img
        src={category.coverImage}
        srcSet={responsiveCategorySrcSet}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        alt={category.name}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
        onError={() => setCoverFailed(true)}
      />
    );
  };

  return (
    <MainLayout>
      <div className="py-16 md:py-24">
        <div className="container">

          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-wider uppercase mb-4">
              Our Products
            </span>
            <h1
              className={`text-4xl md:text-5xl font-extrabold tracking-tight mb-4 ${selectedCategory ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
              onClick={() => selectedCategory && navigate("/products")}
            >
              {selectedCategory ? (activeCategory?.name || categoryNameFromSlug(selectedCategory)) : "Explore PingME Tags"}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto md:text-lg">
              {selectedCategory
                ? (activeCategory?.description || "No products are available in this category yet.")
                : "Choose a category to explore our range of smart NFC & QR-enabled tags for every use-case."}
            </p>
          </div>

          {/* Back Button when inside a category */}
          {selectedCategory && (
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 mb-10 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Back to All Categories</span>
            </button>
          )}

          {/* ── Category Grid (Landing View) ── */}
          {!selectedCategory && (
            categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Products are coming soon</h2>
                <p className="text-muted-foreground">No product categories are available yet. Please check back shortly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => navigate(`/products/${cat.slug}`)}
                    className={`group relative rounded-2xl border border-border bg-gradient-to-br ${cat.gradient} p-6 text-left transition-all hover:shadow-xl hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] overflow-hidden`}
                  >
                    {/* Cover Image */}
                    <div className="aspect-[16/10] sm:aspect-[5/4] md:aspect-[4/3] rounded-xl bg-white/60 dark:bg-white/10 mb-5 flex items-center justify-center p-4 overflow-hidden">
                      <CategoryCoverImage category={cat} />
                    </div>

                    {/* Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center text-xl leading-none shrink-0" aria-hidden="true">
                            {cat.icon}
                          </span>
                          <h3 className="text-lg font-bold leading-none pt-0.5">{cat.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                        <span className="inline-block mt-3 text-xs font-medium text-primary">
                          {cat.products.length} design{cat.products.length > 1 ? "s" : ""} available
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* ── Product Grid (Category View) ── */}
          {selectedCategory && !activeCategory && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Category not found</h2>
              <p className="text-muted-foreground">This category has no products right now.</p>
            </div>
          )}

          {selectedCategory && activeCategory && (
            <div className="space-y-8">
              {activeTutorial && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-2">
                    {activeTutorial.title}
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-3xl">
                    {activeTutorial.subtitle}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6">
                    {activeTutorial.steps.map((step, idx) => (
                      <div key={idx} className="rounded-xl border border-border bg-card p-4 flex gap-3">
                        <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm font-medium">
                    <span className="font-bold">Pro Tip:</span> {activeTutorial.tip}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeCategory.products.map((product) => (
                  <ProductCardItem key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default Products;
