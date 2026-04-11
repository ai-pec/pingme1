import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ShoppingBag, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import NFCProfileBuilder, { NFCProfileData } from "@/components/NFCProfileBuilder";
import {
  createRazorpayOrder,
  openRazorpayCheckout,
  verifyRazorpayPaymentAndCreatePrebooking,
} from "@/lib/paymentService";

const indianStates = [
  "Chandigarh", "New Delhi", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", 
  "Jammu & Kashmir", "Ladakh"
];

const Prebook = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, cartTotal, clearCart } = useCart();
  const { user, profile } = useAuth();

  // Delivery Details State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  
  // Checkout Flow State
  const [step, setStep] = useState<"delivery" | "profile" | "payment">("delivery");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // NFC Profile State
  const [nfcProfile, setNFCProfile] = useState<NFCProfileData>({
    name: "",
    email: "",
    phone: "",
    bio: "",
    website: "",
    linkedin: "",
    twitter: "",
    instagram: "",
    facebook: "",
  });

  // Check if cart contains any NFC cards
  const hasNFCCards = items.length > 0 && items.some(item => item.id.startsWith("nfc-"));
  const showProfileBuilding = hasNFCCards;

  // Auto-fill user basics if authed
  useEffect(() => {
    if (profile) {
      if (profile.displayName && !fullName) {
        setFullName(profile.displayName);
        setNFCProfile(prev => ({ ...prev, name: profile.displayName }));
      }
      if (profile.email && !email) {
        setEmail(profile.email);
        setNFCProfile(prev => ({ ...prev, email: profile.email }));
      }
      if (profile.mobile && !phone) {
        setPhone(profile.mobile);
        setNFCProfile(prev => ({ ...prev, phone: profile.mobile }));
      }
    }
  }, [profile]);

  const handleApplySavedAddress = (savedAddr: any) => {
    setAddress(savedAddr.fullAddress || "");
    setCity(savedAddr.city || "");
    setState(savedAddr.state || "");
    setPincode(savedAddr.pincode || "");
    toast({ title: "Address Applied", description: "Your saved address has been loaded." });
  };

  // Handle delivery details form submission
  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim() || !state || !pincode.trim()) {
      toast({ title: "Missing Fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    const phoneRegex = /^[+]?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast({ title: "Invalid Phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      toast({ title: "Invalid Pincode", description: "Please enter a valid 6-digit pincode.", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Cart Empty", description: "Please add products to your cart first.", variant: "destructive" });
      return;
    }

    // If order contains NFC cards, update profile and move to profile building step
    if (showProfileBuilding) {
      setNFCProfile(prev => ({
        ...prev,
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }));
      setStep("profile");
    } else {
      // For non-NFC products, proceed directly to payment
      handlePayment(fullName.trim(), email.trim(), phone.trim());
    }
  };

  // Handle payment processing
  const handlePayment = async (deliveryFullName: string, deliveryEmail: string, deliveryPhone: string) => {
    setSubmitting(true);
    try {
      const prebookingPayload = {
        items,
        totalAmount: cartTotal,
        fullName: deliveryFullName,
        email: deliveryEmail,
        phone: deliveryPhone,
        address: address.trim(),
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        ...(showProfileBuilding ? { nfcProfile } : {}),
        status: "confirmed" as const,
        userId: user?.uid,
      };

      const order = await createRazorpayOrder({
        amount: Math.round(cartTotal * 100),
        currency: "INR",
        receipt: `pingme_${Date.now()}`,
        notes: {
          userId: user?.uid || "guest",
        },
      });

      await openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        fullName: deliveryFullName,
        email: deliveryEmail,
        phone: deliveryPhone,
        onSuccess: async (paymentResponse) => {
          try {
            await verifyRazorpayPaymentAndCreatePrebooking({
              orderId: paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              prebooking: {
                ...prebookingPayload,
                payment: {
                  gateway: "razorpay",
                  orderId: paymentResponse.razorpay_order_id,
                  paymentId: paymentResponse.razorpay_payment_id,
                  signature: paymentResponse.razorpay_signature,
                  amount: order.amount,
                  currency: order.currency,
                  paidAt: new Date().toISOString(),
                },
              },
            });

            setSuccess(true);
            clearCart();
          } catch (verifyErr: unknown) {
            const verifyMessage = verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.";
            toast({ title: "Payment verification failed", description: verifyMessage, variant: "destructive" });
          } finally {
            setSubmitting(false);
          }
        },
        onDismiss: () => {
          setSubmitting(false);
          toast({
            title: "Payment cancelled",
            description: "You can retry payment whenever you are ready.",
            variant: "destructive",
          });
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong.";
      toast({ title: "Failed", description: errorMessage, variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <MainLayout>
        <div className="container py-20 text-center max-w-md mx-auto">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pre-booking Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            We'll reach out to you shortly with payment and delivery details.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/products")}>Browse More Tags</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-20 text-center max-w-md mx-auto">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-6">Looks like you haven't added anything to checkout yet.</p>
          <Button onClick={() => navigate("/products")}>Browse Products</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-12 max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Checkout Form / Profile Builder */}
        <div className="flex-1">
          {step === "delivery" ? (
            <>
              <h1 className="text-2xl font-bold mb-6">Checkout & Delivery Details</h1>

              {/* Quick Saved Addresses (Authenticated Only) */}
              {user && profile?.addresses && profile.addresses.length > 0 && (
                <div className="mb-8 p-4 bg-secondary/30 rounded-xl border border-border">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary" /> Use a Saved Address
                  </h3>
                  <div className="flex flex-col gap-2">
                    {profile.addresses.map(addr => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleApplySavedAddress(addr)}
                        className="text-left text-sm p-3 rounded-lg border border-border hover:border-primary transition-colors bg-card"
                      >
                        <span className="font-medium block">{addr.fullAddress}</span>
                        <span className="text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleDeliverySubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Input id="address" placeholder="House number, Street, Locality" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input id="pincode" placeholder="160012" value={pincode} onChange={(e) => setPincode(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <select id="state" value={state} onChange={(e) => setState(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm">
                    <option value="">Select State</option>
                    {indianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Button type="submit" className="w-full mt-6 h-12 text-base" disabled={submitting}>
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (showProfileBuilding ? "Continue to Profile Setup" : `Pay ₹${cartTotal.toFixed(2)} & Confirm`)}
                </Button>
              </form>
            </>
          ) : (
            <NFCProfileBuilder
              profileData={nfcProfile}
              onProfileChange={setNFCProfile}
              onBack={() => setStep("delivery")}
              onContinue={() => handlePayment(fullName.trim(), email.trim(), phone.trim())}
              isLoading={submitting}
            />
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="w-full md:w-[350px] lg:w-[400px]">
          <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Order Summary
            </h2>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="max-w-[80%] max-h-[80%] object-contain" />
                    ) : (
                      <span className="text-xl">{item.emoji}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
                    <p className="text-muted-foreground text-xs mt-1">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-medium text-sm">
                    {item.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-success font-medium">Free</span>
              </div>
              <div className="pt-4 border-t border-border flex justify-between">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </MainLayout>
  );
};

export default Prebook;
