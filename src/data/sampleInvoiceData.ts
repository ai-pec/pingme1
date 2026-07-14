import { InvoiceData, InvoiceItem, computeLineItem, computeTotals } from "@/lib/invoiceUtils";

const lineItems: InvoiceItem[] = [
  computeLineItem(
    {
      name: "Premium Smart NFC Card",
      description: "Custom premium NFC card with buyer details and QR link",
      quantity: 2,
      grossAmount: 799.0,
      discount: 80.0,
    },
    18,
    true,
  ),
  computeLineItem(
    {
      name: "Personalised NFC Tag Kit",
      description: "Gift-ready NFC tag kit for instant sharing",
      quantity: 1,
      grossAmount: 499.0,
      discount: 40.0,
    },
    18,
    true,
  ),
];

export const sampleInvoiceData: InvoiceData = {
  company: {
    name: "Ping IFF LLP",
    addressLines: [
      "745, First Floor, Rani Boutique",
      "Kesho Ram Complex, Near By Ram Electricals",
      "Sector 45, Burail",
      "Chandigarh, Chandigarh, 160047, India",
    ],
    gstin: "04ABGF35925N1ZU",
    pan: "ABGFP5925N",
    cin: "ACL-0255",
  },
  invoiceNumber: "#PM10524",
  invoiceType: "Tax Invoice",
  orderId: "ORD-759321",
  invoiceDate: new Date().toISOString(),
  orderDate: new Date().toISOString(),
  billingCountry: "India",
  currency: "INR",
  locale: "en-IN",
  paymentMode: "UPI",
  qrCodeUrl: "https://via.placeholder.com/104?text=QR",
  billTo: {
    name: "Mr. Arun Sharma",
    addressLines: [
      "A-204, Silver Oaks Apartments",
      "Sector 50, Chandigarh",
      "India - 160047",
    ],
    gstin: "03AAACF1234Q1Z0",
  },
  shipTo: {
    name: "Mr. Arun Sharma",
    addressLines: [
      "A-204, Silver Oaks Apartments",
      "Sector 50, Chandigarh",
      "India - 160047",
    ],
    gstin: "03AAACF1234Q1Z0",
  },
  items: lineItems,
  totals: computeTotals(lineItems),
  notes: [
    "Invoice generated electronically and does not require a signature.",
    "Goods once sold will not be taken back unless defective.",
  ],
  footer: {
    authorizedSignatory: "Ping IFF LLP",
  },
  contact: {
    phone: "+91 98765 43210",
    email: "support@pingiff.com",
    bankDetails: "UPI: pingiff@bank | Netbanking: AXISBANK0001 | Cash accepted",
  },
  returnPolicy: "Return requests accepted within 7 days on manufacturing defects only. Please keep original packaging.",
  authorizedSignatory: "Ping IFF LLP",
};
