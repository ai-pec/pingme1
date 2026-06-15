// invoiceEmail.js — CommonJS version for Firebase Functions (Node.js)
"use strict";

const { formatDate } = require("./invoiceUtils");

const esc = (v) =>
    String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const fmtMoney = (v, currency) =>
    `${currency === "INR" ? "Rs." : currency + "&#160;"}${Number(v).toFixed(2)}`;

const FONT = "font-family:Helvetica,Arial,sans-serif;";
const BRAND = "#1a1a2e";
const GRAY_BG = "#f4f5f7";
const BORDER = "#d0d5dd";
const TEXT = "#1d2939";
const MUTED = "#667085";

// ─── section builders ─────────────────────────────────────────────────────────

const buildHeader = (inv) => {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
        inv.qrCodeUrl || inv.orderId
    )}`;
    const addressHtml = inv.company.addressLines.map((l) => `<div>${esc(l)}</div>`).join("");

    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:${BRAND};border-radius:8px 8px 0 0;">
  <tr>
    <td style="${FONT}padding:20px 24px;vertical-align:top;">
      <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:6px;">
        ${esc(inv.company.name)}
      </div>
      <div style="font-size:11px;color:#c9d1e9;line-height:1.6;">
        ${addressHtml}
        <div style="margin-top:6px;">
          <span style="margin-right:14px;">GSTIN:&#160;${esc(inv.company.gstin)}</span>
          <span style="margin-right:14px;">PAN:&#160;${esc(inv.company.pan)}</span>
          <span>CIN:&#160;${esc(inv.company.cin)}</span>
        </div>
      </div>
    </td>
    <td style="padding:20px 24px;text-align:right;vertical-align:top;width:130px;">
      <img src="${qrSrc}" width="90" height="90" alt="QR Code"
        style="display:block;margin-left:auto;border:3px solid #ffffff;border-radius:4px;" />
      <div style="${FONT}font-size:11px;font-weight:700;color:#ffffff;margin-top:6px;text-align:right;">
        ${esc(inv.invoiceNumber || inv.orderId || "")}
      </div>
      <div style="${FONT}font-size:10px;color:#c9d1e9;text-align:right;">
        ${esc((inv.invoiceType || "Tax Invoice").toUpperCase())}
      </div>
    </td>
  </tr>
</table>`;
};

const buildOrderInfo = (inv) => {
    const cells = [
        ["ORDER ID", inv.orderId],
        ["ORDER DATE", formatDate(inv.orderDate)],
        ["INVOICE DATE", formatDate(inv.invoiceDate)],
        ["PAN", inv.company.pan],
        ["PAYMENT MODE", inv.paymentMode],
    ];

    const tds = cells.map(([label, val]) => `
    <td style="${FONT}padding:10px 12px;border-right:1px solid ${BORDER};
          vertical-align:top;width:20%;">
      <div style="font-size:9px;color:${MUTED};text-transform:uppercase;
            letter-spacing:.5px;margin-bottom:4px;">${esc(label)}</div>
      <div style="font-size:12px;font-weight:700;color:${TEXT};
            word-break:break-all;">${esc(val)}</div>
    </td>`).join("");

    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:${GRAY_BG};border:1px solid ${BORDER};
         border-top:none;border-collapse:collapse;">
  <tr>${tds}</tr>
</table>`;
};

const buildParties = (inv) => {
    const party = (label, p) => {
        const addrHtml = p.addressLines.map((l) => `<div>${esc(l)}</div>`).join("");
        return `
    <td style="${FONT}padding:14px 16px;vertical-align:top;width:50%;
          border-right:1px solid ${BORDER};">
      <div style="font-size:9px;font-weight:700;color:${MUTED};
            text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">
        ${label}
      </div>
      <div style="font-size:13px;font-weight:700;color:${TEXT};margin-bottom:4px;">
        ${esc(p.name)}
      </div>
      <div style="font-size:11px;color:${MUTED};line-height:1.6;">${addrHtml}</div>
      ${p.gstin ? `<div style="font-size:11px;color:${MUTED};margin-top:4px;">GSTIN:&#160;${esc(p.gstin)}</div>` : ""}
    </td>`;
    };

    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid ${BORDER};border-top:none;border-collapse:collapse;">
  <tr>
    ${party("BILL TO", inv.billTo)}
    ${party("SHIP TO", inv.shipTo)}
  </tr>
</table>`;
};

const buildItemsTable = (inv) => {
    const headers = [
        { label: "PRODUCT&#160;/&#160;SKU", align: "left" },
        { label: "TITLE", align: "left" },
        { label: "QTY", align: "right" },
        { label: "GROSS&#160;AMT", align: "right" },
        { label: "DISCOUNT", align: "right" },
        { label: "TOTAL", align: "right" },
    ];

    const headerRow = headers.map((h) => `
    <th style="${FONT}padding:9px 10px;font-size:10px;font-weight:700;
          color:${MUTED};text-transform:uppercase;letter-spacing:.5px;
          text-align:${h.align};background:${GRAY_BG};
          border-bottom:2px solid ${BORDER};">${h.label}</th>`).join("");

    const itemRows = (inv.items || []).map((item, i) => {
        const bg = i % 2 === 1 ? GRAY_BG : "#ffffff";
        const sku = item.sku ?? item.name;
        return `
    <tr style="background:${bg};">
      <td style="${FONT}padding:10px;font-size:12px;color:${TEXT};
            border-bottom:1px solid ${BORDER};">${esc(sku)}</td>
      <td style="${FONT}padding:10px;font-size:12px;color:${TEXT};
            border-bottom:1px solid ${BORDER};">${esc(item.name)}</td>
      <td style="${FONT}padding:10px;font-size:12px;color:${TEXT};
            text-align:right;border-bottom:1px solid ${BORDER};">${item.quantity}</td>
      <td style="${FONT}padding:10px;font-size:12px;color:${TEXT};
            text-align:right;border-bottom:1px solid ${BORDER};">
        ${fmtMoney(item.grossAmount, inv.currency)}</td>
      <td style="${FONT}padding:10px;font-size:12px;color:#e04b4b;
            text-align:right;border-bottom:1px solid ${BORDER};">
        ${item.discount > 0 ? "-&#160;" + fmtMoney(item.discount, inv.currency) : "&#8212;"}</td>
      <td style="${FONT}padding:10px;font-size:12px;font-weight:700;color:${TEXT};
            text-align:right;border-bottom:1px solid ${BORDER};">
        ${fmtMoney(item.total, inv.currency)}</td>
    </tr>`;
    }).join("");

    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid ${BORDER};border-top:none;border-collapse:collapse;">
  <thead><tr>${headerRow}</tr></thead>
  <tbody>${itemRows}</tbody>
</table>`;
};

// FIX: replaced flexbox layout with table layout for reliable email client rendering
const buildTotals = (inv) => {
    const totalsRows = [
        ["Total Quantity", String(inv.totals.totalQuantity)],
        ["Total Amount", fmtMoney(inv.totals.totalAmount, inv.currency)],
    ];

    const notesHtml = `
  <td style="${FONT}padding:16px;vertical-align:top;width:50%;
        border-right:1px solid ${BORDER};">
    <div style="font-size:9px;font-weight:700;color:${MUTED};
          text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Notes</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${FONT}font-size:11px;color:${MUTED};line-height:1.8;
              padding:0;">Currency:&#160;${esc(inv.currency)}</td>
      </tr>
      <tr>
        <td style="${FONT}font-size:11px;color:${MUTED};line-height:1.8;
              padding:0;">GST&#160;inclusive&#160;in&#160;price</td>
      </tr>
      <tr>
        <td style="${FONT}font-size:11px;color:${MUTED};line-height:1.8;
              padding:0;">Payment:&#160;${esc(inv.paymentMode)}</td>
      </tr>
    </table>
  </td>`;

    const totalsHtml = `
  <td style="${FONT}padding:16px;vertical-align:top;width:50%;">
    ${totalsRows.map(([label, val]) => `
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
        style="margin-bottom:8px;">
        <tr>
          <td style="${FONT}font-size:12px;color:${TEXT};padding:0;">${esc(label)}</td>
          <td style="${FONT}font-size:12px;font-weight:600;color:${TEXT};
                text-align:right;padding:0;">${val}</td>
        </tr>
      </table>`).join("")}
    <div style="height:1px;background:${BORDER};margin:8px 0;"></div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${FONT}font-size:14px;font-weight:700;color:${BRAND};
              padding:0;">Grand&#160;Total</td>
        <td style="${FONT}font-size:14px;font-weight:700;color:${BRAND};
              text-align:right;padding:0;">${fmtMoney(inv.totals.grandTotal, inv.currency)}</td>
      </tr>
    </table>
  </td>`;

    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid ${BORDER};border-top:none;border-collapse:collapse;">
  <tr>${notesHtml}${totalsHtml}</tr>
</table>`;
};

const buildFooter = (inv) => `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="border:1px solid ${BORDER};border-top:none;border-collapse:collapse;">
  <tr>
    <td style="${FONT}padding:14px 16px;vertical-align:top;width:50%;
          border-right:1px solid ${BORDER};">
      <div style="font-size:9px;font-weight:700;color:${MUTED};
            text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Return Policy</div>
      <div style="font-size:11px;color:${MUTED};line-height:1.6;">
        ${esc(inv.returnPolicy)}
      </div>
    </td>
    <td style="${FONT}padding:14px 16px;vertical-align:top;width:50%;">
      <div style="font-size:9px;font-weight:700;color:${MUTED};
            text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Contact</div>
      <div style="font-size:11px;color:${MUTED};line-height:1.6;">
        <div>&#9993;&#160;${esc(inv.contact.email)}</div>
        <div>&#128222;&#160;${esc(inv.contact.phone)}</div>
      </div>
    </td>
  </tr>
</table>`;

const buildSignatory = (inv) => `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:${GRAY_BG};border:1px solid ${BORDER};border-top:none;
         border-radius:0 0 8px 8px;">
  <tr>
    <td style="${FONT}padding:16px 20px;vertical-align:bottom;">
      <div style="width:120px;height:1px;background:${TEXT};margin-bottom:4px;"></div>
      <div style="font-size:10px;color:${MUTED};text-transform:uppercase;
            letter-spacing:.5px;">Authorized&#160;Signatory</div>
      <div style="font-size:12px;font-weight:700;color:${TEXT};margin-top:2px;">
        ${esc(inv.authorizedSignatory || inv.company.name)}
      </div>
    </td>
    <td style="${FONT}padding:16px 20px;text-align:right;vertical-align:middle;">
      <div style="font-size:11px;color:${MUTED};">${esc(inv.company.name)}</div>
      <div style="font-size:10px;color:${MUTED};">Page&#160;1&#160;of&#160;1</div>
    </td>
  </tr>
</table>`;

// ─── main export ──────────────────────────────────────────────────────────────

const buildInvoiceEmailHtml = (inv) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Invoice ${esc(inv.invoiceNumber || inv.orderId || "")} - ${esc(inv.company.name)}</title>
</head>
<body style="margin:0;padding:0;background:#eef0f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#eef0f4;padding:32px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;margin-bottom:16px;">
          <tr>
            <td style="${FONT}font-size:15px;color:${TEXT};line-height:1.6;padding:0 4px 8px;">
              Hi <strong>${esc(inv.billTo.name)}</strong>,<br/>
              Thank you for your order! Here is your invoice summary.
              A PDF copy is also attached to this email.
            </td>
          </tr>
        </table>

        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;border-radius:8px;overflow:hidden;
                 box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <tr><td>
            ${buildHeader(inv)}
            ${buildOrderInfo(inv)}
            ${buildParties(inv)}
            ${buildItemsTable(inv)}
            ${buildTotals(inv)}
            ${buildFooter(inv)}
            ${buildSignatory(inv)}
          </td></tr>
        </table>

        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;margin-top:16px;">
          <tr>
            <td style="${FONT}font-size:11px;color:${MUTED};text-align:center;
                  line-height:1.7;padding:0 4px;">
              This is a computer-generated invoice and does not require a physical signature.<br/>
              For queries, contact us at
              <a href="mailto:${esc(inv.contact.email)}"
                style="color:#0066cc;">${esc(inv.contact.email)}</a>
              or call ${esc(inv.contact.phone)}.<br/>
              &copy; ${new Date().getFullYear()} ${esc(inv.company.name)}. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

module.exports = { buildInvoiceEmailHtml };