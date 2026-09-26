import { z } from "zod";

export const createUomSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  abbreviation: z.string().trim().min(1, "Abbreviation is required").max(20, "Abbreviation cannot exceed 20 characters"),
  description: z.string().trim().optional(),
  measureType: z.string().trim().max(50, "Measure type cannot exceed 50 characters").optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateUomSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100, "Name cannot exceed 100 characters").optional(),
  abbreviation: z.string().trim().min(1, "Abbreviation cannot be empty").max(20, "Abbreviation cannot exceed 20 characters").optional(),
  description: z.string().trim().optional().nullable(),
  measureType: z.string().trim().max(50, "Measure type cannot exceed 50 characters").optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listUomsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
  measureType: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});
