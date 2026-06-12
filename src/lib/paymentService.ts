// invoiceUtils.ts
// ─────────────────────────────────────────────────────────────────────────────
// Changes in this version:
//  1. Tax Invoice number and type label removed from header — QR only.
//  2. invoiceNumber / invoiceType removed from InvoiceData interface.
//  3. Table redesigned: SKU column dropped; single TITLE column (220 pts wide).
//     Numeric columns widened: GROSS AMT 85, DISCOUNT 85, TOTAL 100.
//  4. Right-aligned money values use per-column clipping so they cannot bleed.
//  5. Product names wrap within their cell; no overflow into adjacent columns.
//  6. Contact: email=contact@plzpingme.com, phone=7347340007.
// ─────────────────────────────────────────────────────────────────────────────

// npm install qrcode

// ─────────────────────────────────────────────
// PUBLIC TYPES
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
  // invoiceNumber and invoiceType removed — not shown on PDF
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
// PRODUCT NAME NORMALIZER
// ─────────────────────────────────────────────

const PRODUCT_NAME_MAP: Record<string, string> = {
  "pingme card card - standard": "PingME Card - Standard",
  "pingme card - standard":      "PingME Card - Standard",
  "pingme card card standard":   "PingME Card - Standard",
  "pingme card card pack":       "PingME Card Pack",
  "pingme card pack":            "PingME Card Pack",
  "backpack sticker - standard b": "Backpack Sticker - Standard",
  "backpack sticker standard":     "Backpack Sticker - Standard",
  "backpack sticker":              "Backpack Sticker - Standard",
  "bag tag - square black":  "Bag Tag - Square Black",
  "bag tag -square black":   "Bag Tag - Square Black",
  "bag tag square black":    "Bag Tag - Square Black",
  "bag tag - square yellow": "Bag Tag - Square Yellow",
  "bag tag -square yellow":  "Bag Tag - Square Yellow",
  "bag tag square yellow":   "Bag Tag - Square Yellow",
  "keychain tag - black": "Keychain Tag - Black",
  "keychain tag black":   "Keychain Tag - Black",
  "keychain tag - navy":  "Keychain Tag - Navy",
  "keychain tag navy":    "Keychain Tag - Navy",
  "keychain tag - red":   "Keychain Tag - Red",
  "keychain tag red":     "Keychain Tag - Red",
  "keychain tag - teal":  "Keychain Tag - Teal",
  "keychain tag teal":    "Keychain Tag - Teal",
  "lost and found tag":      "Lost and Found Tag",
  "lost and found tag pack": "Lost and Found Tag Pack",
  "nfc card - shin chan":    "NFC Card - Shin Chan",
  "nfc card shin chan":      "NFC Card - Shin Chan",
  "nfc card - mindset":      "NFC Card - Mindset",
  "nfc card mindset":        "NFC Card - Mindset",
  "nfc card - one piece":    "NFC Card - One Piece",
  "nfc card one piece":      "NFC Card - One Piece",
  "nfc card - phoenix dark": "NFC Card - Phoenix Dark",
  "nfc card phoenix dark":   "NFC Card - Phoenix Dark",
  "nfc card - you can":      "NFC Card - You Can",
  "nfc card you can":        "NFC Card - You Can",
  "pet tag oval":     "Pet Tag - Oval",
  "pet tag - oval":   "Pet Tag - Oval",
  "pet tag cicle":    "Pet Tag - Circle",
  "pet tag circle":   "Pet Tag - Circle",
  "pet tag - circle": "Pet Tag - Circle",
  "smart pet tag blue":    "Smart Pet Tag - Blue",
  "smart pet tag - blue":  "Smart Pet Tag - Blue",
};

export const normalizeProductName = (rawTitle: string): string => {
  const key = rawTitle.trim().toLowerCase();
  if (PRODUCT_NAME_MAP[key]) return PRODUCT_NAME_MAP[key];
  return rawTitle.trim().replace(/\b\w/g, (c) => c.toUpperCase());
};

// ─────────────────────────────────────────────
// QR CODE GENERATION
// ─────────────────────────────────────────────

type QrCodeCreateModule = {
  create: (
    text: string,
    options: { errorCorrectionLevel: "L" | "M" | "Q" | "H" },
  ) => { modules: { size: number; data: boolean[][] } };
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
  const ops: string[] = ["0 0 0 rg"];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (modules.data[row][col]) {
        const x = col * cell;
        const y = (n - 1 - row) * cell;
        ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re`);
      }
    }
  }
  ops.push("f");
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

// Clipped right-aligned text: clips to [clipX .. clipX+clipW] before drawing.
// fw=0.52 is a well-calibrated average char width for Helvetica digits/caps.
const txtRC = (
  s: string,
  rightEdge: number,
  y: number,
  size: number,
  clipX: number,
  clipW: number,
  fw = 0.52,
) => {
  const textX = rightEdge - s.length * size * fw;
  return [
    `q`,
    `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`,
    `BT /F1 ${size} Tf ${textX} ${y} Td (${esc(s)}) Tj ET`,
    `Q`,
  ].join("\n");
};

const boldRC = (
  s: string,
  rightEdge: number,
  y: number,
  size: number,
  clipX: number,
  clipW: number,
  fw = 0.52,
) => {
  const textX = rightEdge - s.length * size * fw;
  return [
    `q`,
    `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`,
    `BT /F2 ${size} Tf ${textX} ${y} Td (${esc(s)}) Tj ET`,
    `Q`,
  ].join("\n");
};

// Clipped left-aligned text
const txtC = (
  s: string,
  x: number,
  y: number,
  size: number,
  clipX: number,
  clipW: number,
) =>
  [`q`, `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`, `BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`, `Q`].join("\n");

const boldC = (
  s: string,
  x: number,
  y: number,
  size: number,
  clipX: number,
  clipW: number,
) =>
  [`q`, `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`, `BT /F2 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`, `Q`].join("\n");

// Unclipped helpers (used outside table)
const txtR = (s: string, x: number, y: number, size = 9, fw = 0.52) =>
  txt(s, x - s.length * size * fw, y, size);

const boldR = (s: string, x: number, y: number, size = 9, fw = 0.52) =>
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

const wrapText = (s: string, maxChars: number): string[] => {
  if (s.length <= maxChars) return [s];
  const words = s.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + (current ? " " : "") + word).length <= maxChars) {
      current += (current ? " " : "") + word;
    } else {
      if (current) lines.push(current);
      if (word.length > maxChars) {
        let w = word;
        while (w.length > maxChars) { lines.push(w.slice(0, maxChars)); w = w.slice(maxChars); }
        current = w;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
};

// ─────────────────────────────────────────────
// MAIN PDF CONTENT BUILDER
// ─────────────────────────────────────────────

const buildPdfPageContent = (
  inv: InvoiceData,
  qrStream: string,
  qrSize: number,
): string[] => {
  const ops: string[] = [];
  const L = 35, R = 560, MID = 297;

  ops.push(rect(L, 30, R - L, 800, 0.8));

  // ── [1] HEADER ──────────────────────────────────────────────────────────────
  const QR_X  = R - 95;
  const QR_Y  = 720;
  const QR_TOP = QR_Y + qrSize; // 800

  // QR code only — no invoice number or type label below it
  ops.push(`q ${qrSize} 0 0 ${qrSize} ${QR_X} ${QR_Y} cm /QR Do Q`);

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

  const headerBot = QR_Y - 10; // separator sits just below QR
  ops.push(hLine(L, headerBot, R, 0.8));

  // ── [2] ORDER INFO ROW ──────────────────────────────────────────────────────
  // 5 columns: ORDER ID | ORDER DATE | INVOICE DATE | PAN | PAYMENT MODE
  const infoY   = headerBot - 18;
  const cols5   = [L, L + 105, L + 190, L + 275, L + 365, R];
  const iLabels = ["ORDER ID", "ORDER DATE", "INVOICE DATE", "PAN", "PAYMENT MODE"];

  const oidLines = wrapText(inv.orderId, 16);
  const pmLines  = wrapText(inv.paymentMode, 18);

  const iValues = [
    oidLines[0],
    formatDate(inv.orderDate),
    formatDate(inv.invoiceDate),
    inv.company.pan,
    pmLines[0],
  ];

  const infoRowH = 30;
  ops.push(fillRect(L, infoY - infoRowH + 12, R - L, infoRowH, 0.93));
  ops.push(rect(L,     infoY - infoRowH + 12, R - L, infoRowH, 0.5));

  for (let i = 0; i < 5; i++) {
    const cx   = cols5[i] + 4;
    const colW = cols5[i + 1] - cols5[i] - 4;
    ops.push(txt(iLabels[i], cx, infoY + 5, 6.5));
    ops.push(bold(iValues[i], cx, infoY - 7, 7.5));
    if (i === 0 && oidLines[1]) ops.push(bold(oidLines[1], cx, infoY - 16, 7.5));
    if (i === 4 && pmLines[1])  ops.push(bold(pmLines[1],  cx, infoY - 16, 7.5));
    if (i > 0) ops.push(vLine(cols5[i], infoY - infoRowH + 12, infoY + 13, 0.4));
  }

  // ── [3] BILL TO / SHIP TO ───────────────────────────────────────────────────
  const bsTop = infoY - 22;
  ops.push(rect(L, bsTop - 52, R - L, 54, 0.5));
  ops.push(vLine(MID, bsTop - 52, bsTop + 2, 0.4));

  ops.push(bold("BILL TO", L + 5, bsTop - 7, 7));
  let by = bsTop - 18;
  ops.push(bold(inv.billTo.name, L + 5, by, 8.5)); by -= 10;
  for (const line of inv.billTo.addressLines) { ops.push(txt(line, L + 5, by, 7.5)); by -= 9; }
  if (inv.billTo.gstin) ops.push(txt(`GSTIN: ${inv.billTo.gstin}`, L + 5, by, 7.5));

  ops.push(bold("SHIP TO", MID + 5, bsTop - 7, 7));
  let sy = bsTop - 18;
  ops.push(bold(inv.shipTo.name, MID + 5, sy, 8.5)); sy -= 10;
  for (const line of inv.shipTo.addressLines) { ops.push(txt(line, MID + 5, sy, 7.5)); sy -= 9; }
  if (inv.shipTo.gstin) ops.push(txt(`GSTIN: ${inv.shipTo.gstin}`, MID + 5, sy, 7.5));

  // ── [4] PRODUCT TABLE ───────────────────────────────────────────────────────
  // Columns: TITLE | QTY | GROSS AMT | DISCOUNT | TOTAL
  // Total width = R - L = 525 pts
  //  TITLE=220  QTY=35  GROSS=90  DISC=90  TOTAL=90
  const tblTop = bsTop - 60;
  const COL_TITLE = 220;
  const COL_QTY   = 35;
  const COL_GROSS = 90;
  const COL_DISC  = 90;
  const COL_TOTAL = R - L - COL_TITLE - COL_QTY - COL_GROSS - COL_DISC; // 90

  const colW5 = [COL_TITLE, COL_QTY, COL_GROSS, COL_DISC, COL_TOTAL];
  const colX5: number[] = [L];
  for (const w of colW5) colX5.push(colX5[colX5.length - 1] + w);

  const tblHdrs = ["TITLE", "QTY", "GROSS AMT", "DISCOUNT", "TOTAL"];
  const rowH = 14;

  // Header row
  ops.push(fillRect(L, tblTop - rowH + 2, R - L, rowH, 0.93));
  ops.push(rect(L, tblTop - rowH + 2, R - L, rowH, 0.5));
  for (let i = 0; i < tblHdrs.length; i++) {
    const cx   = colX5[i];
    const cw   = colW5[i];
    const isNum = i >= 1;
    if (isNum) {
      ops.push(boldRC(tblHdrs[i], cx + cw - 3, tblTop - 9, 6.5, cx + 2, cw - 4));
    } else {
      ops.push(boldC(tblHdrs[i], cx + 3, tblTop - 9, 6.5, cx + 2, cw - 4));
    }
    if (i > 0) ops.push(vLine(colX5[i], tblTop - rowH + 2, tblTop + 2, 0.3));
  }

  // Data rows
  // TITLE column is 220 pts wide. At font-size 7.5 and ~0.52 char-width factor,
  // each character is ~3.9 pts wide. With 6 pts padding on each side the usable
  // width is 208 pts → fits ~53 chars per line.
  // We wrap at 26 chars to be conservative (some chars like W/M are wider).
  // Row height grows by LINE_H (10 pts) for every extra line — no clipping,
  // so every character of every product name is always fully visible.
  const TITLE_WRAP = 26;   // chars per line in the TITLE column
  const LINE_H     = 10;   // pts between successive text lines
  const ROW_PAD    = 6;    // pts of vertical padding inside each row (top+bottom)

  let rowY = tblTop - rowH - 2;
  for (const item of inv.items) {
    const displayName = normalizeProductName(item.name);
    const nameLines   = wrapText(displayName, TITLE_WRAP); // unlimited lines
    // Row height = padding + lines * line-height, minimum = base rowH
    const thisRowH = Math.max(rowH, ROW_PAD + nameLines.length * LINE_H);

    const rowBottom = rowY - thisRowH + 3;
    ops.push(rect(L, rowBottom, R - L, thisRowH, 0.3));
    for (let i = 1; i < colX5.length; i++) {
      ops.push(vLine(colX5[i], rowBottom, rowY + 3, 0.25));
    }

    // Vertically centre the numeric values relative to the row
    const midY = rowBottom + thisRowH / 2 - 3;

    // TITLE column — left-aligned, NO clip, starts near top of row
    const titleStartY = rowY - ROW_PAD / 2 - LINE_H + 2;
    for (let li = 0; li < nameLines.length; li++) {
      ops.push(txt(nameLines[li], colX5[0] + 3, titleStartY - li * LINE_H, 7.5));
    }

    // QTY — right-aligned, clipped
    ops.push(txtRC(String(item.quantity), colX5[1] + colW5[1] - 3, midY, 7.5, colX5[1] + 2, colW5[1] - 4));

    // GROSS AMT — right-aligned, clipped
    ops.push(txtRC(fmtMoney(item.grossAmount, inv.currency), colX5[2] + colW5[2] - 3, midY, 7.5, colX5[2] + 2, colW5[2] - 4));

    // DISCOUNT — right-aligned, clipped
    ops.push(txtRC(fmtMoney(item.discount, inv.currency), colX5[3] + colW5[3] - 3, midY, 7.5, colX5[3] + 2, colW5[3] - 4));

    // TOTAL — right-aligned, clipped
    ops.push(txtRC(fmtMoney(item.total, inv.currency), colX5[4] + colW5[4] - 3, midY, 7.5, colX5[4] + 2, colW5[4] - 4));

    rowY -= thisRowH;
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
  const pmNoteLines = wrapText(`Payment: ${inv.paymentMode}`, 36);
  for (const line of pmNoteLines) { ops.push(txt(line, L + 5, ny, 7.5)); ny -= 9; }

  const tx = secMid + 5, tValX = R - 6;
  let ty = secTop - 11;
  const totRows: [string, string][] = [
    ["TOTAL QUANTITY", String(inv.totals.totalQuantity)],
    ["TOTAL AMOUNT",   fmtMoney(inv.totals.totalAmount, inv.currency)],
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
  const returnLines = wrapText(inv.returnPolicy, 52);
  let ry = ftTop - 20;
  for (const line of returnLines.slice(0, 2)) { ops.push(txt(line, L + 5, ry, 7)); ry -= 10; }

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
// PDF BLOB BUILDER
// ─────────────────────────────────────────────

export const buildInvoicePdfBlob = async (invoice: InvoiceData): Promise<Blob> => {
  const qrText = invoice.qrCodeUrl || invoice.orderId;
  const { stream: qrStream, size: qrSize } = await generateQrPdfStream(qrText, 80);
  const content = buildPdfPageContent(invoice, qrStream, qrSize).join("\n");

  const encoder = new TextEncoder();
  const encode  = (s: string) => encoder.encode(s);

  const qrStreamEncoded = encode(qrStream);
  const contentEncoded  = encode(content);

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
  for (const obj of objects) { offsets.push(offset); offset += encode(obj).length; }

  const xrefLines = ["xref\n", `0 ${objects.length}\n`, "0000000000 65535 f \n"];
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
// buildInvoiceDataFromPrebooking
// ─────────────────────────────────────────────

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
    invoiceDate?: string;
    billingCountry?: string;
    paymentMode?: string;
    qrCodeUrl?: string;
    locale?: string;
  },
): InvoiceData => {
  const realOrderId = prebooking.payment?.orderId?.trim() || "";
  const invoiceDate = options?.invoiceDate || new Date().toISOString();
  const billingCountry = options?.billingCountry || "India";
  const locale = options?.locale || "en-IN";
  const currency = prebooking.payment?.currency || "INR";
  const orderId = realOrderId || `ORD-${Date.now()}`;

  const items: InvoiceItem[] = prebooking.items.map((item) => {
    const paidAmount     = parseNumericValue(item.price);
    const originalAmount = item.originalPrice ? parseNumericValue(item.originalPrice) : paidAmount;
    const discount       = Number((originalAmount - paidAmount).toFixed(2));
    const grossAmount    = originalAmount;
    const quantity       = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1;
    const normalizedName = normalizeProductName(item.title);
    return computeLineItem({ sku: undefined, name: normalizedName, description: item.emoji || undefined, quantity, grossAmount, discount });
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
    orderId,
    invoiceDate,
    orderDate: prebooking.payment?.paidAt || invoiceDate,
    billingCountry,
    currency,
    locale,
    paymentMode: options?.paymentMode || "Online / UPI",
    qrCodeUrl:
      options?.qrCodeUrl ||
      `https://plzpingme.com/orders/${encodeURIComponent(orderId)}`,
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
      phone: "7347340007",
      email: "contact@plzpingme.com",
      bankDetails: "UPI: pingiff@bank | Netbanking: AXISBANK0001 | Cash accepted",
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
//     { title: "NFC Card - Shin Chan", price: 299, originalPrice: 599, quantity: 1 },
//     { title: "Smart Pet Tag - Blue", price: 499, originalPrice: 799, quantity: 2 },
//   ],
//   payment: {
//     currency: "INR",
//     orderId: "order_Sv7SVVs1NrQFn2",
//     paidAt: "2026-05-29T08:54:00.000Z",
//   },
// };
//
// const invoice = buildInvoiceDataFromPrebooking(prebooking, {
//   paymentMode: "Razorpay / UPI",
// });
//
// const blob = await buildInvoicePdfBlob(invoice);
// const url = URL.createObjectURL(blob);
// window.open(url);