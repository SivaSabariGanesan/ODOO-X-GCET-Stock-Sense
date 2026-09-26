import { z } from "zod";
import { internalTransferStatusEnum } from "../../db/schema/internal-transfers";

export const createInternalTransferItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Quantity must be a positive number greater than 0",
    }),
});

export const createInternalTransferSchema = z
  .object({
    transferNumber: z.string().min(1, "Transfer number cannot be empty").optional(),
    notes: z.string().optional(),
    sourceLocationId: z.string().uuid("Invalid source location ID format"),
    destinationLocationId: z.string().uuid("Invalid destination location ID format"),
    items: z.array(createInternalTransferItemSchema).optional(),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: "Source location and destination location must be different",
    path: ["destinationLocationId"],
  });

export const updateInternalTransferSchema = z.object({
  notes: z.string().optional(),
  sourceLocationId: z.string().uuid("Invalid source location ID format").optional(),
  destinationLocationId: z.string().uuid("Invalid destination location ID format").optional(),
});

export const updateInternalTransferItemSchema = z.object({
  quantity: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Quantity must be a positive number greater than 0",
    }),
});

export const listInternalTransfersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  status: z.enum(internalTransferStatusEnum).optional(),
  sourceLocationId: z.string().uuid().optional(),
  destinationLocationId: z.string().uuid().optional(),
  search: z.string().optional(),
});
