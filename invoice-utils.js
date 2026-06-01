/* PDF NOTES: These utility functions use only plain numbers and Intl formatting for reliable PDF rendering and locale-safe currency output. */

function calcIndianGST(taxableValue, gstRate = 0.18) {
  const totalTax = +(taxableValue * gstRate).toFixed(2);
  const splitTax = +(totalTax / 2).toFixed(2);
  return {
    cgst: splitTax,
    sgst: splitTax,
    igst: null,
    totalTax: totalTax
  };
}

function calcIGST(taxableValue, igstRate = 0.18) {
  const totalTax = +(taxableValue * igstRate).toFixed(2);
  return {
    cgst: null,
    sgst: null,
    igst: totalTax,
    totalTax: totalTax
  };
}

function calculateTax(taxableValue, customerCountry, gstRate = 0.18) {
  return String(customerCountry || '').trim().toLowerCase() === 'india'
    ? calcIndianGST(taxableValue, gstRate)
    : calcIGST(taxableValue, gstRate);
}

function formatCurrency(amount, currencyCode = 'INR', locale = 'en-IN') {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function computeLineItem(product, customerCountry) {
  const grossAmount = Number.isFinite(Number(product.grossAmount)) ? Number(product.grossAmount) : 0;
  const discount = Number.isFinite(Number(product.discount)) ? Number(product.discount) : 0;
  const taxableValue = +(grossAmount - discount).toFixed(2);
  const tax = calculateTax(taxableValue, customerCountry || 'India');
  const total = +(taxableValue + tax.totalTax).toFixed(2);

  return {
    ...product,
    taxableValue: taxableValue,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    total: total,
    totalTax: tax.totalTax
  };
}

function computeInvoiceTotals(products, customerCountry) {
  const items = Array.isArray(products) ? products : [];
  return items.reduce(
    function (acc, item) {
      const line = computeLineItem(item, customerCountry);
      acc.totalQty += Number.isFinite(Number(item.qty)) ? Number(item.qty) : 0;
      acc.totalTaxable = +(acc.totalTaxable + line.taxableValue).toFixed(2);
      acc.totalTax = +(acc.totalTax + line.totalTax).toFixed(2);
      acc.grandTotal = +(acc.grandTotal + line.total).toFixed(2);
      return acc;
    },
    { totalQty: 0, totalTaxable: 0, totalTax: 0, grandTotal: 0 }
  );
}
