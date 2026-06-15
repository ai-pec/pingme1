// invoiceUtils.js — CommonJS, Firebase Functions (Node.js)
// Matches the layout / colour-scheme of invoiceUtils.ts exactly:
//   • No SKU column — 5-col table: TITLE | QTY | GROSS AMT | DISCOUNT | TOTAL
//   • fw = 0.58 (corrected character-width factor)
//   • Clipped right-aligned money helpers (txtRC / boldRC)
//   • Clipped left-aligned title helper (txtC)
//   • Dynamic row height for multi-line product names
//   • normalizeProductName() product name map
//   • QR code only in header (no invoice number / type label below it)
//   • QR_Y = 720, headerBot = QR_Y - 10
//   • contact: contact@plzpingme.com / +91 7347340007
//   • Buffer-based PDF assembly for exact /Length and xref offsets
"use strict";

// ─── Formatting utilities ─────────────────────────────────────────────────────

const formatCurrency = (value, currency, locale = "en-IN") =>
    new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(value);

const dynamicCurrencyFormatter =
    (currency, locale = "en-IN") =>
        (value) =>
            formatCurrency(value, currency, locale);

const formatDate = (value, locale = "en-IN") => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
};

const parseNumericValue = (value, fallback = 0) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const numeric = Number(value.replace(/[^0-9.-]+/g, ""));
        return Number.isFinite(numeric) ? numeric : fallback;
    }
    return fallback;
};

const computeLineItem = (item) => {
    const grossAmount = parseNumericValue(item.grossAmount);
    const discount = parseNumericValue(item.discount);
    const total = Number((grossAmount - discount).toFixed(2));
    return { ...item, grossAmount, discount, total };
};

const computeTotals = (items) => {
    const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = Number(items.reduce((s, i) => s + i.total, 0).toFixed(2));
    return {
        totalQuantity,
        totalAmount,
        totalTaxableValue: totalAmount,
        totalTaxes: 0,
        grandTotal: totalAmount,
    };
};

// ─── Product name normaliser (ported from TS) ─────────────────────────────────

const PRODUCT_NAME_MAP = {
    "pingme card card - standard": "PingME Card - Standard",
    "pingme card - standard": "PingME Card - Standard",
    "pingme card card standard": "PingME Card - Standard",
    "pingme card card pack": "PingME Card Pack",
    "pingme card pack": "PingME Card Pack",
    "backpack sticker - standard b": "Backpack Sticker - Standard",
    "backpack sticker standard": "Backpack Sticker - Standard",
    "backpack sticker": "Backpack Sticker - Standard",
    "bag tag - square black": "Bag Tag - Square Black",
    "bag tag -square black": "Bag Tag - Square Black",
    "bag tag square black": "Bag Tag - Square Black",
    "bag tag - square yellow": "Bag Tag - Square Yellow",
    "bag tag -square yellow": "Bag Tag - Square Yellow",
    "bag tag square yellow": "Bag Tag - Square Yellow",
    "keychain tag - black": "Keychain Tag - Black",
    "keychain tag black": "Keychain Tag - Black",
    "keychain tag - navy": "Keychain Tag - Navy",
    "keychain tag navy": "Keychain Tag - Navy",
    "keychain tag - red": "Keychain Tag - Red",
    "keychain tag red": "Keychain Tag - Red",
    "keychain tag - teal": "Keychain Tag - Teal",
    "keychain tag teal": "Keychain Tag - Teal",
    "lost and found tag": "Lost and Found Tag",
    "lost and found tag pack": "Lost and Found Tag Pack",
    "nfc card - shin chan": "NFC Card - Shin Chan",
    "nfc card shin chan": "NFC Card - Shin Chan",
    "nfc card - mindset": "NFC Card - Mindset",
    "nfc card mindset": "NFC Card - Mindset",
    "nfc card - one piece": "NFC Card - One Piece",
    "nfc card one piece": "NFC Card - One Piece",
    "nfc card - phoenix dark": "NFC Card - Phoenix Dark",
    "nfc card phoenix dark": "NFC Card - Phoenix Dark",
    "nfc card - you can": "NFC Card - You Can",
    "nfc card you can": "NFC Card - You Can",
    "pet tag oval": "Pet Tag - Oval",
    "pet tag - oval": "Pet Tag - Oval",
    "pet tag cicle": "Pet Tag - Circle",
    "pet tag circle": "Pet Tag - Circle",
    "pet tag - circle": "Pet Tag - Circle",
    "smart pet tag blue": "Smart Pet Tag - Blue",
    "smart pet tag - blue": "Smart Pet Tag - Blue",
};

const normalizeProductName = (rawTitle) => {
    const key = String(rawTitle || "").trim().toLowerCase();
    if (PRODUCT_NAME_MAP[key]) return PRODUCT_NAME_MAP[key];
    return String(rawTitle || "").trim().replace(/\b\w/g, (c) => c.toUpperCase());
};

// ─── QR Code PDF stream ───────────────────────────────────────────────────────

const generateQrPdfStream = async (text, sizeInPts = 80) => {
    const QRCode = require("qrcode");
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const modules = qr.modules;
    const n = modules.size;
    const cell = sizeInPts / n;

    const ops = ["0 0 0 rg"];
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            // qrcode (npm) stores modules as a flat Uint8Array
            if (modules.data[row * n + col]) {
                const x = col * cell;
                const y = (n - 1 - row) * cell;
                ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re`);
            }
        }
    }
    ops.push("f");
    return { stream: ops.join("\n"), size: sizeInPts };
};

// ─── PDF low-level helpers ────────────────────────────────────────────────────

const esc = (v) =>
    String(v ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/\r?\n/g, " ");

const txt = (s, x, y, size = 9) => `BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`;
const bold = (s, x, y, size = 9) => `BT /F2 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`;

const DEFAULT_FW = 0.58; // corrected Helvetica average char-width factor

// Unclipped right-aligned (used outside table)
const txtR = (s, x, y, size = 9, fw = DEFAULT_FW) => txt(s, x - s.length * size * fw, y, size);
const boldR = (s, x, y, size = 9, fw = DEFAULT_FW) => bold(s, x - s.length * size * fw, y, size);

// Clipped right-aligned — for numeric table cells
const txtRC = (s, rightEdge, y, size, clipX, clipW, fw = DEFAULT_FW) => {
    const textX = rightEdge - s.length * size * fw;
    return [`q`, `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`,
        `BT /F1 ${size} Tf ${textX} ${y} Td (${esc(s)}) Tj ET`, `Q`].join("\n");
};

const boldRC = (s, rightEdge, y, size, clipX, clipW, fw = DEFAULT_FW) => {
    const textX = rightEdge - s.length * size * fw;
    return [`q`, `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`,
        `BT /F2 ${size} Tf ${textX} ${y} Td (${esc(s)}) Tj ET`, `Q`].join("\n");
};

// Clipped left-aligned — for TITLE column (hard clip at column boundary)
const txtC = (s, x, y, size, clipX, clipW) =>
    [`q`, `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`,
        `BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`, `Q`].join("\n");

const boldC = (s, x, y, size, clipX, clipW) =>
    [`q`, `${clipX} ${y - 2} ${clipW} ${size + 4} re W n`,
        `BT /F2 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`, `Q`].join("\n");

const hLine = (x1, y, x2, lw = 0.5) => `${lw} w ${x1} ${y} m ${x2} ${y} l S`;
const vLine = (x, y1, y2, lw = 0.5) => `${lw} w ${x} ${y1} m ${x} ${y2} l S`;
const rect = (x, y, w, h, lw = 0.5) => `${lw} w ${x} ${y} ${w} ${h} re S`;
const fillRect = (x, y, w, h, gray = 0.93) => `${gray} g ${x} ${y} ${w} ${h} re f 0 g`;
const fmtMoney = (v, currency) =>
    `${currency === "INR" ? "Rs." : currency + " "}${v.toFixed(2)}`;

// Word-wrap helper (ported from TS)
const wrapText = (s, maxChars) => {
    if (s.length <= maxChars) return [s];
    const words = s.split(" ");
    const lines = [];
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

// ─── PDF page content (matches TS layout exactly) ────────────────────────────

const buildPdfPageContent = (inv) => {
    const ops = [];
    const L = 35, R = 560, MID = 297;

    ops.push(rect(L, 30, R - L, 800, 0.8));

    // ── [1] HEADER ────────────────────────────────────────────────────────────
    const QR_Y = 720; // kept for headerBot calculation; QR box removed

    let y = 798;
    ops.push(bold(inv.company.name, L + 6, y, 13));
    y -= 14;
    for (const line of inv.company.addressLines) { ops.push(txt(line, L + 6, y, 8)); y -= 10; }
    y -= 3;
    ops.push(txt(`GSTIN: ${inv.company.gstin}`, L + 6, y, 8)); y -= 10;
    ops.push(txt(`PAN:   ${inv.company.pan}`, L + 6, y, 8)); y -= 10;
    ops.push(txt(`CIN:   ${inv.company.cin}`, L + 6, y, 8));

    const headerBot = QR_Y - 10; // matches TS
    ops.push(hLine(L, headerBot, R, 0.8));

    // ── [2] ORDER INFO ROW ────────────────────────────────────────────────────
    const infoY = headerBot - 18;
    const cols5 = [L, L + 105, L + 190, L + 275, L + 365, R];
    const iLabels = ["ORDER ID", "ORDER DATE", "INVOICE DATE", "PAN", "PAYMENT MODE"];

    const oidLines = wrapText(inv.orderId, 16);
    const pmLines = wrapText(inv.paymentMode, 18);

    const iValues = [
        oidLines[0],
        formatDate(inv.orderDate),
        formatDate(inv.invoiceDate),
        inv.company.pan,
        pmLines[0],
    ];

    const infoRowH = 30;
    ops.push(fillRect(L, infoY - infoRowH + 12, R - L, infoRowH, 0.93));
    ops.push(rect(L, infoY - infoRowH + 12, R - L, infoRowH, 0.5));

    for (let i = 0; i < 5; i++) {
        const cx = cols5[i] + 4;
        ops.push(txt(iLabels[i], cx, infoY + 5, 6.5));
        ops.push(bold(iValues[i], cx, infoY - 7, 7.5));
        if (i === 0 && oidLines[1]) ops.push(bold(oidLines[1], cx, infoY - 16, 7.5));
        if (i === 4 && pmLines[1]) ops.push(bold(pmLines[1], cx, infoY - 16, 7.5));
        if (i > 0) ops.push(vLine(cols5[i], infoY - infoRowH + 12, infoY + 13, 0.4));
    }

    // ── [3] BILL TO / SHIP TO ─────────────────────────────────────────────────
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

    // ── [4] PRODUCT TABLE ─────────────────────────────────────────────────────
    // Columns: TITLE(220) | QTY(35) | GROSS AMT(90) | DISCOUNT(90) | TOTAL(90)
    const tblTop = bsTop - 60;
    const COL_TITLE = 220;
    const COL_QTY = 35;
    const COL_GROSS = 90;
    const COL_DISC = 90;
    const COL_TOTAL = R - L - COL_TITLE - COL_QTY - COL_GROSS - COL_DISC; // = 90
    const colW5 = [COL_TITLE, COL_QTY, COL_GROSS, COL_DISC, COL_TOTAL];
    const colX5 = [L];
    for (const w of colW5) colX5.push(colX5[colX5.length - 1] + w);

    const tblHdrs = ["TITLE", "QTY", "GROSS AMT", "DISCOUNT", "TOTAL"];
    const rowH = 14;

    // Header row — full-column clip (no inset) so headers are never truncated
    ops.push(fillRect(L, tblTop - rowH + 2, R - L, rowH, 0.93));
    ops.push(rect(L, tblTop - rowH + 2, R - L, rowH, 0.5));
    for (let i = 0; i < tblHdrs.length; i++) {
        const cx = colX5[i];
        const cw = colW5[i];
        if (i === 0) {
            ops.push(boldC(tblHdrs[i], cx + 3, tblTop - 9, 6.5, cx, cw));
        } else {
            ops.push(boldRC(tblHdrs[i], cx + cw - 3, tblTop - 9, 6.5, cx, cw));
        }
        if (i > 0) ops.push(vLine(colX5[i], tblTop - rowH + 2, tblTop + 2, 0.3));
    }

    // Data rows — dynamic height for wrapped product names
    const TITLE_WRAP = 30;  // chars per line
    const LINE_H = 10;  // pts between text lines
    const ROW_PAD = 6;   // vertical padding (top + bottom combined)

    let rowY = tblTop - rowH - 2;
    for (const item of inv.items) {
        const displayName = normalizeProductName(item.name);
        const nameLines = wrapText(displayName, TITLE_WRAP);
        const thisRowH = Math.max(rowH, ROW_PAD + nameLines.length * LINE_H);
        const rowBottom = rowY - thisRowH + 3;

        ops.push(rect(L, rowBottom, R - L, thisRowH, 0.3));
        for (let i = 1; i < colX5.length; i++) {
            ops.push(vLine(colX5[i], rowBottom, rowY + 3, 0.25));
        }

        // Vertical centre for numeric values
        const midY = rowBottom + thisRowH / 2 - 3;

        // TITLE — left-aligned, clipped to column width
        const titleStartY = rowY - ROW_PAD / 2 - LINE_H + 2;
        for (let li = 0; li < nameLines.length; li++) {
            ops.push(txtC(nameLines[li], colX5[0] + 3, titleStartY - li * LINE_H,
                7.5, colX5[0], COL_TITLE));
        }

        // QTY — right-aligned, clipped
        ops.push(txtRC(String(item.quantity),
            colX5[1] + colW5[1] - 3, midY, 7.5, colX5[1], colW5[1]));

        // GROSS AMT — right-aligned, clipped
        ops.push(txtRC(fmtMoney(item.grossAmount, inv.currency),
            colX5[2] + colW5[2] - 3, midY, 7.5, colX5[2], colW5[2]));

        // DISCOUNT — right-aligned, clipped
        ops.push(txtRC(fmtMoney(item.discount, inv.currency),
            colX5[3] + colW5[3] - 3, midY, 7.5, colX5[3], colW5[3]));

        // TOTAL — right-aligned, clipped
        ops.push(txtRC(fmtMoney(item.total, inv.currency),
            colX5[4] + colW5[4] - 3, midY, 7.5, colX5[4], colW5[4]));

        rowY -= thisRowH;
    }
    ops.push(hLine(L, rowY + 2, R, 0.5));

    // ── [5] NOTES + TOTALS ────────────────────────────────────────────────────
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
    const totRows = [
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

    // ── [6] FOOTER ────────────────────────────────────────────────────────────
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

    // ── [7] AUTHORIZED SIGNATORY ──────────────────────────────────────────────
    const sigY = ftBot - 20;
    ops.push(hLine(L + 5, sigY + 10, L + 100, 0.5));
    ops.push(txt("AUTHORIZED SIGNATORY", L + 5, sigY, 7));

    // ── [8] PAGE FOOTER ───────────────────────────────────────────────────────
    ops.push(txt(inv.company.name, MID - 30, 38, 7.5));
    ops.push(txtR("Page 1 of 1", R - 5, 38, 7));

    // Redraw outer border on top
    ops.push(rect(L, 30, R - L, 800, 0.8));

    return ops;
};

// ─── PDF Buffer builder (Buffer-based for exact /Length and xref offsets) ─────

const buildInvoicePdfBuffer = async (invoice) => {
    const content = buildPdfPageContent(invoice).join("\n");

    const contentBodyBytes = Buffer.byteLength(content, "utf8");

    const obj1 = Buffer.from(
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "utf8");
    const obj2 = Buffer.from(
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n", "utf8");
    const obj3 = Buffer.from(
        "3 0 obj\n" +
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n" +
        "   /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>\n" +
        "   /Contents 6 0 R >>\nendobj\n", "utf8");
    const obj4 = Buffer.from(
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica\n" +
        "   /Encoding /WinAnsiEncoding >>\nendobj\n", "utf8");
    const obj5 = Buffer.from(
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold\n" +
        "   /Encoding /WinAnsiEncoding >>\nendobj\n", "utf8");
    const obj6 = Buffer.from(
        `6 0 obj\n<< /Length ${contentBodyBytes} >>\nstream\n${content}\nendstream\nendobj\n`,
        "utf8");
    const header = Buffer.from("%PDF-1.4\n", "utf8");
    const objBuffers = [obj1, obj2, obj3, obj4, obj5, obj6];

    // Compute absolute byte offsets for each object
    const offsets = [];
    let pos = header.length;
    for (const buf of objBuffers) { offsets.push(pos); pos += buf.length; }

    const xrefLines = [
        `xref\n`,
        `0 ${objBuffers.length + 1}\n`,
        `0000000000 65535 f \n`,
        ...offsets.map((o) => `${o.toString().padStart(10, "0")} 00000 n \n`),
    ];
    const trailer =
        `trailer\n<< /Size ${objBuffers.length + 1} /Root 1 0 R >>\n` +
        `startxref\n${pos}\n%%EOF`;

    return Buffer.concat([
        header,
        ...objBuffers,
        Buffer.from(xrefLines.join("") + trailer, "utf8"),
    ]);
};

// ─── buildInvoiceDataFromPrebooking ──────────────────────────────────────────

const buildInvoiceDataFromPrebooking = (prebooking, options = {}) => {
    const invoiceDate = options.invoiceDate || new Date().toISOString();
    const billingCountry = options.billingCountry || "India";
    const locale = options.locale || "en-IN";
    const currency = prebooking.payment?.currency || "INR";
    const realOrderId = (prebooking.payment?.orderId || "").trim();
    const orderId = realOrderId || `ORD-${Date.now()}`;
    const invoiceNumber = options.invoiceNumber || orderId;

    const items = (prebooking.items || []).map((item) => {
        const paidAmount = parseNumericValue(item.price);
        const originalAmount = item.originalPrice ? parseNumericValue(item.originalPrice) : paidAmount;
        const discount = Number((originalAmount - paidAmount).toFixed(2));
        const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1;
        return computeLineItem({
            sku: undefined,
            name: normalizeProductName(item.title),
            description: item.emoji || undefined,
            quantity,
            grossAmount: originalAmount,
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
        paymentMode: options.paymentMode || "Online / UPI",
        qrCodeUrl:
            options.qrCodeUrl ||
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
            phone: "+91 7347340007",
            email: "contact@plzpingme.com",
        },
        returnPolicy:
            "Return requests accepted within 7 days on manufacturing defects only. Please keep original packaging.",
        authorizedSignatory: "Ping IFF LLP",
    };
};

module.exports = {
    formatCurrency,
    dynamicCurrencyFormatter,
    formatDate,
    computeLineItem,
    computeTotals,
    normalizeProductName,
    buildInvoicePdfBuffer,
    buildInvoiceDataFromPrebooking,
};