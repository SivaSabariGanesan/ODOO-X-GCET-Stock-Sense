import { z } from "zod";
import { movementTypes, referenceTypes } from "../../db/schema/stock-movements";

export const dashboardStockQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  productId: z.string().uuid("Invalid product ID format").optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  locationId: z.string().uuid("Invalid location ID format").optional(),
  categoryId: z.string().uuid("Invalid category ID format").optional(),
  search: z.string().optional(),
  lowStock: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
});

export const dashboardLowStockQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  locationId: z.string().uuid("Invalid location ID format").optional(),
  productId: z.string().uuid("Invalid product ID format").optional(),
  search: z.string().optional(),
});

export const dashboardMovementsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  productId: z.string().uuid("Invalid product ID format").optional(),
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
  locationId: z.string().uuid("Invalid location ID format").optional(),
  movementType: z.enum(movementTypes).optional(),
  referenceType: z.enum(referenceTypes).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().optional(),
});
