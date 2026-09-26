import { z } from "zod";
import { deliveryStatusEnum } from "../../db/schema/deliveries.js";

// ---------------------------------------------------------------------------
// Delivery Core Zod Validation Schemas
// ---------------------------------------------------------------------------

export const createDeliveryItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  sourceLocationId: z
    .string()
    .uuid("Invalid source location ID format")
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

export const createDeliverySchema = z.object({
  deliveryNumber: z.string().trim().max(100).optional(),
  customerName: z.string().trim().max(255).optional(),
  customerReference: z.string().trim().max(255).optional(),
  notes: z.string().trim().optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format"),
  defaultSourceLocationId: z
    .string()
    .uuid("Invalid default source location ID format")
    .optional(),
  items: z.array(createDeliveryItemSchema).optional().default([]),
});

export const updateDeliverySchema = z.object({
  customerName: z.string().trim().max(255).optional(),
  customerReference: z.string().trim().max(255).optional(),
  notes: z.string().trim().optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  defaultSourceLocationId: z
    .string()
    .uuid("Invalid default source location ID format")
    .optional(),
});

export const updateDeliveryItemSchema = z.object({
  sourceLocationId: z
    .string()
    .uuid("Invalid source location ID format")
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

export const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(deliveryStatusEnum).optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
});
