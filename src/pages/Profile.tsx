import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  User,
  Phone,
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  MapPin,
  CreditCard,
  Edit2,
  RefreshCw,
  Lock,
  ShoppingBag,
  Package,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { State, City } from "country-state-city";
import { useAuth } from "@/contexts/AuthContext";
import {
  profileSchema,
  addressSchema,
  emailChangeSchema,
  type ProfileFormData,
  type AddressFormData,
  type EmailChangeFormData,
} from "@/lib/validations/auth";
import MainLayout from "@/layouts/MainLayout";
import { toast } from "sonner";
import { getUserPrebookings, type PrebookingRecord } from "@/lib/prebookService";

export default function Profile() {
  const {
    user,
    profile,
    updateProfile,
    updateAddresses,
    changeUserEmail,
    resendVerification,
    refreshProfile,
  } = useAuth();

  const [profileLoading, setProfileLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [orders, setOrders] = useState<PrebookingRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.displayName || user?.displayName || "",
      mobile: profile?.mobile || "",
    },
  });

  // Address form (for adding new addresses)
  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      pincode: "",
      country: "India",
      state: "",
      city: "",
      fullAddress: "",
      landmark: "",
    },
  });

  // Email change form
  const emailForm = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: "",
      password: "",
    },
  });

  const watchStateName = addressForm.watch("state");
  const inStates = State.getStatesOfCountry("IN");
  const selectedStateObj = inStates.find((s: any) => s.name === watchStateName);
  const cities = selectedStateObj ? City.getCitiesOfState("IN", selectedStateObj.isoCode) : [];

  // Update form values when profile loads
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        displayName: profile.displayName || "",
        mobile: profile.mobile || "",
      });
    }
  }, [profile]);

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (user?.uid) {
        setOrdersLoading(true);
        const results = await getUserPrebookings({
          userId: user.uid,
          email: user.email || undefined,
        });
        setOrders(results);
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [user?.uid, user?.email]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setProfileLoading(true);
      await updateProfile(data);
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const onAddressSubmit = async (data: AddressFormData) => {
    try {
      setAddressLoading(true);
      const newAddress = { 
        id: crypto.randomUUID(), 
        pincode: data.pincode,
        country: data.country,
        state: data.state,
        city: data.city,
        fullAddress: data.fullAddress,
        landmark: data.landmark || ""
      } as any; // Cast as any or DeliveryAddress based on types
      const currentAddresses = profile?.addresses || [];
      await updateAddresses([...currentAddresses, newAddress]);
      toast.success("Address saved successfully!");
      addressForm.reset();
    } catch {
      toast.error("Failed to save address. Please try again.");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResending(true);
      await resendVerification();
      toast.success("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification email.");
    } finally {
      setResending(false);
    }
  };

  const onEmailSubmit = async (data: EmailChangeFormData) => {
    try {
      setEmailLoading(true);
      await changeUserEmail(data.password, data.newEmail);
      toast.success("Email changed! Please verify your new email address.");
      setEmailDialogOpen(false);
      emailForm.reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to change email.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRefreshVerification = async () => {
    try {
      setRefreshing(true);
      await refreshProfile();
      if (user?.emailVerified) {
        toast.success("Email verified successfully!");
      } else {
        toast.info("Email not yet verified. Please check your inbox.");
      }
    } catch {
      toast.error("Failed to check verification status.");
    } finally {
      setRefreshing(false);
    }
  };

  if (!user || !profile) {
    return (
      <MainLayout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Profile Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account information and delivery preferences
            </p>
          </div>

          {/* Email Verification Banner */}
          {!user.emailVerified && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-900">
                      Verify your email
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Please verify your email address ({user.email}) to access
                      all features.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resending}
                      >
                        {resending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Resend email
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshVerification}
                        disabled={refreshing}
                      >
                        {refreshing && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <RefreshCw className="mr-2 h-4 w-4" />
                        I've verified
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your name and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="displayName"
                        placeholder="Your name"
                        className="pl-10"
                        {...profileForm.register("displayName")}
                      />
                    </div>
                    {profileForm.formState.errors.displayName && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="9876543210"
                        className="pl-10"
                        {...profileForm.register("mobile")}
                      />
                    </div>
                    {profileForm.formState.errors.mobile && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.mobile.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      profileLoading || !profileForm.formState.isDirty
                    }
                  >
                    {profileLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Manage your email address and verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {user.emailVerified ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700"
                        >
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Not verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!user.emailVerified && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResendVerification}
                      disabled={resending}
                    >
                      {resending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Verify Email
                    </Button>
                  )}
                  {profile.authProvider === "email" && (
                    <Dialog
                      open={emailDialogOpen}
                      onOpenChange={setEmailDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit2 className="mr-2 h-4 w-4" />
                          Change email
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change email address</DialogTitle>
                          <DialogDescription>
                            Enter your new email address and current password.
                            You'll need to verify your new email.
                          </DialogDescription>
                        </DialogHeader>
                        <form
                          onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                          className="space-y-4 mt-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="newEmail">New Email Address</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="newEmail"
                                type="email"
                                placeholder="newemail@example.com"
                                className="pl-10"
                                {...emailForm.register("newEmail")}
                              />
                            </div>
                            {emailForm.formState.errors.newEmail && (
                              <p className="text-sm text-destructive">
                                {emailForm.formState.errors.newEmail.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="password">Current Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                className="pl-10"
                                {...emailForm.register("password")}
                              />
                            </div>
                            {emailForm.formState.errors.password && (
                              <p className="text-sm text-destructive">
                                {emailForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEmailDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={emailLoading}>
                              {emailLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Change email
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {!user.emailVerified && (
                <p className="text-sm text-muted-foreground">
                  A verification email will be sent from{" "}
                  <span className="font-medium">contact@pingiff.ai</span>. Check
                  your spam folder if you don't see it.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Saved Delivery Addresses
              </CardTitle>
              <CardDescription>
                Manage your delivery addresses for quick checkout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* List of existing addresses */}
              <div className="space-y-4 mb-8">
                {profile.addresses && profile.addresses.length > 0 ? (
                  profile.addresses.map((addr) => (
                    <div key={addr.id} className="p-4 border border-border rounded-xl flex justify-between items-start bg-card">
                      <div>
                        <p className="font-medium text-sm mb-1">{addr.fullAddress}</p>
                        <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                        {addr.landmark && <p className="text-sm text-muted-foreground mt-1">Landmark: {addr.landmark}</p>}
                        <p className="text-sm text-muted-foreground">{addr.country}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={async () => {
                          const updated = profile.addresses!.filter(a => a.id !== addr.id);
                          try {
                            await updateAddresses(updated);
                            toast.success("Address deleted");
                          } catch {
                            toast.error("Failed to delete address");
                          }
                        }} 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-xl bg-secondary/20">
                    <p className="text-sm text-muted-foreground">No saved addresses found.</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="font-medium mb-4">Add New Address</h3>
                <form
                  onSubmit={addressForm.handleSubmit(onAddressSubmit)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        placeholder="110001"
                        maxLength={6}
                        {...addressForm.register("pincode")}
                      />
                      {addressForm.formState.errors.pincode && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.pincode.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        placeholder="India"
                        {...addressForm.register("country")}
                      />
                      {addressForm.formState.errors.country && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.country.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Select
                        value={watchStateName || ""}
                        onValueChange={(val) => {
                          addressForm.setValue("state", val, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          addressForm.setValue("city", "", {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                      >
                        <SelectTrigger id="state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {inStates.map((state: any) => (
                            <SelectItem key={state.isoCode} value={state.name}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {addressForm.formState.errors.state && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.state.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Select
                        value={addressForm.watch("city") || ""}
                        onValueChange={(val) => {
                          addressForm.setValue("city", val, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        disabled={!watchStateName || cities.length === 0}
                      >
                        <SelectTrigger id="city">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {cities.map((city: any) => (
                            <SelectItem key={city.name} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {addressForm.formState.errors.city && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.city.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullAddress">Full Address *</Label>
                    <Textarea
                      id="fullAddress"
                      placeholder="House/Flat No., Building, Street, Area"
                      rows={3}
                      {...addressForm.register("fullAddress")}
                    />
                    {addressForm.formState.errors.fullAddress && (
                      <p className="text-sm text-destructive">
                        {addressForm.formState.errors.fullAddress.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="landmark">Landmark (Optional)</Label>
                    <Input
                      id="landmark"
                      placeholder="Near metro station, opposite mall, etc."
                      {...addressForm.register("landmark")}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={addressLoading || !addressForm.formState.isDirty}
                    >
                      {addressLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Address
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Orders & Pre-bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Orders & Pre-bookings
              </CardTitle>
              <CardDescription>
                Track your orders and pre-booking status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">No orders yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Your pre-bookings and orders will appear here once you place them.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-border rounded-xl p-4 bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="text-xs font-mono text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            order.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {order.status === 'confirmed' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {order.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      
                      {/* Items */}
                      <div className="space-y-2 mb-3">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center gap-3 text-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-md border border-border bg-secondary/40 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-contain"
                                  />
                                ) : item.emoji ? (
                                  <span className="text-base">{item.emoji}</span>
                                ) : (
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-foreground truncate">
                                {item.title} <span className="text-muted-foreground">× {item.quantity}</span>
                              </span>
                            </div>
                            <span className="font-medium">{item.price}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total & Address */}
                      <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                        <div className="text-xs text-muted-foreground">
                          <MapPin className="inline w-3 h-3 mr-1" />
                          {order.address}, {order.city}, {order.state} – {order.pincode}
                        </div>
                        <span className="font-bold text-lg text-primary">₹{order.totalAmount?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Saved Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your saved cards for quick checkout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium">No saved cards</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Your payment methods will appear here after you complete your
                  first purchase. Payment gateway coming soon.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Details about your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Sign-in method</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.authProvider === "google"
                      ? "Google Account"
                      : "Email & Password"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
