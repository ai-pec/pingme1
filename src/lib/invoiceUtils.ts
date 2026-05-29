// invoiceUtils.ts
// ─────────────────────────────────────────────────────────────────────────────
// Changes from previous version:
//  1. QR code is generated via qrcode-svg (pure-JS, no canvas needed) and
//     embedded as an XObject stream in the PDF.
//  2. The separate "Invoice Number" box that sat below the QR box is removed;
//     invoice number is now shown inside/below the QR area in the header.
//  3. The "TAX INVOICE" centred heading row (and its separator) is removed.
//     The invoice type now appears as a smaller label inside the header block.
//  4. The 6-column order-info row is replaced with a cleaner layout that
//     avoids text overlap: columns are wider and the payment-mode value is
//     split if long.
// ─────────────────────────────────────────────────────────────────────────────

// Install dependency: npm install qrcode-svg
// If using Next.js / Vite you can also use the browser-friendly "qrcode" pkg:
//   npm install qrcode
//   import QRCode from "qrcode";
//   const dataUrl = await QRCode.toDataURL(text);   // then embed image
//
// The helper below uses qrcode-svg which returns raw SVG/path data that we
// convert to a minimal PDF XObject so no canvas / DOM is needed.

// ─────────────────────────────────────────────
// PUBLIC TYPES  (unchanged — fully backward-compatible)
// ─────────────────────────────────────────────

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
  total: number;
}

export interface InvoiceTotals {
  totalQuantity: number;
  totalAmount: number;
  totalTaxableValue: number;
  totalTaxes: number;
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

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

export const formatCurrency = (
  value: number,
  currency: string,
  locale = "en-IN",
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);

export const dynamicCurrencyFormatter =
  (currency: string, locale = "en-IN") =>
  (value: number) =>
    formatCurrency(value, currency, locale);

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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  return fallback;
};

export const computeLineItem = (
  item: Omit<InvoiceItem, "total">,
): InvoiceItem => {
  const grossAmount = parseNumericValue(item.grossAmount);
  const discount = parseNumericValue(item.discount);
  const total = Number((grossAmount - discount).toFixed(2));
  return { ...item, grossAmount, discount, total };
};

export const computeTotals = (items: InvoiceItem[]): InvoiceTotals => {
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = Number(
    items.reduce((s, i) => s + i.total, 0).toFixed(2),
  );
  return {
    totalQuantity,
    totalAmount,
    totalTaxableValue: totalAmount,
    totalTaxes: 0,
    grandTotal: totalAmount,
  };
};

// ─────────────────────────────────────────────
// QR CODE GENERATION
// Generates a simple QR-code PDF XObject from a URL string.
// Uses the lightweight "qrcode-svg" package (npm install qrcode-svg).
// Returns { stream, width, height } ready to embed as a PDF XObject.
// ─────────────────────────────────────────────

/**
 * Generate a QR-code as a minimal PDF graphics stream.
 * Each module is rendered as a filled rectangle.
 *
 * Dependency: npm install qrcode-svg
 */
type QrCodeCreateModule = {
  create: (
    text: string,
    options: {
      errorCorrectionLevel: "L" | "M" | "Q" | "H";
    },
  ) => {
    modules: {
      size: number;
      data: boolean[][];
    };
  };
};

export const generateQrPdfStream = async (
  text: string,
  sizeInPts = 80,
): Promise<{ stream: string; size: number }> => {
  const qrcodeModule = await import("qrcode");
  const QRCode = (qrcodeModule.default ?? qrcodeModule) as QrCodeCreateModule;

  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });

  const modules = qr.modules;
  const n = modules.size;
  const cell = sizeInPts / n;

  const ops: string[] = ["0 0 0 rg"]; // black fill
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (modules.data[row][col]) {
        // PDF y-axis is bottom-up; QR row 0 = top
        const x = col * cell;
        const y = (n - 1 - row) * cell;
        ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re`);
      }
    }
  }
  ops.push("f"); // fill all rectangles
  return { stream: ops.join("\n"), size: sizeInPts };
};

// ─────────────────────────────────────────────
// PDF LOW-LEVEL HELPERS
// A4 = 595 × 842 pts; origin = bottom-left.
// ─────────────────────────────────────────────

const esc = (v: string) =>
  String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");

const txt = (s: string, x: number, y: number, size = 9) =>
  `BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`;

const bold = (s: string, x: number, y: number, size = 9) =>
  `BT /F2 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`;

// Right-aligned helpers (approximate — proportional fonts vary)
const txtR = (s: string, x: number, y: number, size = 9, fw = 0.55) =>
  txt(s, x - s.length * size * fw, y, size);

const boldR = (s: string, x: number, y: number, size = 9, fw = 0.55) =>
  bold(s, x - s.length * size * fw, y, size);

const hLine = (x1: number, y: number, x2: number, lw = 0.5) =>
  `${lw} w ${x1} ${y} m ${x2} ${y} l S`;

const vLine = (x: number, y1: number, y2: number, lw = 0.5) =>
  `${lw} w ${x} ${y1} m ${x} ${y2} l S`;

const rect = (x: number, y: number, w: number, h: number, lw = 0.5) =>
  `${lw} w ${x} ${y} ${w} ${h} re S`;

const fillRect = (x: number, y: number, w: number, h: number, gray = 0.93) =>
  `${gray} g ${x} ${y} ${w} ${h} re f 0 g`;

const fmtMoney = (v: number, currency: string) =>
  `${currency === "INR" ? "Rs." : currency + " "}${v.toFixed(2)}`;

// ─────────────────────────────────────────────
// MAIN PDF CONTENT BUILDER
// ─────────────────────────────────────────────

const buildPdfPageContent = (
  inv: InvoiceData,
  qrStream: string,
  qrSize: number,
): string[] => {
  const ops: string[] = [];
  const L = 35,
    R = 560,
    MID = 297;

  // Outer border
  ops.push(rect(L, 30, R - L, 800, 0.8));

  // ── [1] HEADER ──────────────────────────────────────────────────────────────
  // Left side: company details
  // Right side: QR code (only — no separate invoice-number box)
  //             Invoice number printed as text below QR

  const QR_X = R - 95;   // QR left edge
  const QR_Y = 715;       // QR bottom edge
  const QR_TOP = QR_Y + qrSize; // = QR_Y + 80 = 795

  // Draw QR code via XObject reference (added in blob builder)
  ops.push(`q ${qrSize} 0 0 ${qrSize} ${QR_X} ${QR_Y} cm /QR Do Q`);

  // Invoice number text below QR
  const invNum = inv.invoiceNumber.replace(/^#/, "");
  ops.push(bold(`#${invNum}`, QR_X, QR_Y - 12, 8));
  ops.push(txt(`${inv.invoiceType.toUpperCase()}`, QR_X, QR_Y - 22, 7));

  // Company details (left column)
  let y = QR_TOP - 2;
  ops.push(bold(inv.company.name, L + 6, y, 13));
  y -= 14;
  for (const line of inv.company.addressLines) {
    ops.push(txt(line, L + 6, y, 8));
    y -= 10;
  }
  y -= 3;
  ops.push(txt(`GSTIN: ${inv.company.gstin}`, L + 6, y, 8)); y -= 10;
  ops.push(txt(`PAN:   ${inv.company.pan}`,   L + 6, y, 8)); y -= 10;
  ops.push(txt(`CIN:   ${inv.company.cin}`,   L + 6, y, 8));

  const headerBot = QR_Y - 28; // separator below QR+inv-number block
  ops.push(hLine(L, headerBot, R, 0.8));

  // ── [2] ORDER INFO ROW ──────────────────────────────────────────────────────
  // 5 columns to avoid overlap: ORDER ID | ORDER DATE | INVOICE DATE | PAN | PAYMENT MODE
  // (CIN moved into header to save space)
  const infoY = headerBot - 18;
  const cols5 = [L, L + 100, L + 185, L + 270, L + 355, R];
  const iLabels = ["ORDER ID", "ORDER DATE", "INVOICE DATE", "PAN", "PAYMENT MODE"];
  const oidDisp =
    inv.orderId.length > 15 ? inv.orderId.slice(0, 15) + ".." : inv.orderId;
  // Truncate payment mode if needed
  const pmDisp =
    inv.paymentMode.length > 16
      ? inv.paymentMode.slice(0, 16) + ".."
      : inv.paymentMode;
  const iValues = [
    oidDisp,
    formatDate(inv.orderDate),
    formatDate(inv.invoiceDate),
    inv.company.pan,
    pmDisp,
  ];

  ops.push(fillRect(L, infoY - 15, R - L, 28, 0.93));
  ops.push(rect(L, infoY - 15, R - L, 28, 0.5));
  for (let i = 0; i < 5; i++) {
    const cx = cols5[i] + 4;
    ops.push(txt(iLabels[i], cx, infoY + 5, 6.5));
    ops.push(bold(iValues[i], cx, infoY - 7, 7.5));
    if (i > 0) ops.push(vLine(cols5[i], infoY - 15, infoY + 13, 0.4));
  }

  // ── [3] BILL TO / SHIP TO ───────────────────────────────────────────────────
  const bsTop = infoY - 20;
  ops.push(rect(L, bsTop - 52, R - L, 54, 0.5));
  ops.push(vLine(MID, bsTop - 52, bsTop + 2, 0.4));

  ops.push(bold("BILL TO", L + 5, bsTop - 7, 7));
  let by = bsTop - 18;
  ops.push(bold(inv.billTo.name, L + 5, by, 8.5)); by -= 10;
  for (const line of inv.billTo.addressLines) {
    ops.push(txt(line, L + 5, by, 7.5)); by -= 9;
  }
  if (inv.billTo.gstin) ops.push(txt(`GSTIN: ${inv.billTo.gstin}`, L + 5, by, 7.5));

  ops.push(bold("SHIP TO", MID + 5, bsTop - 7, 7));
  let sy = bsTop - 18;
  ops.push(bold(inv.shipTo.name, MID + 5, sy, 8.5)); sy -= 10;
  for (const line of inv.shipTo.addressLines) {
    ops.push(txt(line, MID + 5, sy, 7.5)); sy -= 9;
  }
  if (inv.shipTo.gstin) ops.push(txt(`GSTIN: ${inv.shipTo.gstin}`, MID + 5, sy, 7.5));

  // ── [4] PRODUCT TABLE ───────────────────────────────────────────────────────
  const tblTop = bsTop - 60;
  const colW = [100, 125, 40, 80, 80, 100];
  const colX: number[] = [L];
  for (const w of colW) colX.push(colX[colX.length - 1] + w);

  const tblHdrs = ["PRODUCT", "TITLE", "QTY", "GROSS AMT", "DISCOUNT", "TOTAL"];
  const rowH = 14;

  // Header row
  ops.push(fillRect(L, tblTop - rowH + 2, R - L, rowH, 0.93));
  ops.push(rect(L, tblTop - rowH + 2, R - L, rowH, 0.5));
  for (let i = 0; i < tblHdrs.length; i++) {
    const isNum = i >= 2;
    if (isNum) ops.push(boldR(tblHdrs[i], colX[i + 1] - 3, tblTop - 9, 6.5));
    else ops.push(bold(tblHdrs[i], colX[i] + 3, tblTop - 9, 6.5));
    if (i > 0) ops.push(vLine(colX[i], tblTop - rowH + 2, tblTop + 2, 0.3));
  }

  // Data rows
  let rowY = tblTop - rowH - 2;
  for (const item of inv.items) {
    ops.push(rect(L, rowY - rowH + 3, R - L, rowH, 0.3));
    for (let i = 1; i < colX.length; i++) {
      ops.push(vLine(colX[i], rowY - rowH + 3, rowY + 3, 0.25));
    }
    const sku = (item.sku ?? item.name).slice(0, 14);
    const name = item.name.length > 18 ? item.name.slice(0, 18) + ".." : item.name;
    const vals = [
      sku,
      name,
      String(item.quantity),
      fmtMoney(item.grossAmount, inv.currency),
      fmtMoney(item.discount, inv.currency),
      fmtMoney(item.total, inv.currency),
    ];
    for (let i = 0; i < vals.length; i++) {
      if (i >= 2) ops.push(txtR(vals[i], colX[i + 1] - 3, rowY - 6, 7.5));
      else ops.push(txt(vals[i], colX[i] + 3, rowY - 6, 7.5));
    }
    rowY -= rowH;
  }
  ops.push(hLine(L, rowY + 2, R, 0.5));

  // ── [5] NOTES + TOTALS ──────────────────────────────────────────────────────
  const secTop = rowY - 4;
  const secBot = secTop - 58;
  const secMid = L + 295;

  ops.push(rect(L, secBot, R - L, secTop - secBot, 0.4));
  ops.push(vLine(secMid, secBot, secTop, 0.4));

  let ny = secTop - 11;
  ops.push(bold("NOTES", L + 5, ny, 7)); ny -= 10;
  ops.push(txt(`Currency: ${inv.currency}`, L + 5, ny, 7.5)); ny -= 9;
  ops.push(txt("GST inclusive in price", L + 5, ny, 7.5)); ny -= 9;
  ops.push(txt(`Payment: ${inv.paymentMode}`, L + 5, ny, 7.5));

  const tx = secMid + 5,
    tValX = R - 6;
  let ty = secTop - 11;
  const totRows: [string, string][] = [
    ["TOTAL QUANTITY", String(inv.totals.totalQuantity)],
    ["TOTAL AMOUNT", fmtMoney(inv.totals.totalAmount, inv.currency)],
  ];
  for (const [label, val] of totRows) {
    ops.push(txt(label, tx, ty, 7.5));
    ops.push(txtR(val, tValX, ty, 7.5));
    ty -= 10;
  }
  ops.push(hLine(secMid, ty + 5, R, 0.6));
  ty -= 5;
  ops.push(bold("GRAND TOTAL", tx, ty, 8.5));
  ops.push(boldR(fmtMoney(inv.totals.grandTotal, inv.currency), tValX, ty, 8.5));

  // ── [6] FOOTER ──────────────────────────────────────────────────────────────
  const ftTop = secBot - 6;
  const ftBot = ftTop - 40;
  ops.push(rect(L, ftBot, R - L, ftTop - ftBot, 0.4));
  ops.push(vLine(MID, ftBot, ftTop, 0.4));

  ops.push(bold("RETURN POLICY", L + 5, ftTop - 10, 7));
  const words = inv.returnPolicy.split(" ");
  let l1 = "",
    l2 = "";
  for (const w of words) {
    if ((l1 + w).length < 52) l1 += w + " ";
    else l2 += w + " ";
  }
  ops.push(txt(l1.trim(), L + 5, ftTop - 20, 7));
  if (l2.trim()) ops.push(txt(l2.trim(), L + 5, ftTop - 30, 7));

  ops.push(bold("CONTACT", MID + 5, ftTop - 10, 7));
  ops.push(txt(`Email: ${inv.contact.email}`, MID + 5, ftTop - 20, 7));
  ops.push(txt(`Phone: ${inv.contact.phone}`, MID + 5, ftTop - 30, 7));

  // ── [7] AUTHORIZED SIGNATORY ────────────────────────────────────────────────
  const sigY = ftBot - 20;
  ops.push(hLine(L + 5, sigY + 10, L + 100, 0.5));
  ops.push(txt("AUTHORIZED SIGNATORY", L + 5, sigY, 7));

  // ── [8] PAGE FOOTER ─────────────────────────────────────────────────────────
  ops.push(txt(inv.company.name, MID - 30, 38, 7.5));
  ops.push(txtR("Page 1 of 1", R - 5, 38, 7));

  // Redraw outer border on top
  ops.push(rect(L, 30, R - L, 800, 0.8));

  return ops;
};

// ─────────────────────────────────────────────
// PDF BLOB BUILDER  (async — generates QR first)
// ─────────────────────────────────────────────

export const buildInvoicePdfBlob = async (invoice: InvoiceData): Promise<Blob> => {
  // 1. Generate QR code stream for the invoice URL / order ID
  const qrText = invoice.qrCodeUrl || invoice.orderId;
  const { stream: qrStream, size: qrSize } = await generateQrPdfStream(qrText, 80);

  // 2. Build page content
  const content = buildPdfPageContent(invoice, qrStream, qrSize).join("\n");

  // 3. Encode everything
  const encoder = new TextEncoder();
  const encode = (s: string) => encoder.encode(s);

  const qrStreamEncoded = encode(qrStream);
  const contentEncoded = encode(content);

  // PDF objects:
  //  1  Catalog
  //  2  Pages
  //  3  Page (references QR XObject + content stream)
  //  4  Font Helvetica (F1)
  //  5  Font Helvetica-Bold (F2)
  //  6  Content stream
  //  7  QR XObject

  const obj7 =
    `7 0 obj\n` +
    `<< /Type /XObject /Subtype /Form\n` +
    `   /BBox [0 0 ${qrSize} ${qrSize}]\n` +
    `   /Resources << >>\n` +
    `   /Length ${qrStreamEncoded.length} >>\n` +
    `stream\n${qrStream}\nendstream\nendobj\n`;

  const objects = [
    "%PDF-1.4\n",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n" +
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n" +
      "   /Resources << /Font << /F1 4 0 R /F2 5 0 R >>\n" +
      "                  /XObject << /QR 7 0 R >> >>\n" +
      "   /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica\n" +
      "   /Encoding /WinAnsiEncoding >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold\n" +
      "   /Encoding /WinAnsiEncoding >>\nendobj\n",
    `6 0 obj\n<< /Length ${contentEncoded.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    obj7,
  ];

  let offset = 0;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(offset);
    offset += encode(obj).length;
  }

  const xrefLines = [
    "xref\n",
    `0 ${objects.length}\n`,
    "0000000000 65535 f \n",
  ];
  for (let i = 1; i < offsets.length; i++) {
    xrefLines.push(`${offsets[i].toString().padStart(10, "0")} 00000 n \n`);
  }

  const trailer =
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${offset}\n%%EOF`;

  return new Blob([objects.join("") + xrefLines.join("") + trailer], {
    type: "application/pdf",
  });
};

// ─────────────────────────────────────────────
// buildInvoiceDataFromPrebooking  (unchanged logic)
// ─────────────────────────────────────────────

// Minimal stub — replace with your actual PrebookingData type
export interface PrebookingData {
  fullName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: Array<{
    title: string;
    price: number | string;
    originalPrice?: number | string;
    quantity?: number | string;
    emoji?: string;
  }>;
  payment?: {
    currency?: string;
    orderId?: string;
    paidAt?: string;
  };
}

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
  const orderId = prebooking.payment?.orderId || invoiceNumber;

  const items: InvoiceItem[] = prebooking.items.map((item) => {
    const paidAmount = parseNumericValue(item.price);
    const originalAmount = item.originalPrice
      ? parseNumericValue(item.originalPrice)
      : paidAmount;
    const discount = Number((originalAmount - paidAmount).toFixed(2));
    const grossAmount = originalAmount;
    const quantity = Number.isFinite(Number(item.quantity))
      ? Number(item.quantity)
      : 1;
    return computeLineItem({
      sku: undefined,
      name: item.title,
      description: item.emoji || undefined,
      quantity,
      grossAmount,
      discount,
    });
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
    orderId,
    invoiceDate,
    orderDate: prebooking.payment?.paidAt || invoiceDate,
    billingCountry,
    currency,
    locale,
    paymentMode: options?.paymentMode || "Online / UPI",
    // QR points to a meaningful URL — e.g. order tracking page
    qrCodeUrl:
      options?.qrCodeUrl ||
      `https://pingiff.com/orders/${encodeURIComponent(orderId)}`,
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
      "GST is inclusive in the listed price.",
    ],
    footer: { authorizedSignatory: "Ping IFF LLP" },
    contact: {
      phone: "+91 98765 43210",
      email: "support@pingiff.com",
      bankDetails:
        "UPI: pingiff@bank | Netbanking: AXISBANK0001 | Cash accepted",
    },
    returnPolicy:
      "Return requests accepted within 7 days on manufacturing defects only. Please keep original packaging.",
    authorizedSignatory: "Ping IFF LLP",
  };
};

// ─────────────────────────────────────────────
// USAGE EXAMPLE (browser)
// ─────────────────────────────────────────────
//
// import { buildInvoiceDataFromPrebooking, buildInvoicePdfBlob } from "./invoiceUtils";
//
// const prebooking: PrebookingData = {
//   fullName: "Shubham",
//   address: "chandigarh",
//   city: "Chandigarh",
//   state: "Chandigarh",
//   pincode: "160036",
//   items: [
//     {
//       title: "PingME Car Card",
//       price: 1,
//       originalPrice: 599,
//       quantity: 1,
//     },
//   ],
//   payment: {
//     currency: "INR",
//     orderId: "order_Sv7SVVs1NrQFn2",
//     paidAt: "2026-05-29T08:54:00.000Z",
//   },
// };
//
// const invoice = buildInvoiceDataFromPrebooking(prebooking, {
//   paymentMode: "Razorpay",
// });
//
// const blob = await buildInvoicePdfBlob(invoice);
// const url = URL.createObjectURL(blob);
// window.open(url);   // or: <a href={url} download="invoice.pdf">Download</a>