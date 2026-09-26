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
// Delivery Note PDF Generator
// ---------------------------------------------------------------------------
// Generates a professional A4 Delivery Note PDF from a DeliveryWithDetails
// object. Pure read-only document generation — no DB writes, no stock mutation.
// ---------------------------------------------------------------------------

// ── Layout constants (points; 1 pt = 1/72 inch) ───────────────────────────
const PAGE_W = 595.28; // A4 width
const PAGE_H = 841.89; // A4 height
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Brand colour palette ───────────────────────────────────────────────────
const BRAND: RGB = rgb(0.235, 0.365, 0.902); // #3C5DE6 (brand blue)
const BRAND_DARK: RGB = rgb(0.176, 0.275, 0.722);
const SLATE_900: RGB = rgb(0.059, 0.094, 0.153);
const SLATE_700: RGB = rgb(0.22, 0.271, 0.361);
const SLATE_500: RGB = rgb(0.459, 0.51, 0.588);
const SLATE_200: RGB = rgb(0.878, 0.902, 0.933);
const WHITE: RGB = rgb(1, 1, 1);
const EMERALD: RGB = rgb(0.047, 0.635, 0.435); // status done badge

// ---------------------------------------------------------------------------
// Helper: draw a filled rectangle
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

// ---------------------------------------------------------------------------
// Helper: draw a horizontal rule
// ---------------------------------------------------------------------------
function hRule(
  page: PDFPage,
  y: number,
  color: RGB = SLATE_200,
  thickness = 0.5
) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness,
    color,
  });
}

// ---------------------------------------------------------------------------
// Helper: truncate text to fit a pixel budget (rough estimate by char count)
// ---------------------------------------------------------------------------
function trunc(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

// ---------------------------------------------------------------------------
// Helper: format an ISO date string into "Sep 26, 2026"
// ---------------------------------------------------------------------------
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Helper: format an ISO date string into "Sep 26, 2026, 10:45 AM"
// ---------------------------------------------------------------------------
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export class DeliveryPdfService {
  /**
   * Generate a Delivery Note PDF for the given delivery.
   * Returns the raw PDF bytes ready for streaming.
   */
  static async generate(delivery: DeliveryWithDetails): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([PAGE_W, PAGE_H]);

    // Embed fonts
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await doc.embedFont(StandardFonts.Helvetica);
    const fontMono = await doc.embedFont(StandardFonts.Courier);

    let cursorY = PAGE_H - MARGIN; // top of content area; decrements downward

    // ── 1. Header Banner ─────────────────────────────────────────────────
    const BANNER_H = 68;
    fillRect(page, 0, PAGE_H - BANNER_H, PAGE_W, BANNER_H, BRAND);

    // Company / app name
    page.drawText("StockSense", {
      x: MARGIN,
      y: PAGE_H - 28,
      size: 20,
      font: fontBold,
      color: WHITE,
    });

    // Sub-label
    page.drawText("Warehouse Management System", {
      x: MARGIN,
      y: PAGE_H - 44,
      size: 8,
      font: fontReg,
      color: rgb(0.78, 0.84, 0.98),
    });

    // Document title (right-aligned)
    const docTitle = "DELIVERY NOTE";
    const docTitleW = fontBold.widthOfTextAtSize(docTitle, 14);
    page.drawText(docTitle, {
      x: PAGE_W - MARGIN - docTitleW,
      y: PAGE_H - 30,
      size: 14,
      font: fontBold,
      color: WHITE,
    });

    // Reference number (right-aligned)
    const refText = delivery.deliveryNumber;
    const refW = fontMono.widthOfTextAtSize(refText, 10);
    page.drawText(refText, {
      x: PAGE_W - MARGIN - refW,
      y: PAGE_H - 46,
      size: 10,
      font: fontMono,
      color: rgb(0.78, 0.84, 0.98),
    });

    cursorY = PAGE_H - BANNER_H - 20;

    // ── 2. Status Badge ───────────────────────────────────────────────────
    const STATUS_BADGE_W = 64;
    const STATUS_BADGE_H = 18;
    const badgeX = PAGE_W - MARGIN - STATUS_BADGE_W;
    const badgeY = cursorY - STATUS_BADGE_H + 4;

    fillRect(page, badgeX, badgeY, STATUS_BADGE_W, STATUS_BADGE_H, EMERALD);
    const statusLabel = delivery.status;
    const statusLabelW = fontBold.widthOfTextAtSize(statusLabel, 7.5);
    page.drawText(statusLabel, {
      x: badgeX + (STATUS_BADGE_W - statusLabelW) / 2,
      y: badgeY + 5,
      size: 7.5,
      font: fontBold,
      color: WHITE,
    });

    // ── 3. Metadata Grid (2-column key-value) ────────────────────────────
    // Left column
    const metaItems: Array<[string, string]> = [
      ["Delivery Ref", delivery.deliveryNumber],
      [
        "Customer",
        trunc(delivery.customerName || "Not specified", 40),
      ],
      [
        "Customer Ref (SO)",
        trunc(delivery.customerReference || "—", 40),
      ],
      [
        "Warehouse",
        trunc(
          delivery.warehouse
            ? `${delivery.warehouse.name} (${delivery.warehouse.shortCode})`
            : delivery.warehouseId,
          40
        ),
      ],
      [
        "Source Location",
        trunc(
          delivery.defaultSourceLocation?.fullPath ||
            delivery.defaultSourceLocation?.name ||
            "Standard Outbound",
          40
        ),
      ],
      ["Delivery Date", fmtDate(delivery.validatedAt || delivery.createdAt)],
      ["Status", delivery.status],
      [
        "Processed By",
        delivery.creator
          ? trunc(`${delivery.creator.name} (${delivery.creator.email})`, 40)
          : "—",
      ],
    ];

    const COL1_X = MARGIN;
    const COL2_X = MARGIN + CONTENT_W / 2 + 10;
    const META_ROW_H = 20;
    const LABEL_SIZE = 7.5;
    const VALUE_SIZE = 9;

    const half = Math.ceil(metaItems.length / 2);
    const leftMeta = metaItems.slice(0, half);
    const rightMeta = metaItems.slice(half);

    cursorY -= 6;
    const metaStartY = cursorY;

    leftMeta.forEach(([label, value], i) => {
      const rowY = metaStartY - i * META_ROW_H;
      page.drawText(label, {
        x: COL1_X,
        y: rowY,
        size: LABEL_SIZE,
        font: fontReg,
        color: SLATE_500,
      });
      page.drawText(value, {
        x: COL1_X,
        y: rowY - 9,
        size: VALUE_SIZE,
        font: fontBold,
        color: SLATE_900,
      });
    });

    rightMeta.forEach(([label, value], i) => {
      const rowY = metaStartY - i * META_ROW_H;
      page.drawText(label, {
        x: COL2_X,
        y: rowY,
        size: LABEL_SIZE,
        font: fontReg,
        color: SLATE_500,
      });
      page.drawText(value, {
        x: COL2_X,
        y: rowY - 9,
        size: VALUE_SIZE,
        font: fontBold,
        color: SLATE_900,
      });
    });

    cursorY = metaStartY - Math.max(leftMeta.length, rightMeta.length) * META_ROW_H - 12;

    // ── 4. Section Divider ────────────────────────────────────────────────
    hRule(page, cursorY, BRAND, 1);
    cursorY -= 14;

    // ── 5. Product Lines Table ────────────────────────────────────────────
    // Table header
    page.drawText("PRODUCT LINES", {
      x: MARGIN,
      y: cursorY,
      size: 8,
      font: fontBold,
      color: BRAND,
    });
    cursorY -= 6;

    // Table header row background
    const TH_H = 20;
    fillRect(page, MARGIN, cursorY - TH_H + 4, CONTENT_W, TH_H, BRAND_DARK);

    const COL_WIDTHS = {
      idx: 24,
      product: CONTENT_W * 0.38,
      sku: CONTENT_W * 0.2,
      location: CONTENT_W * 0.2,
      qty: CONTENT_W * 0.12,
      // last col fills remainder
    };
    const COL_X = {
      idx: MARGIN,
      product: MARGIN + COL_WIDTHS.idx,
      sku: MARGIN + COL_WIDTHS.idx + COL_WIDTHS.product,
      location:
        MARGIN + COL_WIDTHS.idx + COL_WIDTHS.product + COL_WIDTHS.sku,
      qty:
        MARGIN +
        COL_WIDTHS.idx +
        COL_WIDTHS.product +
        COL_WIDTHS.sku +
        COL_WIDTHS.location,
    };

    const TH_LABELS: Array<[string, number]> = [
      ["#", COL_X.idx],
      ["Product Name", COL_X.product],
      ["SKU", COL_X.sku],
      ["Source Location", COL_X.location],
      ["Qty", COL_X.qty],
    ];

    TH_LABELS.forEach(([label, x]) => {
      page.drawText(label, {
        x: x + 3,
        y: cursorY - 12,
        size: 7.5,
        font: fontBold,
        color: WHITE,
      });
    });

    cursorY -= TH_H;

    // Table rows
    const items = delivery.items || [];
    const ROW_H = 22;
    let totalQty = 0;

    items.forEach((item, idx) => {
      const rowY = cursorY - (idx + 1) * ROW_H;

      // Alternating row background
      if (idx % 2 === 0) {
        fillRect(page, MARGIN, rowY - 2, CONTENT_W, ROW_H, rgb(0.973, 0.976, 0.984));
      }

      const qty = parseFloat(item.quantity.toString()) || 0;
      totalQty += qty;

      const productName = trunc(item.product?.name || "Unknown Product", 36);
      const sku = trunc(item.product?.sku || "—", 18);
      const location = trunc(
        item.sourceLocation?.name ||
          item.sourceLocation?.fullPath ||
          delivery.defaultSourceLocation?.name ||
          "Warehouse Stock",
        20
      );
      const qtyStr = qty % 1 === 0 ? String(qty) : qty.toFixed(2);

      const textY = rowY + 7;

      page.drawText(String(idx + 1), {
        x: COL_X.idx + 3,
        y: textY,
        size: 8,
        font: fontReg,
        color: SLATE_500,
      });
      page.drawText(productName, {
        x: COL_X.product + 3,
        y: textY,
        size: 8.5,
        font: fontBold,
        color: SLATE_900,
      });
      page.drawText(sku, {
        x: COL_X.sku + 3,
        y: textY,
        size: 8,
        font: fontMono,
        color: SLATE_700,
      });
      page.drawText(location, {
        x: COL_X.location + 3,
        y: textY,
        size: 8,
        font: fontReg,
        color: SLATE_700,
      });
      page.drawText(qtyStr, {
        x: COL_X.qty + 3,
        y: textY,
        size: 9,
        font: fontBold,
        color: SLATE_900,
      });

      // Bottom row border
      page.drawLine({
        start: { x: MARGIN, y: rowY - 2 },
        end: { x: PAGE_W - MARGIN, y: rowY - 2 },
        thickness: 0.3,
        color: SLATE_200,
      });
    });

    cursorY -= (items.length + 1) * ROW_H + 8;

    // ── 6. Totals Row ─────────────────────────────────────────────────────
    const TOTAL_ROW_Y = cursorY;
    fillRect(page, MARGIN, TOTAL_ROW_Y - 4, CONTENT_W, 22, rgb(0.235, 0.365, 0.902, ));

    page.drawText("TOTAL UNITS DISPATCHED", {
      x: MARGIN + CONTENT_W - 200,
      y: TOTAL_ROW_Y + 4,
      size: 8,
      font: fontBold,
      color: WHITE,
    });

    const totalStr =
      totalQty % 1 === 0 ? String(totalQty) : totalQty.toFixed(2);
    const totalW = fontBold.widthOfTextAtSize(totalStr, 11);
    page.drawText(totalStr, {
      x: PAGE_W - MARGIN - totalW - 6,
      y: TOTAL_ROW_Y + 3,
      size: 11,
      font: fontBold,
      color: WHITE,
    });

    cursorY = TOTAL_ROW_Y - 22;

    // ── 7. Notes Section (if present) ─────────────────────────────────────
    if (delivery.notes?.trim()) {
      cursorY -= 10;
      hRule(page, cursorY + 6, SLATE_200);
      cursorY -= 6;

      page.drawText("DISPATCH INSTRUCTIONS", {
        x: MARGIN,
        y: cursorY,
        size: 7.5,
        font: fontBold,
        color: SLATE_500,
      });
      cursorY -= 12;

      // Word-wrap notes into lines of ~100 chars
      const noteWords = delivery.notes.trim().split(" ");
      const noteLines: string[] = [];
      let currentLine = "";
      for (const word of noteWords) {
        if ((currentLine + " " + word).trim().length > 100) {
          if (currentLine) noteLines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + " " + word : word;
        }
      }
      if (currentLine) noteLines.push(currentLine.trim());

      for (const noteLine of noteLines.slice(0, 4)) {
        page.drawText(noteLine, {
          x: MARGIN + 4,
          y: cursorY,
          size: 8.5,
          font: fontReg,
          color: SLATE_700,
        });
        cursorY -= 12;
      }
    }

    // ── 8. Signature Block ────────────────────────────────────────────────
    const SIG_Y = Math.min(cursorY - 30, 180);
    hRule(page, SIG_Y + 30, SLATE_200);

    const sigCols = [
      { label: "Prepared by", x: MARGIN },
      { label: "Checked by", x: MARGIN + CONTENT_W / 3 },
      { label: "Received by", x: MARGIN + (CONTENT_W / 3) * 2 },
    ];

    sigCols.forEach(({ label, x }) => {
      page.drawLine({
        start: { x: x + 4, y: SIG_Y },
        end: { x: x + CONTENT_W / 3 - 16, y: SIG_Y },
        thickness: 0.7,
        color: SLATE_500,
      });
      page.drawText(label, {
        x: x + 4,
        y: SIG_Y - 12,
        size: 7.5,
        font: fontReg,
        color: SLATE_500,
      });
    });

    // ── 9. Footer ─────────────────────────────────────────────────────────
    const FOOTER_Y = 32;
    fillRect(page, 0, 0, PAGE_W, FOOTER_Y + 8, rgb(0.973, 0.976, 0.984));

    page.drawText(
      `Generated: ${fmtDateTime(new Date().toISOString())}   ·   StockSense WMS   ·   ${delivery.deliveryNumber}`,
      {
        x: MARGIN,
        y: FOOTER_Y - 4,
        size: 7,
        font: fontReg,
        color: SLATE_500,
      }
    );

    const pageLabel = "Page 1 of 1";
    const pageLabelW = fontReg.widthOfTextAtSize(pageLabel, 7);
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN - pageLabelW,
      y: FOOTER_Y - 4,
      size: 7,
      font: fontReg,
      color: SLATE_500,
    });

    // ── Serialize ──────────────────────────────────────────────────────────
    const pdfBytes = await doc.save();
    return pdfBytes;
  }
}
