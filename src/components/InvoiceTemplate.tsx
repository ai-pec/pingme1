import React from "react";
import { formatCurrency, formatDate, InvoiceData, InvoiceItem, TaxBreakdown } from "@/lib/invoiceUtils";
import "./InvoiceTemplate.css";

interface InvoiceTemplateProps {
  data: InvoiceData;
}

const getTaxCell = (item: InvoiceItem, currency: string, locale: string) => {
  if (item.igst > 0) {
    return (
      <>
        <td className="amount-cell">{formatCurrency(item.cgst, currency, locale)}</td>
        <td className="amount-cell">{formatCurrency(item.sgst, currency, locale)}</td>
        <td className="amount-cell">{formatCurrency(item.igst, currency, locale)}</td>
      </>
    );
  }

  return (
    <>
      <td className="amount-cell">{formatCurrency(item.cgst, currency, locale)}</td>
      <td className="amount-cell">{formatCurrency(item.sgst, currency, locale)}</td>
      <td className="amount-cell">-</td>
    </>
  );
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data }) => {
  const {
    company,
    invoiceNumber,
    orderId,
    invoiceDate,
    orderDate,
    invoiceType,
    billingCountry,
    currency,
    locale,
    paymentMode,
    qrCodeUrl,
    billTo,
    shipTo,
    items,
    totals,
    notes,
    footer,
    contact,
    returnPolicy,
    authorizedSignatory,
  } = data;

  return (
    <article className="invoice-root" id="invoice-root">
      <section className="invoice-page">
        <header className="invoice-header">
          <div className="company-block">
            <div className="company-title">{company.name}</div>
            <address className="company-address">
              {company.addressLines.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </address>
            <div className="company-ids">
              <div>GSTIN: {company.gstin}</div>
              <div>PAN: {company.pan}</div>
              <div>CIN: {company.cin}</div>
            </div>
          </div>

          <div className="invoice-header-meta">
            <div className="invoice-meta-box">
              <div className="meta-label">Invoice No.</div>
              <div className="meta-value">{invoiceNumber}</div>
            </div>
            <div className="invoice-qr-block">
              <img className="invoice-qr" src={qrCodeUrl} alt="Invoice QR Code" />
              <div className="qr-label">Scan to verify</div>
            </div>
          </div>
        </header>

        <div className="invoice-title-row">
          <div className="invoice-type">{invoiceType}</div>
        </div>

        <section className="invoice-details-panel">
          <table className="invoice-details-table">
            <tbody>
              <tr>
                <th>Order ID</th>
                <td>{orderId}</td>
                <th>PAN</th>
                <td>{company.pan}</td>
              </tr>
              <tr>
                <th>Order Date</th>
                <td>{formatDate(orderDate, locale)}</td>
                <th>CIN</th>
                <td>{company.cin}</td>
              </tr>
              <tr>
                <th>Invoice Date</th>
                <td>{formatDate(invoiceDate, locale)}</td>
                <th>Currency</th>
                <td>{currency}</td>
              </tr>
              <tr>
                <th>Payment Mode</th>
                <td>{paymentMode}</td>
                <th>State / Country</th>
                <td>{billingCountry}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="invoice-parties">
          <div className="party-column">
            <div className="party-title">Bill To</div>
            <div className="party-card">
              <div className="party-name">{billTo.name}</div>
              <div className="party-address">
                {billTo.addressLines.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
              {billTo.gstin && <div className="party-note">GSTIN: {billTo.gstin}</div>}
            </div>
          </div>

          <div className="party-column">
            <div className="party-title">Ship To</div>
            <div className="party-card">
              <div className="party-name">{shipTo.name}</div>
              <div className="party-address">
                {shipTo.addressLines.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
              {shipTo.gstin && <div className="party-note">GSTIN: {shipTo.gstin}</div>}
            </div>
          </div>
        </section>

        <section className="invoice-items-section">
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th className="product-cell">Product</th>
                <th>Qty</th>
                <th>Gross</th>
                <th>Discount</th>
                <th>Taxable Value</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>IGST</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="product-cell">
                    <div className="item-title">{item.name}</div>
                    {item.description && <div className="item-desc">{item.description}</div>}
                  </td>
                  <td className="center-cell">{item.quantity}</td>
                  <td className="amount-cell">{formatCurrency(item.grossAmount, currency, locale)}</td>
                  <td className="amount-cell">{formatCurrency(item.discount, currency, locale)}</td>
                  <td className="amount-cell">{formatCurrency(item.taxableValue, currency, locale)}</td>
                  {getTaxCell(item, currency, locale)}
                  <td className="amount-cell">{formatCurrency(item.total, currency, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="invoice-summary-section">
          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Quantity</span>
              <strong>{totals.totalQuantity}</strong>
            </div>
            <div className="summary-item">
              <span>Total Taxable</span>
              <strong>{formatCurrency(totals.totalTaxableValue, currency, locale)}</strong>
            </div>
            <div className="summary-item">
              <span>Total CGST</span>
              <strong>{formatCurrency(totals.totalCgst, currency, locale)}</strong>
            </div>
            <div className="summary-item">
              <span>Total SGST</span>
              <strong>{formatCurrency(totals.totalSgst, currency, locale)}</strong>
            </div>
            <div className="summary-item">
              <span>Total IGST</span>
              <strong>{formatCurrency(totals.totalIgst, currency, locale)}</strong>
            </div>
          </div>

          <div className="summary-total-block">
            <div className="total-label">Grand Total</div>
            <div className="total-value">{formatCurrency(totals.grandTotal, currency, locale)}</div>
          </div>
        </section>

        <section className="invoice-footer">
          <div className="footer-left">
            <div className="footer-heading">Payment Information</div>
            <div>{contact.bankDetails || "UPI / Netbanking / Cash"}</div>
            <div>{contact.email}</div>
            <div>{contact.phone}</div>
          </div>
          <div className="footer-right">
            <div className="signature-block">
              <div className="signature-label">Authorised Signatory</div>
              <div className="signature-name">{authorizedSignatory}</div>
            </div>
          </div>
        </section>

        <section className="invoice-notes">
          {notes.length > 0 && (
            <div className="notes-block">
              {notes.map((note, index) => (
                <div key={index} className="note-line">
                  • {note}
                </div>
              ))}
            </div>
          )}
          <div className="return-policy">
            <strong>Return Policy:</strong> {returnPolicy}
          </div>
          <div className="footer-company">
            {company.name} | {company.addressLines.join(", ")} | GSTIN: {company.gstin}
          </div>
          <div className="page-number">Page 1 of 1</div>
        </section>
      </section>
    </article>
  );
};
