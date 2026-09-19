export const ZUCERO_ORIGIN_STATE = "Haryana";
export const GST_RATE_BPS = 500;
export const ZUCADD10_CODE = "ZUCADD10";
export const ZUCADD10_DISCOUNT_BPS = 1000;

export function isIntraState(destinationState: string) {
  return destinationState.trim().toLowerCase() === ZUCERO_ORIGIN_STATE.toLowerCase();
}

export function normalizeCouponCode(code: string | null | undefined) {
  return (code ?? "").trim().toUpperCase();
}

export function calculateCouponDiscount(subtotalPaise: number, code: string | null | undefined) {
  if (normalizeCouponCode(code) !== ZUCADD10_CODE) return 0;
  return Math.round(subtotalPaise * ZUCADD10_DISCOUNT_BPS / 10000);
}

export function calculateTax(taxablePaise: number, destinationState: string) {
  const totalTaxPaise = Math.round(taxablePaise * GST_RATE_BPS / 10000);
  if (isIntraState(destinationState)) {
    const cgstPaise = Math.floor(totalTaxPaise / 2);
    return { mode: "CGST_SGST" as const, ratePercent: 5, cgstPaise, sgstPaise: totalTaxPaise - cgstPaise, igstPaise: 0, totalTaxPaise };
  }
  return { mode: "IGST" as const, ratePercent: 5, cgstPaise: 0, sgstPaise: 0, igstPaise: totalTaxPaise, totalTaxPaise };
}

export function calculateCheckoutTotal(subtotalPaise: number, destinationState: string, discountPaise = 0, shippingPaise = 0) {
  const normalizedDiscountPaise = Math.min(Math.max(Math.round(discountPaise), 0), subtotalPaise);
  const normalizedShippingPaise = Math.max(0, Math.round(shippingPaise));
  const discountedSubtotalPaise = subtotalPaise - normalizedDiscountPaise;
  const taxablePaise = discountedSubtotalPaise + normalizedShippingPaise;
  const tax = calculateTax(taxablePaise, destinationState);
  const totalPaise = taxablePaise + tax.totalTaxPaise;

  const toRupees = (paise: number) => Number((paise / 100).toFixed(2));

  return {
    subtotalPaise,
    subtotalRupees: toRupees(subtotalPaise),
    discountPaise: normalizedDiscountPaise,
    discountRupees: toRupees(normalizedDiscountPaise),
    discountedSubtotalPaise,
    discountedSubtotalRupees: toRupees(discountedSubtotalPaise),
    shippingPaise: normalizedShippingPaise,
    shippingRupees: toRupees(normalizedShippingPaise),
    taxablePaise,
    taxableRupees: toRupees(taxablePaise),
    totalPaise,
    totalRupees: toRupees(totalPaise),
    cgstRupees: toRupees(tax.cgstPaise),
    sgstRupees: toRupees(tax.sgstPaise),
    igstRupees: toRupees(tax.igstPaise),
    totalTaxRupees: toRupees(tax.totalTaxPaise),
    ...tax,
  };
}
