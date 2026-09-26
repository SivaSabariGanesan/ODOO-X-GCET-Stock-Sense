import { z } from "zod";
import { movementTypes, referenceTypes } from "../../db/schema/stock-movements";

export const listStockMovementsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  productId: z.string().uuid("Invalid product ID format").optional(),
  locationId: z.string().uuid("Invalid location ID format").optional(),
  sourceLocationId: z.string().uuid("Invalid source location ID format").optional(),
  destinationLocationId: z.string().uuid("Invalid destination location ID format").optional(),
  movementType: z.enum(movementTypes).optional(),
  referenceType: z.enum(referenceTypes).optional(),
  referenceId: z.string().uuid("Invalid reference ID format").optional(),
  createdBy: z.string().uuid("Invalid user ID format").optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().optional(),
});
