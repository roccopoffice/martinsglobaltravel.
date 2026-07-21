const MGT_MARKUP_RATE = 0.06;

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

export function computeFlightPricing(airlineTotal, baseFare, currency) {
  const total = Number(airlineTotal) || 0;
  let baseFareAmt = baseFare != null && !Number.isNaN(Number(baseFare)) ? Number(baseFare) : total;
  if (baseFareAmt > total) baseFareAmt = total;
  baseFareAmt = Math.round(baseFareAmt * 100) / 100;

  const taxesFees = Math.max(0, Math.round((total - baseFareAmt) * 100) / 100);
  const serviceFee = Math.round(total * MGT_MARKUP_RATE * 100) / 100;
  const customerTotal = Math.round((total + serviceFee) * 100) / 100;

  return {
    markupRate: MGT_MARKUP_RATE,
    currency: currency || 'USD',
    baseFare: baseFareAmt,
    taxesFees,
    airlineTotal: total,
    serviceFee,
    customerTotal,
    baseFareCents: Math.round(baseFareAmt * 100),
    taxesFeesCents: Math.round(taxesFees * 100),
    airlineTotalCents: Math.round(total * 100),
    serviceFeeCents: Math.round(serviceFee * 100),
    priceCents: Math.round(customerTotal * 100),
    baseFareDisplay: formatMoney(baseFareAmt, currency),
    taxesFeesDisplay: formatMoney(taxesFees, currency),
    airlineTotalDisplay: formatMoney(total, currency),
    serviceFeeDisplay: formatMoney(serviceFee, currency),
    priceDisplay: formatMoney(customerTotal, currency),
  };
}
