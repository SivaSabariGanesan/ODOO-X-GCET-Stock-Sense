import { z } from "zod";
import { inventoryAdjustmentStatusEnum } from "../../db/schema/inventory-adjustments";

export const createInventoryAdjustmentItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  countedQuantity: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Physical counted quantity must be a non-negative number (>= 0)",
    }),
});

export const createInventoryAdjustmentSchema = z.object({
  adjustmentNumber: z.string().min(1, "Adjustment number cannot be empty").optional(),
  reason: z.string().optional(),
  locationId: z.string().uuid("Invalid location ID format"),
  items: z.array(createInventoryAdjustmentItemSchema).optional(),
});

export const updateInventoryAdjustmentSchema = z.object({
  reason: z.string().optional(),
  locationId: z.string().uuid("Invalid location ID format").optional(),
});

export const updateInventoryAdjustmentItemSchema = z.object({
  countedQuantity: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Physical counted quantity must be a non-negative number (>= 0)",
    }),
});

export const listInventoryAdjustmentsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  status: z.enum(inventoryAdjustmentStatusEnum).optional(),
  locationId: z.string().uuid().optional(),
  search: z.string().optional(),
});
