import { z } from "zod";

export const createWarehouseSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required").max(255, "Warehouse name cannot exceed 255 characters"),
  shortCode: z.string().trim().min(1, "Short code is required").max(10, "Short code cannot exceed 10 characters"),
  description: z.string().trim().optional(),
  address: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateWarehouseSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name cannot be empty").max(255, "Warehouse name cannot exceed 255 characters").optional(),
  shortCode: z.string().trim().min(1, "Short code cannot be empty").max(10, "Short code cannot exceed 10 characters").optional(),
  description: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listWarehousesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});
