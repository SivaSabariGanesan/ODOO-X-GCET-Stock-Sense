import { z } from "zod";
import { movementTypes, referenceTypes } from "../../db/schema/stock-movements";

export const recordMovementSchema = z
  .object({
    productId: z.string().uuid("Invalid product ID format"),
    sourceLocationId: z.string().uuid("Invalid source location ID format").nullable().optional(),
    destinationLocationId: z.string().uuid("Invalid destination location ID format").nullable().optional(),
    quantity: z
      .union([z.number(), z.string()])
      .refine(
        (val) => {
          const num = typeof val === "number" ? val : parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: "Quantity must be a positive number greater than zero" }
      ),
    movementType: z.enum(movementTypes),
    referenceType: z.enum(referenceTypes),
    referenceId: z.string().uuid("Invalid reference ID format"),
    createdBy: z.string().uuid("Invalid user ID format").nullable().optional(),
  })
  .refine(
    (data) => Boolean(data.sourceLocationId || data.destinationLocationId),
    {
      message: "Stock movement must specify at least a source location or destination location",
      path: ["sourceLocationId"],
    }
  );

export const recordTransferMovementsSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  sourceLocationId: z.string().uuid("Invalid source location ID format"),
  destinationLocationId: z.string().uuid("Invalid destination location ID format"),
  quantity: z
    .union([z.number(), z.string()])
    .refine(
      (val) => {
        const num = typeof val === "number" ? val : parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Quantity must be a positive number greater than zero" }
    ),
  referenceType: z.enum(referenceTypes).default("INTERNAL_TRANSFER"),
  referenceId: z.string().uuid("Invalid reference ID format"),
  createdBy: z.string().uuid("Invalid user ID format").nullable().optional(),
}).refine(
  (data) => data.sourceLocationId !== data.destinationLocationId,
  {
    message: "Source location and destination location must be different",
    path: ["destinationLocationId"],
  }
);

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
  warehouseId: z.string().uuid("Invalid warehouse ID format").optional(),
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
