import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { LocationService } from "./service.js";
import {
  createLocationSchema,
  updateLocationSchema,
  listLocationsQuerySchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const locationsRouter = new Hono();

// Protect all Location endpoints with authMiddleware
locationsRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/locations - Create Location
// ---------------------------------------------------------------------------
locationsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parseResult = createLocationSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid location data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const location = await LocationService.createLocation(parseResult.data, userId);
  return c.json({ data: location }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/locations - List Locations with Pagination, Hierarchy & Filtering
// ---------------------------------------------------------------------------
locationsRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listLocationsQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await LocationService.listLocations(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/locations/:id - Get Location Details
// ---------------------------------------------------------------------------
locationsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const location = await LocationService.getLocationById(id);
  return c.json({ data: location }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/locations/:id - Update Location
// ---------------------------------------------------------------------------
locationsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = updateLocationSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid update data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const updatedLocation = await LocationService.updateLocation(id, parseResult.data, userId);
  return c.json({ data: updatedLocation }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/locations/:id - Delete or Deactivate Location
// ---------------------------------------------------------------------------
locationsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await LocationService.deleteLocation(id);
  return c.json(result, 200);
});

export default locationsRouter;
