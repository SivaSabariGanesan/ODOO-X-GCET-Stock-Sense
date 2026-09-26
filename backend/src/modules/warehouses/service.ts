import { db } from "../../db/client";
import { warehouses } from "../../db/schema/warehouses";
import { locations } from "../../db/schema/locations";
import { receipts } from "../../db/schema/receipts";
import { deliveries } from "../../db/schema/deliveries";
import {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  ListWarehousesQuery,
} from "./types";
import {
  WarehouseNotFoundError,
  DuplicateWarehouseError,
} from "../../lib/errors";
import { eq, ne, and, or, count, ilike } from "drizzle-orm";

export class WarehouseService {
  /**
   * Create a new Warehouse master record.
   */
  static async createWarehouse(
    input: CreateWarehouseInput,
    userId?: string
  ) {
    // Check if warehouse with same name or shortCode already exists (case-insensitive)
    const [existing] = await db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(
        or(
          ilike(warehouses.name, input.name),
          ilike(warehouses.shortCode, input.shortCode)
        )
      )
      .limit(1);

    if (existing) {
      throw new DuplicateWarehouseError(input.name);
    }

    try {
      const [newWarehouse] = await db
        .insert(warehouses)
        .values({
          name: input.name,
          shortCode: input.shortCode,
          description: input.description ?? null,
          address: input.address ?? null,
          isActive: input.isActive ?? true,
          createdBy: userId ?? null,
        })
        .returning();

      return newWarehouse;
    } catch (error: any) {
      if (error?.code === "23505" || error?.message?.includes("unique constraint")) {
        throw new DuplicateWarehouseError(input.name ?? input.shortCode);
      }
      throw error;
    }
  }

  /**
   * Get Warehouse details by ID
   */
  static async getWarehouseById(id: string) {
    const [wh] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, id))
      .limit(1);

    if (!wh) {
      throw new WarehouseNotFoundError(id);
    }

    return wh;
  }

  /**
   * List Warehouses with pagination, search, and filtering
   */
  static async listWarehouses(query: ListWarehousesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.isActive !== undefined) {
      conditions.push(eq(warehouses.isActive, query.isActive));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(warehouses.name, searchPattern),
          ilike(warehouses.shortCode, searchPattern),
          ilike(warehouses.description, searchPattern),
          ilike(warehouses.address, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const countQuery = db.select({ total: count() }).from(warehouses);
    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.total ?? 0);

    // Data query
    const selectQuery = db.select().from(warehouses);
    if (whereClause) {
      selectQuery.where(whereClause);
    }

    const data = await selectQuery
      .orderBy(warehouses.name)
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update Warehouse master record
   */
  static async updateWarehouse(
    id: string,
    input: UpdateWarehouseInput,
    userId?: string
  ) {
    const existing = await this.getWarehouseById(id);

    const checkConditions = [];
    if (input.name !== undefined && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      checkConditions.push(ilike(warehouses.name, input.name));
    }
    if (input.shortCode !== undefined && input.shortCode.toLowerCase() !== existing.shortCode.toLowerCase()) {
      checkConditions.push(ilike(warehouses.shortCode, input.shortCode));
    }

    if (checkConditions.length > 0) {
      const [duplicate] = await db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            or(...checkConditions),
            ne(warehouses.id, id)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new DuplicateWarehouseError(input.name ?? input.shortCode ?? "");
      }
    }

    try {
      const updateData: Partial<typeof warehouses.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.shortCode !== undefined) updateData.shortCode = input.shortCode;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const [updated] = await db
        .update(warehouses)
        .set(updateData)
        .where(eq(warehouses.id, id))
        .returning();

      return updated;
    } catch (error: any) {
      if (error?.code === "23505" || error?.message?.includes("unique constraint")) {
        throw new DuplicateWarehouseError(input.name ?? input.shortCode ?? "");
      }
      throw error;
    }
  }

  /**
   * Delete or deactivate Warehouse depending on references
   */
  static async deleteWarehouse(id: string): Promise<{ success: boolean; message: string; mode: "deleted" | "deactivated" }> {
    const warehouse = await this.getWarehouseById(id);

    // Check references in locations, receipts, and deliveries
    const [locRef] = await db.select({ id: locations.id }).from(locations).where(eq(locations.warehouseId, id)).limit(1);
    const [receiptRef] = await db.select({ id: receipts.id }).from(receipts).where(eq(receipts.warehouseId, id)).limit(1);
    const [deliveryRef] = await db.select({ id: deliveries.id }).from(deliveries).where(eq(deliveries.warehouseId, id)).limit(1);

    const isReferenced = Boolean(locRef || receiptRef || deliveryRef);

    if (isReferenced) {
      // Warehouse has locations or operations referencing it: deactivate to preserve historical integrity
      await db
        .update(warehouses)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(warehouses.id, id));

      return {
        success: true,
        message: `Warehouse '${warehouse.name}' is referenced by existing locations or inventory operations and was deactivated to preserve data integrity.`,
        mode: "deactivated",
      };
    }

    // Unreferenced: safe to hard delete
    await db.delete(warehouses).where(eq(warehouses.id, id));

    return {
      success: true,
      message: `Warehouse '${warehouse.name}' deleted successfully.`,
      mode: "deleted",
    };
  }
}
