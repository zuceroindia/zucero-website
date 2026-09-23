import { supabaseAdmin } from "@/lib/supabase-admin";

export type InvoiceOrder = {
  id: string;
  order_number: string;
  created_at: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    fullName?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  billing_address?: {
    fullName?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  subtotal_paise: number;
  subtotal_rupees?: number;
  discount_paise: number;
  discount_rupees?: number;
  shipping_paise: number;
  shipping_rupees?: number;
  tax_paise: number;
  tax_rupees?: number;
  total_paise: number;
  total_rupees?: number;
  tax_mode: "CGST_SGST" | "IGST";
  razorpay_payment_id?: string | null;
  courier_name?: string | null;
  tracking_awb?: string | null;
  estimated_delivery_window?: string | null;
};

export type InvoiceItem = {
  sku: string;
  product_name: string;
  variant_label: string;
  quantity: number;
  unit_price_paise: number;
  unit_price_rupees?: number;
  tax_paise: number;
  tax_rupees?: number;
  line_total_paise: number;
  line_total_rupees?: number;
};

// Convert number to Indian currency words
function numberToWords(num: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let res = "Rupees " + (rupees === 0 ? "Zero" : inWords(rupees));
  if (paise > 0) res += " and " + inWords(paise) + " Paise";
  return res + " Only";
}

function escapePdfText(text: string): string {
  return text
    .replace(/•/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/₹/g, "Rs ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export class SimplePdfDocument {
  private objects: string[] = [];

  private addObject(content: string): number {
    this.objects.push(content);
    return this.objects.length;
  }

  build(pageStreams: string[], width = 595.28, height = 841.89): Buffer {
    const fontRegular = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBold = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const pageObjIds: number[] = [];
    const pagesObjId = this.objects.length + pageStreams.length + 1;

    for (const stream of pageStreams) {
      const streamBuf = Buffer.from(stream, "utf-8");
      const contentId = this.addObject(`<< /Length ${streamBuf.length} >>\nstream\n${stream}\nendstream`);
      const pageId = this.addObject(
        `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageObjIds.push(pageId);
    }

    const pagesObj = this.addObject(
      `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`
    );
    const catalogObj = this.addObject(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

    let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets = [0];

    for (let i = 0; i < this.objects.length; i++) {
      offsets.push(Buffer.byteLength(out, "latin1"));
      out += `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(out, "latin1");
    out += `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= this.objects.length; i++) {
      const offset = String(offsets[i]).padStart(10, "0");
      out += `${offset} 00000 n \n`;
    }

    out += `trailer\n<< /Size ${this.objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
  }
}

export function generateInvoicePdfBuffer(order: InvoiceOrder, items: InvoiceItem[]): Buffer {
  const sellerGstin = process.env.SELLER_GSTIN?.trim() || "06AANCT1861C1ZF";
  const invoiceNumber = `INV-${order.order_number}`;
  const invoiceDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const address = order.shipping_address || {};
  const customerName = address.fullName || "Valued Customer";
  const customerPhone = address.phone || order.customer_phone;
  const customerEmail = address.email || order.customer_email;
  const customerAddr1 = address.addressLine1 || "";
  const customerAddr2 = address.addressLine2 || "";
  const customerCity = address.city || "";
  const customerState = address.state || "Haryana";
  const customerPostal = address.postalCode || "";

  const isIntraState = order.tax_mode === "CGST_SGST";
  const totalRupees = order.total_paise / 100;
  const amountInWords = numberToWords(totalRupees);

  // PDF drawing commands
  let s = "";

  // Helper for drawing text
  function text(x: number, y: number, str: string, font = "F1", size = 9, r = 0.08, g = 0.08, b = 0.08) {
    s += `${r} ${g} ${b} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(str)}) Tj ET\n`;
  }

  // Helper for drawing lines
  function line(x1: number, y1: number, x2: number, y2: number, lineWidth = 0.5) {
    s += `${lineWidth} w 0.2 0.2 0.2 RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
  }

  // Helper for drawing filled rectangle
  function rect(x: number, y: number, w: number, h: number, r = 0.95, g = 0.95, b = 0.95) {
    s += `${r} ${g} ${b} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
  }

  // --- Top Border Banner ---
  rect(36, 800, 523, 6, 0.06, 0.15, 0.11); // Dark green Zucero accent

  // --- Header ---
  text(36, 775, "ZUCERO", "F2", 22);
  text(36, 762, "THE GOOD SUGAR", "F1", 9);
  text(360, 775, "TAX INVOICE", "F2", 18);
  text(360, 762, "(Original for Recipient)", "F1", 8);

  line(36, 750, 559, 750, 1);

  // --- Seller & Invoice Meta Columns ---
  // Left: Seller Details
  text(36, 735, "Sold by (Supplier):", "F2", 9);
  text(36, 722, "TIARA TRIVERSE PRIVATE LIMITED", "F2", 10);
  text(36, 710, "G-165, Boulevard 83, Sector-83, Gurugram, Haryana 122004", "F1", 8.5);
  text(36, 698, "Regd. Office: Sector-2, Rohtak 124001, Haryana, India", "F1", 8.5);
  text(36, 686, `GSTIN: ${sellerGstin} | State: Haryana (06)`, "F1", 8.5);
  text(36, 674, "CIN: U56290HR2026PTC145994 | FSSAI: 20826018000800", "F1", 8.5);
  text(36, 662, "Website: www.thegoodsugar.in | Contact: +91 87963 49977", "F1", 8.5);

  // Right: Invoice & Order Metadata
  text(360, 735, `Invoice Number:`, "F1", 9);
  text(445, 735, invoiceNumber, "F2", 9);
  text(360, 721, `Invoice Date:`, "F1", 9);
  text(445, 721, invoiceDate, "F1", 9);
  text(360, 707, `Order Number:`, "F1", 9);
  text(445, 707, order.order_number, "F2", 9);
  text(360, 693, `Payment Ref:`, "F1", 9);
  text(445, 693, order.razorpay_payment_id || "Prepaid (Razorpay)", "F1", 8);
  text(360, 679, `Place of Supply:`, "F1", 9);
  text(445, 679, `${customerState} (India)`, "F1", 9);
  if (order.estimated_delivery_window) {
    text(360, 665, `Estimated Delivery:`, "F1", 8.5);
    text(445, 665, order.estimated_delivery_window, "F2", 8);
  }

  line(36, 650, 559, 650, 0.5);

  // --- Bill To & Ship To ---
  text(36, 637, "Billed & Shipped To:", "F2", 9);
  text(36, 624, customerName, "F2", 9.5);
  text(36, 612, `${customerAddr1}${customerAddr2 ? ", " + customerAddr2 : ""}`, "F1", 8.5);
  text(36, 600, `${customerCity}, ${customerState} - ${customerPostal}`, "F1", 8.5);
  text(36, 588, `Phone: ${customerPhone} | Email: ${customerEmail}`, "F1", 8.5);

  line(36, 575, 559, 575, 1);

  // --- Items Table Header ---
  const tableY = 558;
  rect(36, tableY - 4, 523, 16, 0.93, 0.95, 0.93);
  text(40, tableY, "#", "F2", 8.5);
  text(60, tableY, "Item Description", "F2", 8.5);
  text(225, tableY, "HSN", "F2", 8.5);
  text(270, tableY, "Qty", "F2", 8.5);
  text(310, tableY, "Rate (Rs)", "F2", 8.5);
  text(370, tableY, "Taxable (Rs)", "F2", 8.5);
  text(435, tableY, isIntraState ? "CGST+SGST" : "IGST (5%)", "F2", 8.5);
  text(505, tableY, "Total (Rs)", "F2", 8.5);
  line(36, tableY - 5, 559, tableY - 5, 0.5);

  // --- Items Table Rows ---
  let curY = tableY - 20;
  let allocatedDiscountPaise = 0;
  items.forEach((item, index) => {
    const rateRupees = (item.unit_price_paise / 100).toFixed(2);
    // Catalog prices are tax-exclusive. Allocate any order-level referral
    // discount proportionally, then calculate GST on the discounted value.
    const lineDiscountPaise = index === items.length - 1
      ? order.discount_paise - allocatedDiscountPaise
      : Math.round(order.discount_paise * item.line_total_paise / Math.max(1, order.subtotal_paise));
    allocatedDiscountPaise += lineDiscountPaise;
    const taxablePaise = Math.max(0, item.line_total_paise - lineDiscountPaise);
    const lineTaxPaise = Math.round(taxablePaise * 0.05);
    const lineGrossPaise = taxablePaise + lineTaxPaise;
    const lineTotalRupees = (lineGrossPaise / 100).toFixed(2);
    const lineTaxRupees = (lineTaxPaise / 100).toFixed(2);
    const taxableRupees = (taxablePaise / 100).toFixed(2);
    const hsn = item.sku.includes("KHA") ? "1701" : "1702";

    text(40, curY, String(index + 1), "F1", 8.5);
    text(60, curY, `${item.product_name} (${item.variant_label})`, "F2", 8.5);
    text(60, curY - 11, `SKU: ${item.sku}`, "F1", 7.5);
    text(225, curY, hsn, "F1", 8.5);
    text(275, curY, String(item.quantity), "F1", 8.5);
    text(310, curY, rateRupees, "F1", 8.5);
    text(370, curY, taxableRupees, "F1", 8.5);
    text(435, curY, lineTaxRupees, "F1", 8.5);
    text(505, curY, lineTotalRupees, "F2", 8.5);

    curY -= 26;
    line(36, curY + 12, 559, curY + 12, 0.2);
  });

  // --- Totals Section ---
  const summaryStartY = Math.min(curY, 440);
  line(36, summaryStartY, 559, summaryStartY, 0.5);

  const subtotalRupees = (order.subtotal_paise / 100).toFixed(2);
  const discountRupees = (order.discount_paise / 100).toFixed(2);
  const shippingRupees = (order.shipping_paise / 100).toFixed(2);
  const taxRupees = (order.tax_paise / 100).toFixed(2);
  const finalTotalRupees = (order.total_paise / 100).toFixed(2);

  // Left: Amount in Words & Notes
  text(36, summaryStartY - 16, "Amount in Words:", "F2", 9);
  text(36, summaryStartY - 28, amountInWords, "F1", 8.5);

  text(36, summaryStartY - 50, "Tax Summary:", "F2", 8.5);
  if (isIntraState) {
    const halfTax = (order.tax_paise / 200).toFixed(2);
    text(36, summaryStartY - 62, `• CGST @ 2.5%: Rs ${halfTax}`, "F1", 8);
    text(36, summaryStartY - 74, `• SGST @ 2.5%: Rs ${halfTax}`, "F1", 8);
  } else {
    text(36, summaryStartY - 62, `• IGST @ 5.0%: Rs ${taxRupees}`, "F1", 8);
  }

  // Right: Numerical Breakdown
  const rightX = 390;
  const rightValX = 490;
  let sy = summaryStartY - 16;

  text(rightX, sy, "Subtotal (Items):", "F1", 8.5);
  text(rightValX, sy, `Rs ${subtotalRupees}`, "F1", 8.5);
  sy -= 14;

  if (order.discount_paise > 0) {
    text(rightX, sy, "Referral Discount:", "F1", 8.5);
    text(rightValX, sy, `-Rs ${discountRupees}`, "F1", 8.5);
    sy -= 14;
  }

  text(rightX, sy, "Shipping & Delivery:", "F1", 8.5);
  text(rightValX, sy, order.shipping_paise > 0 ? `Rs ${shippingRupees}` : "FREE", "F1", 8.5);
  sy -= 14;

  text(rightX, sy, isIntraState ? "Total GST (CGST+SGST 5%):" : "Total GST (IGST 5%):", "F1", 8.5);
  text(rightValX, sy, `Rs ${taxRupees}`, "F1", 8.5);
  sy -= 18;

  rect(385, sy - 4, 174, 20, 0.93, 0.95, 0.93);
  text(390, sy + 2, "Invoice Total:", "F2", 10);
  text(rightValX - 5, sy + 2, `INR ${finalTotalRupees}`, "F2", 11);

  // --- Bottom Declaration & Signatory ---
  const bottomY = 120;
  line(36, bottomY, 559, bottomY, 0.5);

  text(36, bottomY - 14, "Declaration:", "F2", 8.5);
  text(36, bottomY - 26, "We declare that this invoice shows the actual price of the goods described and all particulars are true and correct.", "F1", 7.5);
  text(36, bottomY - 36, "Food product (Sugar & Mishri) returns are governed by Zucero returns & safety policy.", "F1", 7.5);
  text(36, bottomY - 48, "This is a computer-generated tax invoice and does not require a physical signature.", "F1", 7.5);

  text(410, bottomY - 14, "For TIARA TRIVERSE PVT. LTD.", "F2", 8.5);
  text(410, bottomY - 48, "Authorised Signatory", "F2", 8.5);

  // Bottom border line
  rect(36, 40, 523, 3, 0.06, 0.15, 0.11);

  const doc = new SimplePdfDocument();
  return doc.build([s]);
}

export async function generateInvoiceForOrder(orderId: string): Promise<{ buffer: Buffer; invoiceNumber: string; order: InvoiceOrder; items: InvoiceItem[] }> {
  const db = supabaseAdmin();
  const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).single();
  if (error || !order) throw new Error("Order not found for invoice generation");

  const isPlaced = order.payment_status === "captured" || ["paid", "processing", "shipped", "delivered"].includes(String(order.status).toLowerCase());
  if (!isPlaced) {
    throw new Error("Tax invoice can only be generated once the order is successfully placed.");
  }

  const { data: items } = await db.from("order_items").select("*").eq("order_id", orderId);
  const shippingAddress = order.shipping_address as { estimated_delivery_window?: string | null } | null;
  const invoiceOrder: InvoiceOrder = {
    ...order,
    estimated_delivery_window: order.estimated_delivery_window || shippingAddress?.estimated_delivery_window || null,
  };

  const buffer = generateInvoicePdfBuffer(invoiceOrder, (items as InvoiceItem[]) ?? []);
  return {
    buffer,
    invoiceNumber: `INV-${order.order_number}`,
    order: invoiceOrder,
    items: (items as InvoiceItem[]) ?? [],
  };
}
