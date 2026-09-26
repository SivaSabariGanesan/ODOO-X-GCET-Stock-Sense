import { z } from "zod";

const quantitySchema = z
  .union([z.number(), z.string()])
  .transform((val) => String(val))
  .refine((val) => !isNaN(Number(val)), { message: "Must be a valid number" });

export const createReorderRuleSchema = z
  .object({
    productId: z.string().uuid("Invalid productId UUID format"),
    locationId: z.string().uuid("Invalid locationId UUID format"),
    minQuantity: quantitySchema.optional().default("0"),
    maxQuantity: quantitySchema.nullable().optional(),
    reorderQty: quantitySchema.optional().default("1"),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    const min = Number(data.minQuantity);
    const reorder = Number(data.reorderQty);

    if (min < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum quantity cannot be negative",
        path: ["minQuantity"],
      });
    }

    if (reorder <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reorder quantity must be greater than 0",
        path: ["reorderQty"],
      });
    }

    if (data.maxQuantity !== null && data.maxQuantity !== undefined) {
      const max = Number(data.maxQuantity);
      if (max < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Maximum quantity cannot be negative",
          path: ["maxQuantity"],
        });
      }
      if (max < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum quantity cannot be greater than maximum quantity",
          path: ["minQuantity"],
        });
      }
    }
  });

export const updateReorderRuleSchema = z.object({
  productId: z.string().uuid("Invalid productId UUID format").optional(),
  locationId: z.string().uuid("Invalid locationId UUID format").optional(),
  minQuantity: quantitySchema.optional(),
  maxQuantity: quantitySchema.nullable().optional(),
  reorderQty: quantitySchema.optional(),
  isActive: z.boolean().optional(),
});

export const listReorderRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }),
  sortBy: z
    .enum(["minQuantity", "maxQuantity", "reorderQty", "createdAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
