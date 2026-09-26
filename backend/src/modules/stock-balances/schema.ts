import { z } from "zod";

const quantitySchema = z
  .union([z.number(), z.string()])
  .transform((val) => String(val))
  .refine((val) => !isNaN(Number(val)), { message: "Must be a valid number" });

export const stockMutationSchema = z.object({
  productId: z.string().uuid("Invalid productId UUID format"),
  locationId: z.string().uuid("Invalid locationId UUID format"),
  quantity: quantitySchema,
});

export const transferStockPrimitiveSchema = z.object({
  productId: z.string().uuid("Invalid productId UUID format"),
  sourceLocationId: z.string().uuid("Invalid sourceLocationId UUID format"),
  destinationLocationId: z.string().uuid("Invalid destinationLocationId UUID format"),
  quantity: quantitySchema,
});

export const listBalancesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  hasStock: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }),
  minQuantity: quantitySchema.optional(),
  maxQuantity: quantitySchema.optional(),
  sortBy: z
    .enum(["quantity", "lastMovedAt", "createdAt", "productName"])
    .optional()
    .default("lastMovedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
