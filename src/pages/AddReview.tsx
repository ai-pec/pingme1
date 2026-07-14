import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Star, ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { subscribeToProducts, saveProductReview, type DbProduct, uploadProductImage } from "@/lib/productService";
import { normalizeCategorySlug } from "@/lib/productCatalog";

const GOLD = "#c9922a";
const GOLD_LIGHT = "rgba(201, 146, 42, 0.08)";
const MIST = "rgba(26, 20, 16, 0.08)";

export default function AddReview() {
  const { categorySlug, productId } = useParams<{ categorySlug: string; productId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<DbProduct | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Set default author name from profile
  useEffect(() => {
    if (profile?.fullName) {
      setAuthorName(profile.fullName);
    } else if (user?.displayName) {
      setAuthorName(user.displayName);
    } else if (user?.phoneNumber) {
      setAuthorName(user.phoneNumber);
    }
  }, [profile, user]);

  // Load product to verify it exists and show its title
  useEffect(() => {
    setLoadingProduct(true);
    const unsub = subscribeToProducts(
      (products) => {
        const found = products.find((p) => p.id === productId);
        setProduct(found || null);
        setLoadingProduct(false);
      },
      (err) => {
        console.error("Error loading products:", err);
        setLoadingProduct(false);
      }
    );
    return unsub;
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    if (!authorName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a short summary / title for your review.",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Review Required",
        description: "Please write a review comment.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      let uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        uploadedUrls = await Promise.all(
          selectedFiles.map((file) => uploadProductImage(file, "reviews"))
        );
      }

      await saveProductReview({
        productId,
        categorySlug: categorySlug ? normalizeCategorySlug(categorySlug) || "uncategorized" : "uncategorized",
        authorName: authorName.trim(),
        title: title.trim(),
        comment: comment.trim(),
        rating,
        images: uploadedUrls,
      });

      toast({
        title: "Review Added ✓",
        description: "Thank you! Your review has been submitted successfully.",
      });

      // Redirect back to the product details page
      navigate(`/products/${categorySlug}/${productId}`);
    } catch (err) {
      console.error("Failed to save review:", err);
      toast({
        title: "Submission Failed",
        description: "An error occurred while saving your review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1: return "Poor 😞";
      case 2: return "Fair 😐";
      case 3: return "Good 🙂";
      case 4: return "Very Good 😊";
      case 5: return "Excellent! 😍";
      default: return "";
    }
  };

  if (loadingProduct) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
          <p className="text-sm text-muted-foreground">Loading product details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
          <h2 className="text-xl font-bold">Product Not Found</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            The product you are trying to review could not be found or has been removed.
          </p>
          <Button asChild variant="outline" className="rounded-xl mt-2">
            <Link to="/products">Back to Products</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-12 px-4 md:py-16">
        <div className="container max-w-2xl">
          {/* Back button */}
          <Link
            to={`/products/${categorySlug}/${productId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium"
          >
            <ArrowLeft size={16} /> Back to {product.title}
          </Link>

          {/* Heading */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Write a Review
            </h1>
            <p className="text-muted-foreground text-sm">
              Share your experience with <strong>{product.title}</strong> to help others make better choices.
            </p>
          </div>

          {/* Card */}
          <div 
            className="rounded-2xl p-6 md:p-8 bg-card border"
            style={{ 
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.02)",
              backdropFilter: "blur(8px)"
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Your Rating</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = hoverRating !== null ? star <= hoverRating : star <= rating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="p-1 transition-transform active:scale-95"
                          style={{ cursor: "pointer" }}
                        >
                          <Star
                            size={28}
                            fill={isActive ? GOLD : "none"}
                            stroke={isActive ? GOLD : "#a3a3a3"}
                            strokeWidth={isActive ? 1.5 : 2}
                            style={{
                              transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                              filter: isActive ? "drop-shadow(0 2px 4px rgba(201, 146, 42, 0.2))" : "none"
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-sm font-bold transition-all px-2 py-1 rounded-md" style={{ color: GOLD, background: GOLD_LIGHT }}>
                    {getRatingLabel(hoverRating !== null ? hoverRating : rating)}
                  </span>
                </div>
              </div>

              {/* Author name */}
              <div className="space-y-1.5">
                <Label htmlFor="authorName" className="text-sm font-semibold">Display Name</Label>
                <Input
                  id="authorName"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="rounded-xl h-11 text-sm bg-muted/20 border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  required
                />
                <p className="text-[10px] text-muted-foreground pl-1">
                  This name will be displayed publicly with your review.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-semibold">Review Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience (e.g., Highly useful tag! / Premium quality)"
                  className="rounded-xl h-11 text-sm bg-muted/20 border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Comment text */}
              <div className="space-y-1.5">
                <Label htmlFor="comment" className="text-sm font-semibold">Review Details</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write your comments here. What do you like or dislike? How does it look on your device/mirror?"
                  rows={5}
                  className="rounded-xl text-sm resize-none bg-muted/20 border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Add Photos */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/90">Add Photos</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="review-photos-upload"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setSelectedFiles((prev) => {
                            const merged = [...prev, ...filesArray];
                            if (merged.length > 3) {
                              toast({
                                title: "Limit Exceeded",
                                description: "You can upload up to 3 photos per review.",
                                variant: "destructive",
                              });
                              return merged.slice(0, 3);
                            }
                            return merged;
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="review-photos-upload"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: GOLD_LIGHT,
                        color: GOLD,
                        border: `1px dashed ${GOLD}`,
                        borderRadius: 12,
                        padding: "10px 18px",
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 700,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201, 146, 42, 0.12)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = GOLD_LIGHT)}
                    >
                      Upload Photos
                    </label>
                    <span className="text-[12px] text-muted-foreground">
                      (Max 3 photos, optional)
                    </span>
                  </div>

                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="relative animate-in fade-in zoom-in duration-200"
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 12,
                            overflow: "hidden",
                            border: `1px solid ${MIST}`,
                          }}
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] font-bold border-none cursor-pointer hover:bg-black/85"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 text-sm font-bold rounded-xl mt-4 bg-primary transition-all duration-200"
                style={{ 
                  background: submitting ? "var(--muted)" : GOLD,
                  color: "#fff",
                  boxShadow: "0 4px 15px rgba(201, 146, 42, 0.15)"
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} className="mr-2" /> Submit Review
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
