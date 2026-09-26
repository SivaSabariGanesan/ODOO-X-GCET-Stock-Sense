import {
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  StandardFonts,
  type RGB,
} from "pdf-lib";
import type { DeliveryWithDetails } from "./types.js";

// ---------------------------------------------------------------------------
// Delivery Note PDF Generator (StockSense Design System)
// ---------------------------------------------------------------------------
// Generates a clean, professional A4 Delivery Note PDF matching StockSense's
// Odoo-inspired purple & white operational design language.
// Pure read-only document generation — no DB writes, no stock mutation.
// ---------------------------------------------------------------------------

// ── Layout constants (points; 1 pt = 1/72 inch) ───────────────────────────
const PAGE_W = 595.28; // A4 width
const PAGE_H = 841.89; // A4 height
const MARGIN = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── StockSense & Odoo Color Palette ───────────────────────────────────────
const BRAND_PURPLE: RGB = rgb(0.443, 0.388, 0.620); // #71639e ($o-community-color)
const BRAND_DARK: RGB = rgb(0.353, 0.310, 0.502);   // #5a4f80 (primary hover / headings)
const BRAND_TINT: RGB = rgb(0.957, 0.949, 0.976);   // #f4f2f9 (table header / cards)
const BRAND_BORDER: RGB = rgb(0.898, 0.886, 0.941); // #e5e2f0 (subtle purple border)

const TEXT_DARK: RGB = rgb(0.129, 0.145, 0.161);    // #212529 ($o-main-headings-color)
const TEXT_BODY: RGB = rgb(0.286, 0.314, 0.341);    // #495057 ($o-main-text-color)
const TEXT_MUTED: RGB = rgb(0.424, 0.459, 0.490);   // #6c757d ($o-gray-600)
const BORDER_LIGHT: RGB = rgb(0.871, 0.886, 0.902); // #dee2e6 ($o-gray-300)
const BG_ALT: RGB = rgb(0.984, 0.988, 0.992);       // #f8f9fa ($o-gray-100)
const WHITE: RGB = rgb(1, 1, 1);

// Semantic Status Styles (matches frontend Badge.tsx)
const STATUS_STYLES: Record<string, { bg: RGB; text: RGB; border: RGB }> = {
  DONE: {
    bg: rgb(0.902, 0.957, 0.918),     // #e6f4ea (emerald-50)
    text: rgb(0.051, 0.396, 0.176),   // #0d652d (emerald-700)
    border: rgb(0.718, 0.882, 0.804), // #b7e1cd (emerald-200)
  },
  READY: {
    bg: rgb(1.0, 0.973, 0.882),       // #fff8e1 (amber-50)
    text: rgb(0.604, 0.420, 0.004),   // #9a6b01 (amber-700)
    border: rgb(0.996, 0.890, 0.655), // #feeeaa (amber-200)
  },
  WAITING: {
    bg: rgb(0.878, 0.957, 0.973),     // #e0f4f8 (sky-50)
    text: rgb(0.004, 0.502, 0.647),   // #0180a5 (sky-700)
    border: rgb(0.729, 0.898, 0.949), // #bae6fd (sky-200)
  },
  DRAFT: {
    bg: rgb(0.973, 0.976, 0.980),     // #f8f9fa (gray-100)
    text: rgb(0.286, 0.314, 0.341),   // #495057 (gray-700)
    border: rgb(0.871, 0.886, 0.902), // #dee2e6 (gray-200)
  },
  CANCELED: {
    bg: rgb(0.992, 0.910, 0.910),     // #fde8e8 (rose-50)
    text: rgb(0.824, 0.247, 0.227),   // #d23f3a (rose-700)
    border: rgb(0.988, 0.773, 0.773), // #fbc5c5 (rose-200)
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fillRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB
) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function strokeRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: RGB,
  borderWidth = 0.75
) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth });
}

function hRule(
  page: PDFPage,
  y: number,
  color: RGB = BORDER_LIGHT,
  thickness = 0.5
) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness,
    color,
  });
}

function sanitizePdfText(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (
    trimmed === "\u03A9" ||
    trimmed === "\u03A9:" ||
    trimmed === "\u2211" ||
    trimmed === "\u03A3"
  ) {
    return "Total Quantity";
  }
  return input
    .replace(/\b\u03A9\b/g, "Total Quantity")
    .replace(/([0-9]+)\s*\u03A9/g, "$1 Ohm")
    .replace(/\u03A9/g, " Ohm")
    .replace(/\u03C9/g, " ohm")
    .replace(/\u03A3/g, "Total ")
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00B7\u2022]/g, "-")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00D7/g, "x")
    .replace(/\u00B1/g, "+/-")
    .replace(/\u00B0/g, " deg")
    .replace(/\u00B5/g, "u")
    .replace(/[^\x20-\x7E\t\n\r]/g, "");
}

function trunc(text: string, maxChars: number): string {
  const safeText = sanitizePdfText(text);
  if (safeText.length <= maxChars) return safeText;
  return safeText.slice(0, Math.max(0, maxChars - 3)) + "...";
}

function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return sanitizePdfText(String(iso));
  }
}

function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return sanitizePdfText(String(iso));
  }
}

// ---------------------------------------------------------------------------
// Main Delivery PDF Service
// ---------------------------------------------------------------------------
export class DeliveryPdfService {
  /**
   * Generate a clean, Odoo-styled Delivery Note PDF for the given delivery.
   * Returns raw PDF bytes ready for streaming.
   */
  static async generate(delivery: DeliveryWithDetails): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([PAGE_W, PAGE_H]);

    // Fonts
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await doc.embedFont(StandardFonts.Helvetica);
    const fontMono = await doc.embedFont(StandardFonts.Courier);

    // ── 1. Top Brand Accent Line ──────────────────────────────────────────
    fillRect(page, 0, PAGE_H - 4, PAGE_W, 4, BRAND_PURPLE);

    // ── 2. Clean Header ───────────────────────────────────────────────────
    let cursorY = PAGE_H - 36;

    // StockSense logo/brand wordmark
    page.drawText("StockSense", {
      x: MARGIN,
      y: cursorY,
      size: 21,
      font: fontBold,
      color: BRAND_DARK,
    });

    // Subtitle
    page.drawText("INVENTORY & LOGISTICS MANAGEMENT", {
      x: MARGIN,
      y: cursorY - 14,
      size: 7,
      font: fontBold,
      color: TEXT_MUTED,
    });

    // Right-aligned Document Title
    const docTitle = "DELIVERY NOTE";
    const docTitleW = fontBold.widthOfTextAtSize(docTitle, 15);
    page.drawText(docTitle, {
      x: PAGE_W - MARGIN - docTitleW,
      y: cursorY,
      size: 15,
      font: fontBold,
      color: TEXT_DARK,
    });

    // Delivery Reference Number
    const refText = sanitizePdfText(delivery.deliveryNumber);
    const refW = fontMono.widthOfTextAtSize(refText, 9.5);
    page.drawText(refText, {
      x: PAGE_W - MARGIN - refW,
      y: cursorY - 14,
      size: 9.5,
      font: fontMono,
      color: BRAND_DARK,
    });

    // Status Badge (Pill Badge)
    const rawStatus = delivery.status || "DRAFT";
    const statusLabel = sanitizePdfText(rawStatus);
    const statusTheme = STATUS_STYLES[rawStatus] || STATUS_STYLES.DRAFT!;

    const statusTextW = fontBold.widthOfTextAtSize(statusLabel, 7.5);
    const badgeW = Math.max(54, statusTextW + 16);
    const badgeH = 16;
    const badgeX = PAGE_W - MARGIN - badgeW;
    const badgeY = cursorY - 36;

    fillRect(page, badgeX, badgeY, badgeW, badgeH, statusTheme.bg);
    strokeRect(page, badgeX, badgeY, badgeW, badgeH, statusTheme.border, 0.75);

    page.drawText(statusLabel, {
      x: badgeX + (badgeW - statusTextW) / 2,
      y: badgeY + 4.5,
      size: 7.5,
      font: fontBold,
      color: statusTheme.text,
    });

    cursorY = PAGE_H - 86;
    hRule(page, cursorY, BORDER_LIGHT, 0.75);
    cursorY -= 14;

    // ── 3. Partner & Logistics Cards ──────────────────────────────────────
    const CARD_GAP = 12;
    const CARD_W = (CONTENT_W - CARD_GAP) / 2;
    const CARD_H = 80;
    const cardsTopY = cursorY;
    const cardsBottomY = cardsTopY - CARD_H;

    // --- Left Card: Customer & Order ---
    const leftCardX = MARGIN;
    fillRect(page, leftCardX, cardsBottomY, CARD_W, CARD_H, BG_ALT);
    strokeRect(page, leftCardX, cardsBottomY, CARD_W, CARD_H, BORDER_LIGHT, 0.75);

    // Card Header Pill / Label
    page.drawText("CUSTOMER / RECIPIENT", {
      x: leftCardX + 12,
      y: cardsTopY - 15,
      size: 6.5,
      font: fontBold,
      color: TEXT_MUTED,
    });

    // Customer Name
    const customerName = trunc(delivery.customerName || "Standard Delivery", 34);
    page.drawText(customerName, {
      x: leftCardX + 12,
      y: cardsTopY - 29,
      size: 10.5,
      font: fontBold,
      color: TEXT_DARK,
    });

    // Customer Ref (SO)
    page.drawText("CUSTOMER REF (SO)", {
      x: leftCardX + 12,
      y: cardsTopY - 48,
      size: 6.5,
      font: fontBold,
      color: TEXT_MUTED,
    });
    const customerRef = trunc(delivery.customerReference || "-", 34);
    page.drawText(customerRef, {
      x: leftCardX + 12,
      y: cardsTopY - 60,
      size: 8.5,
      font: fontReg,
      color: TEXT_BODY,
    });

    // --- Right Card: Logistics & Fulfillment ---
    const rightCardX = MARGIN + CARD_W + CARD_GAP;
    fillRect(page, rightCardX, cardsBottomY, CARD_W, CARD_H, BG_ALT);
    strokeRect(page, rightCardX, cardsBottomY, CARD_W, CARD_H, BORDER_LIGHT, 0.75);

    const subCol1X = rightCardX + 12;
    const subCol2X = rightCardX + CARD_W / 2 + 4;

    // Col 1: Warehouse & Source Location
    page.drawText("WAREHOUSE", {
      x: subCol1X,
      y: cardsTopY - 15,
      size: 6.5,
      font: fontBold,
      color: TEXT_MUTED,
    });
    const warehouseStr = trunc(
      delivery.warehouse
        ? `${delivery.warehouse.name} (${delivery.warehouse.shortCode})`
        : delivery.warehouseId,
      20
    );
    page.drawText(warehouseStr, {
      x: subCol1X,
      y: cardsTopY - 27,
      size: 8,
      font: fontBold,
      color: TEXT_DARK,
    });

    page.drawText("SOURCE LOCATION", {
      x: subCol1X,
      y: cardsTopY - 48,
      size: 6.5,
      font: fontBold,
      color: TEXT_MUTED,
    });
    const locStr = trunc(
      delivery.defaultSourceLocation?.fullPath ||
        delivery.defaultSourceLocation?.name ||
        "Standard Outbound",
      20
    );
    page.drawText(locStr, {
      x: subCol1X,
      y: cardsTopY - 60,
      size: 8,
      font: fontReg,
      color: TEXT_BODY,
    });

    // Col 2: Delivery Date & Processed By
    page.drawText("DELIVERY DATE", {
      x: subCol2X,
      y: cardsTopY - 15,
      size: 6.5,
      font: fontBold,
      color: TEXT_MUTED,
    });
    const dateStr = fmtDate(delivery.validatedAt || delivery.createdAt);
    page.drawText(dateStr, {
      x: subCol2X,
      y: cardsTopY - 27,
      size: 8,
      font: fontBold,
      color: TEXT_DARK,
    });

    page.drawText("PROCESSED BY", {
      x: subCol2X,
      y: cardsTopY - 48,
      size: 6.5,
      font: fontBold,
      color: TEXT_MUTED,
    });
    const userStr = trunc(
      delivery.creator
        ? `${delivery.creator.name || delivery.creator.email}`
        : "System Administrator",
      20
    );
    page.drawText(userStr, {
      x: subCol2X,
      y: cardsTopY - 60,
      size: 8,
      font: fontReg,
      color: TEXT_BODY,
    });

    cursorY = cardsBottomY - 20;

    // ── 4. Dispatched Products Table ──────────────────────────────────────
    page.drawText("DISPATCHED PRODUCTS", {
      x: MARGIN,
      y: cursorY,
      size: 8,
      font: fontBold,
      color: BRAND_DARK,
    });
    cursorY -= 8;

    // Table Header Bar
    const TH_H = 22;
    const TH_Y = cursorY - TH_H;
    fillRect(page, MARGIN, TH_Y, CONTENT_W, TH_H, BRAND_TINT);
    strokeRect(page, MARGIN, TH_Y, CONTENT_W, TH_H, BRAND_BORDER, 0.75);

    const COL_WIDTHS = {
      idx: 26,
      product: CONTENT_W * 0.38,
      sku: CONTENT_W * 0.18,
      location: CONTENT_W * 0.24,
      qty: CONTENT_W * 0.20,
    };

    const COL_X = {
      idx: MARGIN + 8,
      product: MARGIN + COL_WIDTHS.idx + 6,
      sku: MARGIN + COL_WIDTHS.idx + COL_WIDTHS.product + 4,
      location: MARGIN + COL_WIDTHS.idx + COL_WIDTHS.product + COL_WIDTHS.sku + 4,
      qtyRight: PAGE_W - MARGIN - 12,
    };

    // Header labels
    page.drawText("#", {
      x: COL_X.idx,
      y: TH_Y + 7,
      size: 7,
      font: fontBold,
      color: BRAND_DARK,
    });
    page.drawText("PRODUCT NAME", {
      x: COL_X.product,
      y: TH_Y + 7,
      size: 7,
      font: fontBold,
      color: BRAND_DARK,
    });
    page.drawText("SKU", {
      x: COL_X.sku,
      y: TH_Y + 7,
      size: 7,
      font: fontBold,
      color: BRAND_DARK,
    });
    page.drawText("SOURCE LOCATION", {
      x: COL_X.location,
      y: TH_Y + 7,
      size: 7,
      font: fontBold,
      color: BRAND_DARK,
    });

    const qtyHdr = "QUANTITY";
    const qtyHdrW = fontBold.widthOfTextAtSize(qtyHdr, 7);
    page.drawText(qtyHdr, {
      x: COL_X.qtyRight - qtyHdrW,
      y: TH_Y + 7,
      size: 7,
      font: fontBold,
      color: BRAND_DARK,
    });

    cursorY = TH_Y;

    // Table Rows
    const items = delivery.items || [];
    const ROW_H = 24;
    let totalQty = 0;

    items.forEach((item, idx) => {
      const rowY = cursorY - (idx + 1) * ROW_H;

      // Alternating row background
      if (idx % 2 === 0) {
        fillRect(page, MARGIN, rowY, CONTENT_W, ROW_H, BG_ALT);
      }

      const qty = parseFloat(item.quantity.toString()) || 0;
      totalQty += qty;

      const productName = trunc(item.product?.name || "Unknown Product", 38);
      const sku = trunc(item.product?.sku || "-", 18);
      const location = trunc(
        item.sourceLocation?.name ||
          item.sourceLocation?.fullPath ||
          delivery.defaultSourceLocation?.name ||
          "Warehouse Stock",
        24
      );
      const qtyStr = sanitizePdfText(qty % 1 === 0 ? String(qty) : qty.toFixed(2));

      const textY = rowY + 8;

      // Index
      page.drawText(String(idx + 1), {
        x: COL_X.idx,
        y: textY,
        size: 7.5,
        font: fontReg,
        color: TEXT_MUTED,
      });

      // Product Name
      page.drawText(productName, {
        x: COL_X.product,
        y: textY,
        size: 8.5,
        font: fontBold,
        color: TEXT_DARK,
      });

      // SKU
      page.drawText(sku, {
        x: COL_X.sku,
        y: textY,
        size: 8,
        font: fontMono,
        color: TEXT_BODY,
      });

      // Location
      page.drawText(location, {
        x: COL_X.location,
        y: textY,
        size: 8,
        font: fontReg,
        color: TEXT_MUTED,
      });

      // Quantity (Right Aligned)
      const qtyValW = fontBold.widthOfTextAtSize(qtyStr, 9);
      page.drawText(qtyStr, {
        x: COL_X.qtyRight - qtyValW,
        y: textY,
        size: 9,
        font: fontBold,
        color: TEXT_DARK,
      });

      // Bottom row hairline divider
      page.drawLine({
        start: { x: MARGIN, y: rowY },
        end: { x: PAGE_W - MARGIN, y: rowY },
        thickness: 0.5,
        color: BORDER_LIGHT,
      });
    });

    cursorY -= items.length * ROW_H;

    // ── 5. Total Units Dispatched Row ─────────────────────────────────────
    const TOTAL_H = 24;
    const totalRowY = cursorY - TOTAL_H;
    fillRect(page, MARGIN, totalRowY, CONTENT_W, TOTAL_H, BRAND_TINT);
    strokeRect(page, MARGIN, totalRowY, CONTENT_W, TOTAL_H, BRAND_BORDER, 0.75);

    page.drawText("TOTAL UNITS DISPATCHED", {
      x: MARGIN + 12,
      y: totalRowY + 8,
      size: 7.5,
      font: fontBold,
      color: BRAND_DARK,
    });

    const totalStr = sanitizePdfText(
      totalQty % 1 === 0 ? String(totalQty) : totalQty.toFixed(2)
    );
    const totalW = fontBold.widthOfTextAtSize(totalStr, 10);
    page.drawText(totalStr, {
      x: COL_X.qtyRight - totalW,
      y: totalRowY + 7.5,
      size: 10,
      font: fontBold,
      color: BRAND_DARK,
    });

    cursorY = totalRowY - 24;

    // ── 6. Notes & Instructions (if present) ──────────────────────────────
    if (delivery.notes?.trim()) {
      page.drawText("DISPATCH NOTES", {
        x: MARGIN,
        y: cursorY,
        size: 7.5,
        font: fontBold,
        color: BRAND_DARK,
      });
      cursorY -= 8;

      const safeNotes = sanitizePdfText(delivery.notes);
      const noteWords = safeNotes.trim().split(" ");
      const noteLines: string[] = [];
      let currentLine = "";
      for (const word of noteWords) {
        if ((currentLine + " " + word).trim().length > 95) {
          if (currentLine) noteLines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + " " + word : word;
        }
      }
      if (currentLine) noteLines.push(currentLine.trim());

      const notesBoxH = Math.max(30, noteLines.length * 14 + 14);
      const notesBoxY = cursorY - notesBoxH;
      fillRect(page, MARGIN, notesBoxY, CONTENT_W, notesBoxH, BG_ALT);
      strokeRect(page, MARGIN, notesBoxY, CONTENT_W, notesBoxH, BORDER_LIGHT, 0.75);

      noteLines.slice(0, 4).forEach((line, i) => {
        page.drawText(line, {
          x: MARGIN + 10,
          y: cursorY - 14 - i * 14,
          size: 8,
          font: fontReg,
          color: TEXT_BODY,
        });
      });

      cursorY = notesBoxY - 24;
    }

    // ── 7. Signatures Block ───────────────────────────────────────────────
    const SIG_Y = Math.max(cursorY - 20, 115);
    const sigColW = (CONTENT_W - 32) / 3;

    const sigs = [
      { label: "Prepared by (Warehouse)", x: MARGIN },
      { label: "Inspected & Packed by", x: MARGIN + sigColW + 16 },
      { label: "Received by (Carrier / Consignee)", x: MARGIN + (sigColW + 16) * 2 },
    ];

    sigs.forEach(({ label, x }) => {
      // Signature line
      page.drawLine({
        start: { x, y: SIG_Y },
        end: { x: x + sigColW, y: SIG_Y },
        thickness: 0.75,
        color: BORDER_LIGHT,
      });

      // Role label
      page.drawText(label, {
        x,
        y: SIG_Y - 12,
        size: 7,
        font: fontBold,
        color: TEXT_MUTED,
      });

      // Date placeholder line
      page.drawText("Date: ________________________", {
        x,
        y: SIG_Y - 24,
        size: 6.5,
        font: fontReg,
        color: TEXT_MUTED,
      });
    });

    // ── 8. Footer ─────────────────────────────────────────────────────────
    const FOOTER_Y = 32;
    hRule(page, FOOTER_Y + 12, BORDER_LIGHT, 0.5);

    page.drawText(
      `StockSense Inventory Operations   •   Delivery Note ${sanitizePdfText(delivery.deliveryNumber)}   •   Generated ${fmtDateTime(new Date())}`,
      {
        x: MARGIN,
        y: FOOTER_Y,
        size: 7,
        font: fontReg,
        color: TEXT_MUTED,
      }
    );

    const pageLabel = "Page 1 of 1";
    const pageLabelW = fontReg.widthOfTextAtSize(pageLabel, 7);
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN - pageLabelW,
      y: FOOTER_Y,
      size: 7,
      font: fontReg,
      color: TEXT_MUTED,
    });

    // Serialize
    const pdfBytes = await doc.save();
    return pdfBytes;
  }
}
