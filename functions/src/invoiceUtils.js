//invoiceUtils.js — CommonJS version for Firebase Functions (Node.js)
// npm install qrcode (inside functions/ folder)

"use strict";

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
            if (modules.data[row * n + col] || (modules.data[row] && modules.data[row][col])) {
                const val = Array.isArray(modules.data[row])
                    ? modules.data[row][col]
                    : modules.data[row * n + col];
                if (val) {
                    const x = col * cell;
                    const y = (n - 1 - row) * cell;
                    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re`);
                }
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

const txt = (s, x, y, size = 9) =>
    `BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`;

const bold = (s, x, y, size = 9) =>
    `BT /F2 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`;

const txtR = (s, x, y, size = 9, fw = 0.55) =>
    txt(s, x - s.length * size * fw, y, size);

const boldR = (s, x, y, size = 9, fw = 0.55) =>
    bold(s, x - s.length * size * fw, y, size);

const hLine = (x1, y, x2, lw = 0.5) =>
    `${lw} w ${x1} ${y} m ${x2} ${y} l S`;

const vLine = (x, y1, y2, lw = 0.5) =>
    `${lw} w ${x} ${y1} m ${x} ${y2} l S`;

const rect = (x, y, w, h, lw = 0.5) =>
    `${lw} w ${x} ${y} ${w} ${h} re S`;

const fillRect = (x, y, w, h, gray = 0.93) =>
    `${gray} g ${x} ${y} ${w} ${h} re f 0 g`;

const fmtMoney = (v, currency) =>
    `${currency === "INR" ? "Rs." : currency + " "}${v.toFixed(2)}`;

// ─── PDF page content ─────────────────────────────────────────────────────────

const buildPdfPageContent = (inv, qrStream, qrSize) => {
    const ops = [];
    const L = 35, R = 560, MID = 297;

    ops.push(rect(L, 30, R - L, 800, 0.8));

    const QR_X = R - 95;
    const QR_Y = 715;
    const QR_TOP = QR_Y + qrSize;

    ops.push(`q ${qrSize} 0 0 ${qrSize} ${QR_X} ${QR_Y} cm /QR Do Q`);

    const invNum = inv.invoiceNumber.replace(/^#/, "");
    ops.push(bold(`#${invNum}`, QR_X, QR_Y - 12, 8));
    ops.push(txt(`${inv.invoiceType.toUpperCase()}`, QR_X, QR_Y - 22, 7));

    let y = QR_TOP - 2;
    ops.push(bold(inv.company.name, L + 6, y, 13));
    y -= 14;
    for (const line of inv.company.addressLines) {
        ops.push(txt(line, L + 6, y, 8));
        y -= 10;
    }
    y -= 3;
    ops.push(txt(`GSTIN: ${inv.company.gstin}`, L + 6, y, 8)); y -= 10;
    ops.push(txt(`PAN: ${inv.company.pan}`, L + 6, y, 8)); y -= 10;
    ops.push(txt(`CIN: ${inv.company.cin}`, L + 6, y, 8));

    const headerBot = QR_Y - 28;
    ops.push(hLine(L, headerBot, R, 0.8));

    const infoY = headerBot - 18;
    const cols5 = [L, L + 100, L + 185, L + 270, L + 355, R];
    const iLabels = ["ORDER ID", "ORDER DATE", "INVOICE DATE", "PAN", "PAYMENT MODE"];
    const oidDisp = inv.orderId.length > 15 ? inv.orderId.slice(0, 15) + ".." : inv.orderId;
    const pmDisp = inv.paymentMode.length > 16 ? inv.paymentMode.slice(0, 16) + ".." : inv.paymentMode;
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

    const tblTop = bsTop - 60;
    const colW = [100, 125, 40, 80, 80, 100];
    const colX = [L];
    for (const w of colW) colX.push(colX[colX.length - 1] + w);

    const tblHdrs = ["PRODUCT", "TITLE", "QTY", "GROSS AMT", "DISCOUNT", "TOTAL"];
    const rowH = 14;

    ops.push(fillRect(L, tblTop - rowH + 2, R - L, rowH, 0.93));
    ops.push(rect(L, tblTop - rowH + 2, R - L, rowH, 0.5));
    for (let i = 0; i < tblHdrs.length; i++) {
        const isNum = i >= 2;
        if (isNum) ops.push(boldR(tblHdrs[i], colX[i + 1] - 3, tblTop - 9, 6.5));
        else ops.push(bold(tblHdrs[i], colX[i] + 3, tblTop - 9, 6.5));
        if (i > 0) ops.push(vLine(colX[i], tblTop - rowH + 2, tblTop + 2, 0.3));
    }

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

    const ftTop = secBot - 6;
    const ftBot = ftTop - 40;
    ops.push(rect(L, ftBot, R - L, ftTop - ftBot, 0.4));
    ops.push(vLine(MID, ftBot, ftTop, 0.4));

    ops.push(bold("RETURN POLICY", L + 5, ftTop - 10, 7));
    const words = inv.returnPolicy.split(" ");
    let l1 = "", l2 = "";
    for (const w of words) {
        if ((l1 + w).length < 52) l1 += w + " ";
        else l2 += w + " ";
    }
    ops.push(txt(l1.trim(), L + 5, ftTop - 20, 7));
    if (l2.trim()) ops.push(txt(l2.trim(), L + 5, ftTop - 30, 7));

    ops.push(bold("CONTACT", MID + 5, ftTop - 10, 7));
    ops.push(txt(`Email: ${inv.contact.email}`, MID + 5, ftTop - 20, 7));
    ops.push(txt(`Phone: ${inv.contact.phone}`, MID + 5, ftTop - 30, 7));

    const sigY = ftBot - 20;
    ops.push(hLine(L + 5, sigY + 10, L + 100, 0.5));
    ops.push(txt("AUTHORIZED SIGNATORY", L + 5, sigY, 7));

    ops.push(txt(inv.company.name, MID - 30, 38, 7.5));
    ops.push(txtR("Page 1 of 1", R - 5, 38, 7));

    ops.push(rect(L, 30, R - L, 800, 0.8));

    return ops;
};

// ─── PDF blob builder (returns Buffer for Node.js) ───────────────────────────

const buildInvoicePdfBuffer = async (invoice) => {
    const qrText = invoice.qrCodeUrl || invoice.orderId;
    const { stream: qrStream, size: qrSize } = await generateQrPdfStream(qrText, 80);

    const content = buildPdfPageContent(invoice, qrStream, qrSize).join("\n");

    const qrStreamBytes = Buffer.byteLength(qrStream, "utf8");
    const contentBytes = Buffer.byteLength(content, "utf8");

    const obj7 =
        `7 0 obj\n` +
        `<< /Type /XObject /Subtype /Form\n` +
        ` /BBox [0 0 ${qrSize} ${qrSize}]\n` +
        ` /Resources << >>\n` +
        ` /Length ${qrStreamBytes} >>\n` +
        `stream\n${qrStream}\nendstream\nendobj\n`;

    const objects = [
        "%PDF-1.4\n",
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        "3 0 obj\n" +
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n" +
        " /Resources << /Font << /F1 4 0 R /F2 5 0 R >>\n" +
        " /XObject << /QR 7 0 R >> >>\n" +
        " /Contents 6 0 R >>\nendobj\n",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica\n" +
        " /Encoding /WinAnsiEncoding >>\nendobj\n",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold\n" +
        " /Encoding /WinAnsiEncoding >>\nendobj\n",
        `6 0 obj\n<< /Length ${contentBytes} >>\nstream\n${content}\nendstream\nendobj\n`,
        obj7,
    ];

    let offset = 0;
    const offsets = [];
    for (const obj of objects) {
        offsets.push(offset);
        offset += Buffer.byteLength(obj, "utf8");
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

    return Buffer.from(objects.join("") + xrefLines.join("") + trailer, "utf8");
};

// ─── buildInvoiceDataFromPrebooking ──────────────────────────────────────────

const buildInvoiceDataFromPrebooking = (prebooking, options = {}) => {
    const invoiceNumber = options.invoiceNumber || `#PM${Date.now()}`;
    const invoiceDate = options.invoiceDate || new Date().toISOString();
    const billingCountry = options.billingCountry || "India";
    const locale = options.locale || "en-IN";
    const currency = prebooking.payment?.currency || "INR";
    const orderId = prebooking.payment?.orderId || invoiceNumber;

    const items = (prebooking.items || []).map((item) => {
        const paidAmount = parseNumericValue(item.price);
        const originalAmount = item.originalPrice ? parseNumericValue(item.originalPrice) : paidAmount;
        const discount = Number((originalAmount - paidAmount).toFixed(2));
        const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1;
        return computeLineItem({
            sku: undefined,
            name: item.title,
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
    buildInvoicePdfBuffer,
    buildInvoiceDataFromPrebooking,
};