import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(255, "Product name cannot exceed 255 characters"),
  sku: z.string().trim().min(1, "SKU is required").max(100, "SKU cannot exceed 100 characters"),
  description: z.string().trim().optional(),
  categoryId: z.string().uuid("Invalid category ID format").optional().nullable(),
  uomId: z.string().uuid("Invalid UOM ID format"),
  barcode: z.string().trim().max(100, "Barcode cannot exceed 100 characters").optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Product name cannot be empty").max(255, "Product name cannot exceed 255 characters").optional(),
  sku: z.string().trim().min(1, "SKU cannot be empty").max(100, "SKU cannot exceed 100 characters").optional(),
  description: z.string().trim().optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID format").optional().nullable(),
  uomId: z.string().uuid("Invalid UOM ID format").optional(),
  barcode: z.string().trim().max(100, "Barcode cannot exceed 100 characters").optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().uuid("Invalid category ID format").optional(),
  uomId: z.string().uuid("Invalid UOM ID format").optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});
