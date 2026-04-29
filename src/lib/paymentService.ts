import { auth } from "@/lib/firebase";
import type { PrebookingData } from "@/lib/prebookService";

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  keyId?: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  prebookingId: string;
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
    };
  }
}

const RAZORPAY_SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

const getPaymentApiBaseUrl = () => {
  const base = import.meta.env.VITE_PAYMENT_API_BASE_URL;
  return typeof base === "string" ? base.replace(/\/$/, "") : "";
};

export const loadRazorpayCheckoutScript = async (): Promise<void> => {
  if (window.Razorpay) return;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout SDK."));
    document.body.appendChild(script);
  });
};

export const createRazorpayOrder = async (input: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResponse> => {
  const baseUrl = getPaymentApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Payment API is not configured. Add VITE_PAYMENT_API_BASE_URL to your env.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to create an order.");
  }

  const idToken = await currentUser.getIdToken();

  const res = await fetch(`${baseUrl}/createOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create payment order.");
  }

  return (await res.json()) as CreateOrderResponse;
};

export const verifyRazorpayPaymentAndCreatePrebooking = async (input: {
  orderId: string;
  paymentId: string;
  signature: string;
  prebooking: PrebookingData;
}): Promise<VerifyPaymentResponse> => {
  const baseUrl = getPaymentApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Payment API is not configured. Add VITE_PAYMENT_API_BASE_URL to your env.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to verify payment.");
  }

  const idToken = await currentUser.getIdToken();

  const res = await fetch(`${baseUrl}/verifyPayment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Payment verification failed.");
  }

  return (await res.json()) as VerifyPaymentResponse;
};

export const openRazorpayCheckout = async (input: {
  keyId?: string;
  orderId: string;
  amount: number;
  currency: string;
  fullName: string;
  email: string;
  phone: string;
  onSuccess: (response: RazorpayHandlerResponse) => Promise<void>;
  onDismiss?: () => void;
}): Promise<void> => {
  const keyId = input.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error("VITE_RAZORPAY_KEY_ID is missing.");
  }

  await loadRazorpayCheckoutScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay checkout failed to initialize.");
  }

  const rzp = new window.Razorpay({
    key: keyId,
    amount: input.amount,
    currency: input.currency,
    name: "PingME",
    description: "PingME Pre-booking Payment",
    order_id: input.orderId,
    handler: (response) => {
      void input.onSuccess(response);
    },
    prefill: {
      name: input.fullName,
      email: input.email,
      contact: input.phone,
    },
    notes: {
      source: "pingme-prebook",
    },
    theme: {
      color: "#f4c300",
    },
    modal: {
      ondismiss: input.onDismiss,
    },
  });

  rzp.open();
};
