import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ShoppingBag, MapPin, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import NFCProfileBuilder, { NFCProfileData } from "@/components/NFCProfileBuilder";
import {
  createRazorpayOrder,
  downloadReceipt,
  openRazorpayCheckout,
  deleteNfcProfileDraft,
  verifyRazorpayPaymentAndCreatePrebooking,
} from "@/lib/paymentService";
import type { PrebookingData } from "@/lib/prebookService";
import { resolveProductImageUrl } from "@/lib/productCatalog";
import { checkUsernameUniqueness, generateUsernameSuggestions } from "@/lib/publicNfcService";
import {
  expandNfcCartUnits,
  getNfcProfileDocId,
  isNfcLineProfileComplete,
  isNfcCartItem,
} from "@/lib/nfcCheckout";
import type { DeliveryAddress } from "@/types/user";

const indianStates = [
  "Chandigarh", "New Delhi", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
  "Jammu & Kashmir", "Ladakh",
];

const emptyNfcProfile = (): NFCProfileData => ({
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

const Prebook = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, cartTotal, clearCart } = useCart();
  const { user, profile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [step, setStep] = useState<"delivery" | "profileHub" | "profileEdit">("delivery");
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const [nfcProfilesByLine, setNfcProfilesByLine] = useState<Record<string, NFCProfileData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<PrebookingData | null>(null);
  const [invoiceEmail, setInvoiceEmail] = useState("");

  const nfcCartUnits = useMemo(() => expandNfcCartUnits(items), [items]);
  const hasNFCCards = nfcCartUnits.length > 0;
  const showProfileBuilding = hasNFCCards;
  const activeUnit = nfcCartUnits.find((u) => u.lineKey === activeLineKey);

  const allNfcProfilesComplete = nfcCartUnits.every((unit) =>
    isNfcLineProfileComplete(nfcProfilesByLine[unit.lineKey])
  );

  useEffect(() => {
    if (profile) {
      if (profile.displayName && !fullName) {
        setFullName(profile.displayName);
      }
      if (profile.email && !email) {
        setEmail(profile.email);
      }
      if (profile.mobile && !phone) {
        setPhone(profile.mobile);
      }
    }
  }, [profile, fullName, email, phone]);

  const seedLineProfile = (
    lineKey: string,
    unitIndex: number,
    deliveryName: string,
    deliveryEmail: string,
    deliveryPhone: string
  ): NFCProfileData => {
    const baseUsername = deliveryName.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
    const usernameSuffix = unitIndex > 0 ? String(unitIndex + 1) : "";
    return {
      ...emptyNfcProfile(),
      name: deliveryName.trim(),
      email: deliveryEmail.trim(),
      phone: deliveryPhone.trim(),
      username: `${baseUsername}${usernameSuffix}`,
    };
  };

  const handleApplySavedAddress = (savedAddr: DeliveryAddress) => {
    setAddress(savedAddr.fullAddress || "");
    setCity(savedAddr.city || "");
    setState(savedAddr.state || "");
    setPincode(savedAddr.pincode || "");
    toast({ title: "Address Applied", description: "Your saved address has been loaded." });
  };

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

    if (showProfileBuilding) {
      const deliveryName = fullName.trim();
      const deliveryEmail = email.trim();
      const deliveryPhone = phone.trim();

      setNfcProfilesByLine((prev) => {
        const next = { ...prev };
        nfcCartUnits.forEach((unit) => {
          if (!next[unit.lineKey]) {
            next[unit.lineKey] = seedLineProfile(
              unit.lineKey,
              unit.unitIndex,
              deliveryName,
              deliveryEmail,
              deliveryPhone
            );
          } else {
            next[unit.lineKey] = {
              ...next[unit.lineKey],
              name: next[unit.lineKey].name || deliveryName,
              email: next[unit.lineKey].email || deliveryEmail,
              phone: next[unit.lineKey].phone || deliveryPhone,
            };
          }
        });
        return next;
      });
      setStep("profileHub");
    } else {
      handlePayment(fullName.trim(), email.trim(), phone.trim());
    }
  };

  const openProfileEditor = (lineKey: string) => {
    const unit = nfcCartUnits.find((u) => u.lineKey === lineKey);
    if (!unit) return;

    setNfcProfilesByLine((prev) => {
      if (prev[lineKey]) return prev;
      return {
        ...prev,
        [lineKey]: seedLineProfile(
          lineKey,
          unit.unitIndex,
          fullName.trim(),
          email.trim(),
          phone.trim()
        ),
      };
    });
    setActiveLineKey(lineKey);
    setStep("profileEdit");
  };

  const handleProfileEditContinue = () => {
    if (!activeLineKey) return;
    const lineProfile = nfcProfilesByLine[activeLineKey];
    if (!isNfcLineProfileComplete(lineProfile)) {
      return;
    }
    setActiveLineKey(null);
    setStep("profileHub");
  };

  const handlePayment = async (deliveryFullName: string, deliveryEmail: string, deliveryPhone: string) => {
    if (showProfileBuilding && !allNfcProfilesComplete) {
      toast({
        title: "Profiles incomplete",
        description: "Please set up a profile for each NFC card before paying.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    if (showProfileBuilding) {
      const usernames = nfcCartUnits
        .map((unit) => nfcProfilesByLine[unit.lineKey]?.username?.trim().toLowerCase())
        .filter(Boolean) as string[];

      if (new Set(usernames).size !== usernames.length) {
        toast({
          title: "Duplicate usernames",
          description: "Each NFC card needs a unique username. Please update the duplicate profiles.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
    }

    try {
      const nfcLineProfiles = showProfileBuilding
        ? nfcCartUnits.map((unit) => ({
            lineKey: unit.lineKey,
            itemId: unit.itemId,
            title: unit.title,
            nfcProfile: nfcProfilesByLine[unit.lineKey],
          }))
        : undefined;

      const prebookingPayload: PrebookingData = {
        items,
        totalAmount: cartTotal,
        fullName: deliveryFullName,
        email: deliveryEmail,
        phone: deliveryPhone,
        address: address.trim(),
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        status: "confirmed",
        userId: user?.uid,
        ...(nfcLineProfiles ? { nfcLineProfiles } : {}),
        ...(nfcCartUnits.length === 1 && nfcLineProfiles
          ? { nfcProfile: nfcProfilesByLine[nfcCartUnits[0].lineKey] }
          : {}),
      };

      const order = await createRazorpayOrder({
        amount: Math.round(cartTotal * 100),
        currency: "INR",
        receipt: `pingme_${Date.now()}`,
        notes: {
          userId: user?.uid || "guest",
        },
      });

      if (showProfileBuilding) {
        for (const unit of nfcCartUnits) {
          const lineProfile = nfcProfilesByLine[unit.lineKey];
          if (!lineProfile?.username) continue;

          try {
            const profileDocId = getNfcProfileDocId(order.orderId, unit.lineKey);
            const isTaken = await checkUsernameUniqueness(lineProfile.username, profileDocId);
            if (isTaken) {
              const suggestions = await generateUsernameSuggestions(
                lineProfile.name || lineProfile.username
              );
              toast({
                title: `Username taken (${unit.displayTitle})`,
                description: `This username is already taken. Try: ${suggestions.join(", ")}`,
                variant: "destructive",
              });
              setSubmitting(false);
              return;
            }
          } catch (error: unknown) {
            console.error("Username verification error:", error);
            toast({
              title: "Verification failed",
              description: "Could not verify username. Please try again.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }
        }
      }

      await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        fullName: deliveryFullName,
        email: deliveryEmail,
        phone: deliveryPhone,
        onSuccess: async (paymentResponse) => {
          try {
            const completedPrebooking: PrebookingData = {
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
            };

            await verifyRazorpayPaymentAndCreatePrebooking({
              orderId: paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              prebooking: completedPrebooking,
            });

            setReceiptOrder(completedPrebooking);
            setInvoiceEmail(deliveryEmail);
            setSuccess(true);
            clearCart();
          } catch (verifyErr: unknown) {
            const verifyMessage =
              verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.";
            toast({
              title: "Payment verification failed",
              description: verifyMessage,
              variant: "destructive",
            });
            navigate("/booking");
          } finally {
            setSubmitting(false);
          }
        },
        onDismiss: () => {
          if (showProfileBuilding) {
            for (const unit of nfcCartUnits) {
              void deleteNfcProfileDraft(getNfcProfileDocId(order.orderId, unit.lineKey)).catch(
                (cleanupError: unknown) => {
                  console.error("Failed to delete NFC draft after payment cancel", cleanupError);
                }
              );
            }
          }
          setSubmitting(false);
          toast({
            title: "Payment cancelled",
            description: "You can retry payment whenever you are ready.",
            variant: "destructive",
          });
          navigate("/booking");
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
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground mb-2">
            Invoice will be sent to{" "}
            <span className="font-semibold">{invoiceEmail || email || "your email"}</span>.
          </p>
          <p className="text-muted-foreground mb-6">
            We'll reach out to you shortly with payment and delivery details.
          </p>

          {receiptOrder && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Button onClick={() => downloadReceipt(receiptOrder, invoiceEmail)}>
                Download Invoice
              </Button>
            </div>
          )}
          <div className="flex gap-3 justify-center mb-12">
            <Button onClick={() => navigate("/profile")}>View My Profile</Button>
            <Button variant="outline" onClick={() => navigate("/products")}>
              Continue Shopping
            </Button>
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
          <p className="text-muted-foreground mb-6">
            Looks like you haven't added anything to checkout yet.
          </p>
          <Button onClick={() => navigate("/products")}>Browse Products</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-12 max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          {step === "delivery" && (
            <>
              <h1 className="text-2xl font-bold mb-6">Checkout & Delivery Details</h1>

              {user && profile?.addresses && profile.addresses.length > 0 && (
                <div className="mb-8 p-4 bg-secondary/30 rounded-xl border border-border">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary" /> Use a Saved Address
                  </h3>
                  <div className="flex flex-col gap-2">
                    {profile.addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleApplySavedAddress(addr)}
                        className="text-left text-sm p-3 rounded-lg border border-border hover:border-primary transition-colors bg-card"
                      >
                        <span className="font-medium block">{addr.fullAddress}</span>
                        <span className="text-muted-foreground">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleDeliverySubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Input
                    id="address"
                    placeholder="House number, Street, Locality"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      placeholder="160012"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select State</option>
                    {indianStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full mt-6 h-12 text-base" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : showProfileBuilding ? (
                    "Continue to Profile Setup"
                  ) : (
                    `Pay ₹${cartTotal.toFixed(2)} & Confirm`
                  )}
                </Button>
              </form>
            </>
          )}

          {step === "profileHub" && (
            <>
              <button
                type="button"
                onClick={() => setStep("delivery")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Delivery Details
              </button>
              <h1 className="text-2xl font-bold mb-2">NFC Profile Setup</h1>
              <p className="text-muted-foreground mb-6">
                Set up a separate profile for each NFC card in your order. Each card gets its own
                public link.
              </p>

              <div className="space-y-4">
                {nfcCartUnits.map((unit) => {
                  const lineProfile = nfcProfilesByLine[unit.lineKey];
                  const isComplete = isNfcLineProfileComplete(lineProfile);

                  return (
                    <div
                      key={unit.lineKey}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{unit.displayTitle}</p>
                        {isComplete && lineProfile?.username && (
                          <p className="text-xs text-muted-foreground mt-1">
                            @{lineProfile.username}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className={
                            isComplete
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }
                        >
                          {isComplete ? "Ready" : "Pending"}
                        </Badge>
                        <Button
                          type="button"
                          variant={isComplete ? "outline" : "default"}
                          onClick={() => openProfileEditor(unit.lineKey)}
                        >
                          {isComplete
                            ? `Edit Profile`
                            : `Continue to Profile Setup for ${unit.title}`}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                className="w-full mt-8 h-12 text-base"
                disabled={submitting || !allNfcProfilesComplete}
                onClick={() => handlePayment(fullName.trim(), email.trim(), phone.trim())}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Pay ₹${cartTotal.toFixed(2)} & Confirm`
                )}
              </Button>
            </>
          )}

          {step === "profileEdit" && activeLineKey && activeUnit && (
            <NFCProfileBuilder
              profileData={nfcProfilesByLine[activeLineKey] || emptyNfcProfile()}
              onProfileChange={(data) =>
                setNfcProfilesByLine((prev) => ({ ...prev, [activeLineKey]: data }))
              }
              onBack={() => {
                setActiveLineKey(null);
                setStep("profileHub");
              }}
              onContinue={handleProfileEditContinue}
              isLoading={submitting}
              title={`Build Profile — ${activeUnit.displayTitle}`}
              description={`This profile will be embedded in your ${activeUnit.title}. Choose a unique username for this card.`}
              backLabel="Back to NFC Cards"
              continueLabel="Save & Return to Cards"
            />
          )}
        </div>

        <div className="w-[clamp(220px,50vw,400px)] mx-auto md:mx-0 md:w-[350px] lg:w-[400px]">
          <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Order Summary
            </h2>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                    {resolveProductImageUrl(item.image) ? (
                      <img
                        src={resolveProductImageUrl(item.image)}
                        alt={item.title}
                        className="max-w-[80%] max-h-[80%] object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-xl">{item.emoji}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
                    <p className="text-muted-foreground text-xs mt-1">Qty: {item.quantity}</p>
                    {isNfcCartItem(item) && step !== "delivery" && (
                      <p className="text-xs mt-1">
                        {expandNfcCartUnits([item]).map((unit) => {
                          const complete = isNfcLineProfileComplete(
                            nfcProfilesByLine[unit.lineKey]
                          );
                          return (
                            <span
                              key={unit.lineKey}
                              className={complete ? "text-green-600" : "text-amber-600"}
                            >
                              {unit.displayTitle}: {complete ? "Ready" : "Pending"}
                              {" · "}
                            </span>
                          );
                        })}
                      </p>
                    )}
                  </div>
                  <div className="font-medium text-sm">{item.price}</div>
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
