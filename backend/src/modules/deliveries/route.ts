import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { DeliveryCoreService } from "./service.js";
import { DeliveryProcessingService } from "./processing.service.js";
import { DeliveryPdfService } from "./pdf.service.js";
import {
  createDeliverySchema,
  updateDeliverySchema,
  listDeliveriesQuerySchema,
  createDeliveryItemSchema,
  updateDeliveryItemSchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";


const deliveriesRouter = new Hono();

// Protect all delivery endpoints with authMiddleware
deliveriesRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/deliveries - Create Delivery
// ---------------------------------------------------------------------------
deliveriesRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createDeliverySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const delivery = await DeliveryCoreService.createDelivery(
    parseResult.data,
    user.id
  );
  return c.json({ data: delivery }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/deliveries - List Deliveries
// ---------------------------------------------------------------------------
deliveriesRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listDeliveriesQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await DeliveryCoreService.listDeliveries(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/deliveries/:id - Get Delivery by ID
// ---------------------------------------------------------------------------
deliveriesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const delivery = await DeliveryCoreService.getDelivery(id);
  return c.json({ data: delivery }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/deliveries/:id - Update Delivery Header
// ---------------------------------------------------------------------------
deliveriesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateDeliverySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const delivery = await DeliveryCoreService.updateDelivery(id, parseResult.data);
  return c.json({ data: delivery }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/deliveries/:id/cancel - Cancel Delivery
// ---------------------------------------------------------------------------
deliveriesRouter.post("/:id/cancel", async (c) => {
  const id = c.req.param("id");
  const delivery = await DeliveryCoreService.cancelDelivery(id);
  return c.json({ data: delivery, message: "Delivery cancelled successfully" }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/deliveries/:id/pick - Pick Delivery Workflow Step
// ---------------------------------------------------------------------------
deliveriesRouter.post("/:id/pick", async (c) => {
  const id = c.req.param("id");
  const delivery = await DeliveryCoreService.pickDelivery(id);
  return c.json({ data: delivery, message: "Delivery picked successfully" }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/deliveries/:id/pack - Pack Delivery Workflow Step
// ---------------------------------------------------------------------------
deliveriesRouter.post("/:id/pack", async (c) => {
  const id = c.req.param("id");
  const delivery = await DeliveryCoreService.packDelivery(id);
  return c.json({ data: delivery, message: "Delivery packed successfully" }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/deliveries/:id/validate - Validate Delivery Document

// ---------------------------------------------------------------------------
deliveriesRouter.post("/:id/validate", async (c) => {
  const id = c.req.param("id");
  const validationResult = await DeliveryCoreService.validateDelivery(id);
  return c.json({ data: validationResult }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/deliveries/:id/process - Process Delivery (Mutates Inventory)
// ---------------------------------------------------------------------------
deliveriesRouter.post("/:id/process", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const delivery = await DeliveryProcessingService.processDelivery(id, user.id);
  return c.json(
    { data: delivery, message: "Delivery processed successfully and stock decreased" },
    200
  );
});


// ---------------------------------------------------------------------------
// GET /api/deliveries/:id/pdf - Generate Delivery Note PDF
// ---------------------------------------------------------------------------
// Read-only endpoint: fetches delivery data and returns an A4 PDF.
// Does NOT modify stock, status, or any other data.
// Only available for deliveries in DONE status.
// ---------------------------------------------------------------------------
deliveriesRouter.get("/:id/pdf", async (c) => {
  const id = c.req.param("id");

  // Fetch complete delivery — throws DeliveryNotFoundError (404) if missing
  const delivery = await DeliveryCoreService.getDelivery(id);

  // Only DONE deliveries produce a printable note
  if (delivery.status !== "DONE") {
    throw new AppError(
      `Delivery Note PDF is only available for completed deliveries. Current status: ${delivery.status}`,
      422
    );
  }

  // Generate PDF bytes (pure read operation)
  const pdfBytes = await DeliveryPdfService.generate(delivery);

  // Build a safe ASCII filename
  const safeName = delivery.deliveryNumber.replace(/[^A-Za-z0-9\-_]/g, "-");
  const filename = `Delivery-Note-${safeName}.pdf`;

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(pdfBytes.byteLength),
      // Prevent browser from caching the blob so repeated prints stay fresh
      "Cache-Control": "no-store",
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/deliveries/:id/items - Add Delivery Item
// ---------------------------------------------------------------------------
deliveriesRouter.post("/:id/items", async (c) => {
  const deliveryId = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createDeliveryItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await DeliveryCoreService.addDeliveryItem(
    deliveryId,
    parseResult.data
  );
  return c.json({ data: item }, 201);
});

// ---------------------------------------------------------------------------
// PATCH /api/deliveries/:id/items/:itemId - Update Delivery Item
// ---------------------------------------------------------------------------
deliveriesRouter.patch("/:id/items/:itemId", async (c) => {
  const deliveryId = c.req.param("id");
  const itemId = c.req.param("itemId");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateDeliveryItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await DeliveryCoreService.updateDeliveryItem(
    deliveryId,
    itemId,
    parseResult.data
  );
  return c.json({ data: item }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/deliveries/:id/items/:itemId - Remove Delivery Item
// ---------------------------------------------------------------------------
deliveriesRouter.delete("/:id/items/:itemId", async (c) => {
  const deliveryId = c.req.param("id");
  const itemId = c.req.param("itemId");

  const result = await DeliveryCoreService.removeDeliveryItem(
    deliveryId,
    itemId
  );
  return c.json(result, 200);
});

export default deliveriesRouter;
