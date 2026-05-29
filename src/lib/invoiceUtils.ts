import type { PrebookingData } from "@/lib/prebookService";

export interface InvoiceCompanyDetails {
  name: string;
  addressLines: string[];
  gstin: string;
  pan: string;
  cin: string;
}

export interface InvoiceParty {
  name: string;
  addressLines: string[];
  gstin?: string;
}

export interface InvoiceItem {
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  grossAmount: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoiceTotals {
  totalQuantity: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
}

export interface InvoiceContact {
  phone: string;
  email: string;
  bankDetails?: string;
}

export interface InvoiceFooter {
  authorizedSignatory: string;
}

const escapePdf = (value: string): string =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");

const pdfText = (text: string, x: number, y: number, fontSize = 10) =>
  `BT /F1 ${fontSize} Tf ${x} ${y} Td (${escapePdf(text)}) Tj ET`;

const buildPdfPageContent = (invoice: InvoiceData): string[] => {
  const lines: string[] = [];
  let y = 820;

  lines.push(pdfText(invoice.company.name, 40, y, 14));
  y -= 18;
  invoice.company.addressLines.forEach((line) => {
    lines.push(pdfText(line, 40, y, 9));
    y -= 12;
  });
  y -= 8;
  lines.push(pdfText(`GSTIN: ${invoice.company.gstin}`, 40, y, 8));
  y -= 10;
  lines.push(pdfText(`PAN: ${invoice.company.pan}`, 40, y, 8));
  y -= 10;
  lines.push(pdfText(`CIN: ${invoice.company.cin}`, 40, y, 8));

  const rightX = 330;
  y = 820;
  lines.push(pdfText(`Invoice No: ${invoice.invoiceNumber}`, rightX, y, 10));
  y -= 12;
  lines.push(pdfText(`Invoice Date: ${invoice.invoiceDate}`, rightX, y, 10));
  y -= 12;
  lines.push(pdfText(`Order ID: ${invoice.orderId}`, rightX, y, 10));
  y -= 12;
  lines.push(pdfText(`Order Date: ${invoice.orderDate}`, rightX, y, 10));
  y -= 12;
  lines.push(pdfText(`Payment Mode: ${invoice.paymentMode}`, rightX, y, 10));
  y -= 20;

  lines.push(pdfText(invoice.invoiceType.toUpperCase(), 220, 760, 12));
  y = 730;

  lines.push(pdfText("Bill To:", 40, y, 10));
  invoice.billTo.addressLines.forEach((line) => {
    y -= 12;
    lines.push(pdfText(line, 40, y, 9));
  });
  if (invoice.billTo.gstin) {
    y -= 12;
    lines.push(pdfText(`GSTIN: ${invoice.billTo.gstin}`, 40, y, 9));
  }

  let shipY = 730;
  lines.push(pdfText("Ship To:", 280, shipY, 10));
  invoice.shipTo.addressLines.forEach((line) => {
    shipY -= 12;
    lines.push(pdfText(line, 280, shipY, 9));
  });
  if (invoice.shipTo.gstin) {
    shipY -= 12;
    lines.push(pdfText(`GSTIN: ${invoice.shipTo.gstin}`, 280, shipY, 9));
  }

  y = 620;
  lines.push(pdfText("Product", 40, y, 9));
  lines.push(pdfText("Qty", 210, y, 9));
  lines.push(pdfText("Gross", 245, y, 9));
  lines.push(pdfText("Discount", 295, y, 9));
  lines.push(pdfText("Taxable", 360, y, 9));
  lines.push(pdfText("CGST", 420, y, 9));
  lines.push(pdfText("SGST", 470, y, 9));
  lines.push(pdfText("IGST", 520, y, 9));
  lines.push(pdfText("Total", 560, y, 9));

  y -= 16;
  invoice.items.forEach((item) => {
    const name = item.name.length > 30 ? `${item.name.slice(0, 30)}...` : item.name;
    lines.push(pdfText(name, 40, y, 8));
    lines.push(pdfText(String(item.quantity), 210, y, 8));
    lines.push(pdfText(item.grossAmount.toFixed(2), 245, y, 8));
    lines.push(pdfText(item.discount.toFixed(2), 295, y, 8));
    lines.push(pdfText(item.taxableValue.toFixed(2), 360, y, 8));
    lines.push(pdfText(item.cgst.toFixed(2), 420, y, 8));
    lines.push(pdfText(item.sgst.toFixed(2), 470, y, 8));
    lines.push(pdfText(item.igst.toFixed(2), 520, y, 8));
    lines.push(pdfText(item.total.toFixed(2), 560, y, 8));
    y -= 16;
  });

  y -= 14;
  lines.push(pdfText(`Total Qty: ${invoice.totals.totalQuantity}`, 40, y, 9));
  y -= 12;
  lines.push(pdfText(`Taxable Value: ${invoice.totals.totalTaxableValue.toFixed(2)}`, 40, y, 9));
  y -= 12;
  lines.push(pdfText(`Total CGST: ${invoice.totals.totalCgst.toFixed(2)}`, 40, y, 9));
  y -= 12;
  lines.push(pdfText(`Total SGST: ${invoice.totals.totalSgst.toFixed(2)}`, 40, y, 9));
  y -= 12;
  lines.push(pdfText(`Total IGST: ${invoice.totals.totalIgst.toFixed(2)}`, 40, y, 9));

  y -= 22;
  lines.push(pdfText(`Grand Total: ${invoice.locale === "en-IN" ? "INR " : ""}${invoice.totals.grandTotal.toFixed(2)}`, 360, y, 11));

  y -= 30;
  lines.push(pdfText(`Authorised Signatory: ${invoice.authorizedSignatory}`, 40, y, 9));
  y -= 16;
  lines.push(pdfText(`Contact: ${invoice.contact.phone} | ${invoice.contact.email}`, 40, y, 9));
  y -= 12;
  lines.push(pdfText(invoice.returnPolicy, 40, y, 8));

  return lines;
};

export const buildInvoicePdfBlob = (invoice: InvoiceData): Blob => {
  const content = buildPdfPageContent(invoice).join("\n");
  const encoder = new TextEncoder();
  const contentLength = encoder.encode(content).length;
  const objects = [
    "%PDF-1.3\n",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let offset = 0;
  const xref = ["xref\n0 6\n0000000000 65535 f \n"];
  for (const obj of objects) {
    xref.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
    offset += encoder.encode(obj).length;
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  const pdf = objects.join("") + xref.join("") + trailer;
  return new Blob([pdf], { type: "application/pdf" });
};

export interface InvoiceData {
  company: InvoiceCompanyDetails;
  invoiceNumber: string;
  invoiceType: string;
  orderId: string;
  invoiceDate: string;
  orderDate: string;
  billingCountry: string;
  currency: string;
  locale: string;
  paymentMode: string;
  qrCodeUrl: string;
  billTo: InvoiceParty;
  shipTo: InvoiceParty;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  notes: string[];
  footer: InvoiceFooter;
  contact: InvoiceContact;
  returnPolicy: string;
  authorizedSignatory: string;
}

export interface TaxBreakdown {
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxableValue: number;
  totalTax: number;
}

export const formatCurrency = (value: number, currency: string, locale = "en-IN") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (value: string, locale = "en-IN") => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const parseNumericValue = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  return fallback;
};

export const calculateGstSplit = (taxableValue: number, gstRate: number): TaxBreakdown => {
  const totalTax = (taxableValue * gstRate) / 100;
  const halfTax = totalTax / 2;
  return {
    gstRate,
    cgst: Number(halfTax.toFixed(2)),
    sgst: Number(halfTax.toFixed(2)),
    igst: 0,
    taxableValue: Number(taxableValue.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
  };
};

export const calculateIgst = (taxableValue: number, gstRate: number): TaxBreakdown => {
  const totalTax = (taxableValue * gstRate) / 100;
  return {
    gstRate,
    cgst: 0,
    sgst: 0,
    igst: Number(totalTax.toFixed(2)),
    taxableValue: Number(taxableValue.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
  };
};

export const computeLineItem = (
  item: Omit<InvoiceItem, "taxableValue" | "cgst" | "sgst" | "igst" | "total">,
  taxRate: number,
  inIndia: boolean,
): InvoiceItem => {
  const grossAmount = parseNumericValue(item.grossAmount);
  const discount = parseNumericValue(item.discount);
  const taxableValue = Number((grossAmount - discount).toFixed(2));

  const taxBreakdown = inIndia
    ? calculateGstSplit(taxableValue, taxRate)
    : calculateIgst(taxableValue, taxRate);

  const total = Number((taxableValue + taxBreakdown.totalTax).toFixed(2));

  return {
    ...item,
    grossAmount,
    discount,
    taxableValue,
    cgst: taxBreakdown.cgst,
    sgst: taxBreakdown.sgst,
    igst: taxBreakdown.igst,
    total,
  };
};

export const computeTotals = (items: InvoiceItem[]): InvoiceTotals => {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalQuantity += item.quantity;
      acc.totalTaxableValue += item.taxableValue;
      acc.totalCgst += item.cgst;
      acc.totalSgst += item.sgst;
      acc.totalIgst += item.igst;
      acc.grandTotal += item.total;
      return acc;
    },
    {
      totalQuantity: 0,
      totalTaxableValue: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      grandTotal: 0,
    } as InvoiceTotals,
  );

  return {
    totalQuantity: totals.totalQuantity,
    totalTaxableValue: Number(totals.totalTaxableValue.toFixed(2)),
    totalCgst: Number(totals.totalCgst.toFixed(2)),
    totalSgst: Number(totals.totalSgst.toFixed(2)),
    totalIgst: Number(totals.totalIgst.toFixed(2)),
    grandTotal: Number(totals.grandTotal.toFixed(2)),
  };
};

export const buildInvoiceDataFromPrebooking = (
  prebooking: PrebookingData,
  options?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    billingCountry?: string;
    paymentMode?: string;
    qrCodeUrl?: string;
    locale?: string;
  },
): InvoiceData => {
  const invoiceNumber = options?.invoiceNumber || `#PM${Date.now()}`;
  const invoiceDate = options?.invoiceDate || new Date().toISOString();
  const billingCountry = options?.billingCountry || "India";
  const locale = options?.locale || "en-IN";
  const currency = prebooking.payment?.currency || "INR";
  const inIndia = /india/i.test(billingCountry);

  const items: InvoiceItem[] = prebooking.items.map((item) => {
    const grossAmount = parseNumericValue(item.price);
    const originalPrice = item.originalPrice ? parseNumericValue(item.originalPrice) : grossAmount;
    const discount = Number((originalPrice - grossAmount).toFixed(2));
    const taxRate = 18;
    const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1;

    return computeLineItem(
      {
        name: item.title,
        description: item.emoji || undefined,
        quantity,
        grossAmount,
        discount,
      },
      taxRate,
      inIndia,
    );
  });

  return {
    company: {
      name: "Ping IFF LLP",
      addressLines: [
        "745, Street No. 8,",
        "Keshoram Complex Burail,",
        "Sector 45C Chandigarh (160047)",
        "INDIA",
      ],
      gstin: "04ABGF35925N1ZU",
      pan: "ABGFP5925N",
      cin: "ACL-0255",
    },
    invoiceNumber,
    invoiceType: "Tax Invoice",
    orderId: prebooking.payment?.orderId || invoiceNumber,
    invoiceDate,
    orderDate: prebooking.payment?.paidAt || invoiceDate,
    billingCountry,
    currency,
    locale,
    paymentMode: options?.paymentMode || "Online / UPI",
    qrCodeUrl: options?.qrCodeUrl || "https://via.placeholder.com/104?text=QR",
    billTo: {
      name: prebooking.fullName,
      addressLines: [
        prebooking.address,
        `${prebooking.city}, ${prebooking.state} - ${prebooking.pincode}`,
      ],
      gstin: "",
    },
    shipTo: {
      name: prebooking.fullName,
      addressLines: [
        prebooking.address,
        `${prebooking.city}, ${prebooking.state} - ${prebooking.pincode}`,
      ],
      gstin: "",
    },
    items,
    totals: computeTotals(items),
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
    returnPolicy:
      "Return requests accepted within 7 days on manufacturing defects only. Please keep original packaging.",
    authorizedSignatory: "Ping IFF LLP",
  };
};
