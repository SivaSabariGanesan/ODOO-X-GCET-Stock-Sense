import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(255, "Category name cannot exceed 255 characters"),
  description: z.string().trim().optional(),
  color: z
    .string()
    .trim()
    .max(7, "Color code cannot exceed 7 characters")
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color hex format (e.g. #FF0000)")
    .optional()
    .nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name cannot be empty").max(255, "Category name cannot exceed 255 characters").optional(),
  description: z.string().trim().optional().nullable(),
  color: z
    .string()
    .trim()
    .max(7, "Color code cannot exceed 7 characters")
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color hex format (e.g. #FF0000)")
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

export const listCategoriesQuerySchema = z.object({
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
