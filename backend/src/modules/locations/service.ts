import { db } from "../../db/client.js";
import { locations, type Location } from "../../db/schema/locations.js";
import { warehouses } from "../../db/schema/warehouses.js";
import { stockBalances } from "../../db/schema/stock-balances.js";
import { stockMovements } from "../../db/schema/stock-movements.js";
import { receipts } from "../../db/schema/receipts.js";
import { receiptItems } from "../../db/schema/receipt-items.js";
import { deliveries } from "../../db/schema/deliveries.js";
import { deliveryItems } from "../../db/schema/delivery-items.js";
import { internalTransfers } from "../../db/schema/internal-transfers.js";
import { inventoryAdjustments } from "../../db/schema/inventory-adjustments.js";
import { reorderRules } from "../../db/schema/reorder-rules.js";
import { eq, and, or, ilike, count, sql, asc, desc, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  LocationNotFoundError,
  WarehouseNotFoundError,
  ParentLocationNotFoundError,
  CrossWarehouseParentError,
  SelfParentError,
  CircularLocationHierarchyError,
  LocationHasChildrenError,
  LocationWarehouseMoveError,
} from "../../lib/errors.js";
import type {
  CreateLocationInput,
  UpdateLocationInput,
  ListLocationsQuery,
  LocationDetails,
  PaginatedLocationsResponse,
} from "./types.js";

export class LocationService {
  /**
   * Helper to check circular parent hierarchy.
   * Walks up from parentId; if targetLocationId is encountered as an ancestor, throws CircularLocationHierarchyError.
   */
  private static async validateNoCircularHierarchy(
    targetLocationId: string,
    proposedParentId: string
  ): Promise<void> {
    let currentId: string | null = proposedParentId;
    let depth = 0;
    const MAX_DEPTH = 50;

    while (currentId && depth < MAX_DEPTH) {
      if (currentId === targetLocationId) {
        throw new CircularLocationHierarchyError();
      }

      const [ancestor] = await db
        .select({ id: locations.id, parentId: locations.parentId })
        .from(locations)
        .where(eq(locations.id, currentId))
        .limit(1);

      if (!ancestor) break;
      currentId = ancestor.parentId;
      depth++;
    }
  }

  /**
   * Recursively update fullPath of all descendant locations when a location's fullPath changes.
   */
  private static async updateDescendantsFullPath(
    locationId: string,
    newParentFullPath: string
  ): Promise<void> {
    const children = await db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.parentId, locationId));

    for (const child of children) {
      const childFullPath = `${newParentFullPath} / ${child.name}`;
      await db
        .update(locations)
        .set({
          fullPath: childFullPath,
          updatedAt: new Date(),
        })
        .where(eq(locations.id, child.id));

      // Propagate down the tree
      await LocationService.updateDescendantsFullPath(child.id, childFullPath);
    }
  }

  /**
   * Create a new location
   */
  public static async createLocation(
    input: CreateLocationInput,
    userId?: string
  ): Promise<Location> {
    // 1. Validate Warehouse exists
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, input.warehouseId))
      .limit(1);

    if (!warehouse) {
      throw new WarehouseNotFoundError(input.warehouseId);
    }

    // 2. Validate Parent Location if provided
    let parentLocation: Location | undefined;
    if (input.parentId) {
      const [parent] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.parentId))
        .limit(1);

      if (!parent) {
        throw new ParentLocationNotFoundError(input.parentId);
      }

      if (parent.warehouseId !== input.warehouseId) {
        throw new CrossWarehouseParentError();
      }

      parentLocation = parent;
    }

    // 3. Compute fullPath if omitted
    let fullPath = input.fullPath?.trim();
    if (!fullPath) {
      if (parentLocation) {
        fullPath = `${parentLocation.fullPath} / ${input.name.trim()}`;
      } else {
        fullPath = `${warehouse.shortCode || warehouse.name} / ${input.name.trim()}`;
      }
    }

    // 4. Insert into database
    const [newLocation] = await db
      .insert(locations)
      .values({
        warehouseId: input.warehouseId,
        parentId: input.parentId || null,
        name: input.name.trim(),
        fullPath,
        locationType: input.locationType || "internal",
        isActive: input.isActive ?? true,
        createdBy: userId || null,
      })
      .returning();

    return newLocation;
  }

  /**
   * Get location details by ID
   */
  public static async getLocationById(id: string): Promise<LocationDetails> {
    const parentAlias = alias(locations, "parent");

    const [record] = await db
      .select({
        location: locations,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
        parentName: parentAlias.name,
        parentFullPath: parentAlias.fullPath,
      })
      .from(locations)
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(parentAlias, eq(locations.parentId, parentAlias.id))
      .where(eq(locations.id, id))
      .limit(1);

    if (!record) {
      throw new LocationNotFoundError(id);
    }

    // Count children
    const [{ childrenCount }] = await db
      .select({ childrenCount: count() })
      .from(locations)
      .where(eq(locations.parentId, id));

    return {
      ...record.location,
      warehouseName: record.warehouseName,
      warehouseShortCode: record.warehouseShortCode,
      parentName: record.parentName || undefined,
      parentFullPath: record.parentFullPath || undefined,
      childrenCount: Number(childrenCount || 0),
    };
  }

  /**
   * List locations with filtering & pagination
   */
  public static async listLocations(
    query: ListLocationsQuery
  ): Promise<PaginatedLocationsResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.warehouseId) {
      conditions.push(eq(locations.warehouseId, query.warehouseId));
    }

    if (query.parentId !== undefined) {
      if (query.parentId === null || query.parentId === "null") {
        conditions.push(isNull(locations.parentId));
      } else {
        conditions.push(eq(locations.parentId, query.parentId));
      }
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(locations.isActive, query.isActive));
    }

    if (query.locationType) {
      conditions.push(eq(locations.locationType, query.locationType));
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(locations.name, term),
          ilike(locations.fullPath, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total matching count query
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(locations)
      .where(whereClause);

    const total = Number(totalCount || 0);

    // Dynamic sorting
    let sortColumn = locations.name;
    if (query.sortBy === "fullPath") sortColumn = locations.fullPath as any;
    if (query.sortBy === "locationType") sortColumn = locations.locationType as any;
    if (query.sortBy === "createdAt") sortColumn = locations.createdAt as any;

    const orderFn = query.sortOrder === "desc" ? desc : asc;

    const parentAlias = alias(locations, "parent");

    const rows = await db
      .select({
        location: locations,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
        parentName: parentAlias.name,
        parentFullPath: parentAlias.fullPath,
      })
      .from(locations)
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(parentAlias, eq(locations.parentId, parentAlias.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const data: LocationDetails[] = rows.map((r) => ({
      ...r.location,
      warehouseName: r.warehouseName,
      warehouseShortCode: r.warehouseShortCode,
      parentName: r.parentName || undefined,
      parentFullPath: r.parentFullPath || undefined,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Update location master fields
   */
  public static async updateLocation(
    id: string,
    input: UpdateLocationInput,
    userId?: string
  ): Promise<Location> {
    // 1. Fetch existing location
    const [existing] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!existing) {
      throw new LocationNotFoundError(id);
    }

    const targetWarehouseId = input.warehouseId ?? existing.warehouseId;

    // 2. If warehouseId is changing, verify warehouse exists and check references
    let targetWarehouse = null;
    if (input.warehouseId && input.warehouseId !== existing.warehouseId) {
      // Check if location has references or child locations
      const [{ childrenCnt }] = await db
        .select({ childrenCnt: count() })
        .from(locations)
        .where(eq(locations.parentId, id));

      const [{ sbCount }] = await db
        .select({ sbCount: count() })
        .from(stockBalances)
        .where(eq(stockBalances.locationId, id));

      if (Number(childrenCnt) > 0 || Number(sbCount) > 0) {
        throw new LocationWarehouseMoveError();
      }

      [targetWarehouse] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, input.warehouseId))
        .limit(1);

      if (!targetWarehouse) {
        throw new WarehouseNotFoundError(input.warehouseId);
      }
    } else {
      [targetWarehouse] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, targetWarehouseId))
        .limit(1);
    }

    // 3. Parent location validation & hierarchy check
    const newParentId = input.parentId !== undefined ? input.parentId : existing.parentId;
    let newParentLocation: Location | null = null;

    if (newParentId) {
      if (newParentId === id) {
        throw new SelfParentError();
      }

      [newParentLocation] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, newParentId))
        .limit(1);

      if (!newParentLocation) {
        throw new ParentLocationNotFoundError(newParentId);
      }

      if (newParentLocation.warehouseId !== targetWarehouseId) {
        throw new CrossWarehouseParentError();
      }

      // Check circular dependency
      await LocationService.validateNoCircularHierarchy(id, newParentId);
    }

    // 4. Compute fullPath
    const newName = (input.name ?? existing.name).trim();
    let newFullPath = input.fullPath?.trim();

    if (!newFullPath) {
      if (newParentLocation) {
        newFullPath = `${newParentLocation.fullPath} / ${newName}`;
      } else {
        const whPrefix = targetWarehouse?.shortCode || targetWarehouse?.name || "WH";
        newFullPath = `${whPrefix} / ${newName}`;
      }
    }

    // 5. Update database record
    const [updatedLocation] = await db
      .update(locations)
      .set({
        warehouseId: targetWarehouseId,
        parentId: newParentId || null,
        name: newName,
        fullPath: newFullPath,
        locationType: input.locationType ?? existing.locationType,
        isActive: input.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, id))
      .returning();

    // 6. If fullPath changed, propagate down to children
    if (newFullPath !== existing.fullPath) {
      await LocationService.updateDescendantsFullPath(id, newFullPath);
    }

    return updatedLocation;
  }

  /**
   * Delete or deactivate location based on child locations & operational references
   */
  public static async deleteLocation(
    id: string
  ): Promise<{ success: boolean; message: string; mode: "deleted" | "deactivated" }> {
    // 1. Verify existence
    const [existing] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!existing) {
      throw new LocationNotFoundError(id);
    }

    // 2. Check child locations
    const [{ childCount }] = await db
      .select({ childCount: count() })
      .from(locations)
      .where(eq(locations.parentId, id));

    if (Number(childCount) > 0) {
      throw new LocationHasChildrenError();
    }

    // 3. Check operational references across system tables
    const [{ sbCount }] = await db
      .select({ sbCount: count() })
      .from(stockBalances)
      .where(eq(stockBalances.locationId, id));

    const [{ smCount }] = await db
      .select({ smCount: count() })
      .from(stockMovements)
      .where(
        or(
          eq(stockMovements.sourceLocationId, id),
          eq(stockMovements.destinationLocationId, id)
        )
      );

    const [{ recCount }] = await db
      .select({ recCount: count() })
      .from(receipts)
      .where(eq(receipts.defaultLocationId, id));

    const [{ recItemCount }] = await db
      .select({ recItemCount: count() })
      .from(receiptItems)
      .where(eq(receiptItems.destinationLocationId, id));

    const [{ delCount }] = await db
      .select({ delCount: count() })
      .from(deliveries)
      .where(eq(deliveries.defaultSourceLocationId, id));

    const [{ delItemCount }] = await db
      .select({ delItemCount: count() })
      .from(deliveryItems)
      .where(eq(deliveryItems.sourceLocationId, id));

    const [{ trCount }] = await db
      .select({ trCount: count() })
      .from(internalTransfers)
      .where(
        or(
          eq(internalTransfers.sourceLocationId, id),
          eq(internalTransfers.destinationLocationId, id)
        )
      );

    const [{ adjCount }] = await db
      .select({ adjCount: count() })
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.locationId, id));

    const [{ rrCount }] = await db
      .select({ rrCount: count() })
      .from(reorderRules)
      .where(eq(reorderRules.locationId, id));

    const totalReferences =
      Number(sbCount || 0) +
      Number(smCount || 0) +
      Number(recCount || 0) +
      Number(recItemCount || 0) +
      Number(delCount || 0) +
      Number(delItemCount || 0) +
      Number(trCount || 0) +
      Number(adjCount || 0) +
      Number(rrCount || 0);

    if (totalReferences > 0) {
      // Deactivate to preserve historical transaction audit logs
      await db
        .update(locations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(locations.id, id));

      return {
        success: true,
        message:
          "Location is referenced by existing inventory records and was deactivated to preserve data integrity",
        mode: "deactivated",
      };
    }

    // 4. Safe to hard-delete unreferenced location
    await db.delete(locations).where(eq(locations.id, id));

    return {
      success: true,
      message: "Location deleted successfully",
      mode: "deleted",
    };
  }
}
