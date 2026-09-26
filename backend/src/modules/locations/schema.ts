import { z } from "zod";

export const LOCATION_TYPES = [
  "internal",
  "input",
  "output",
  "quality_control",
  "virtual",
] as const;

export const createLocationSchema = z.object({
  warehouseId: z.string().uuid("Invalid warehouseId UUID format"),
  parentId: z.string().uuid("Invalid parentId UUID format").nullable().optional(),
  name: z
    .string({ required_error: "Location name is required" })
    .min(1, "Location name cannot be empty")
    .max(255, "Location name must not exceed 255 characters")
    .trim(),
  fullPath: z.string().min(1).trim().optional(),
  locationType: z.enum(LOCATION_TYPES).optional().default("internal"),
  isActive: z.boolean().optional().default(true),
});

export const updateLocationSchema = z.object({
  warehouseId: z.string().uuid("Invalid warehouseId UUID format").optional(),
  parentId: z.string().uuid("Invalid parentId UUID format").nullable().optional(),
  name: z
    .string()
    .min(1, "Location name cannot be empty")
    .max(255, "Location name must not exceed 255 characters")
    .trim()
    .optional(),
  fullPath: z.string().min(1).trim().optional(),
  locationType: z.enum(LOCATION_TYPES).optional(),
  isActive: z.boolean().optional(),
});

export const listLocationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  warehouseId: z.string().uuid().optional(),
  parentId: z.string().uuid().nullable().optional(),
  search: z.string().trim().optional(),
  locationType: z.string().optional(),
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }),
  sortBy: z.enum(["name", "fullPath", "locationType", "createdAt"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});
