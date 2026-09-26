import { z } from "zod";
import { receiptStatusEnum } from "../../db/schema/receipts";

// ---------------------------------------------------------------------------
// Receipt Core Zod Validation Schemas
// ---------------------------------------------------------------------------

export const createReceiptItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  destinationLocationId: z
    .string()
    .uuid("Invalid destination location ID format")
    .optional(),
  unitPrice: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (typeof val === "number" ? val.toString() : val)),
  notes: z.string().trim().optional(),
  quantity: z
    .union([z.string(), z.number()])
    .refine(
      (val) => {
        const num = typeof val === "number" ? val : parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Quantity must be a valid number greater than zero" }
    )
    .transform((val) => (typeof val === "number" ? val.toString() : val)),
});

export const createReceiptSchema = z.object({
  receiptNumber: z.string().trim().max(100).optional(),
  supplierName: z.string().trim().max(255).optional(),
  supplierReference: z.string().trim().max(255).optional(),
  notes: z.string().trim().optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format"),
  defaultLocationId: z.string().uuid("Invalid default location ID format").optional(),
  items: z.array(createReceiptItemSchema).optional().default([]),
});

export const updateReceiptSchema = z.object({
  supplierName: z.string().trim().max(255).optional(),
  supplierReference: z.string().trim().max(255).optional(),
  notes: z.string().trim().optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  defaultLocationId: z.string().uuid("Invalid default location ID format").optional(),
});

export const updateReceiptItemSchema = z.object({
  destinationLocationId: z
    .string()
    .uuid("Invalid destination location ID format")
    .optional(),
  unitPrice: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) =>
      val === undefined
        ? undefined
        : typeof val === "number"
        ? val.toString()
        : val
    ),
  notes: z.string().trim().optional(),
  quantity: z
    .union([z.string(), z.number()])
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true;
        const num = typeof val === "number" ? val : parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Quantity must be a valid number greater than zero" }
    )
    .transform((val) =>
      val === undefined
        ? undefined
        : typeof val === "number"
        ? val.toString()
        : val
    ),
});

export const listReceiptsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(receiptStatusEnum).optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
});
