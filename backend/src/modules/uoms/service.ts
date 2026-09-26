import { db } from "../../db/client";
import { unitsOfMeasure } from "../../db/schema/units-of-measure";
import { products } from "../../db/schema/products";
import {
  CreateUomInput,
  UpdateUomInput,
  ListUomsQuery,
} from "./types";
import {
  UomNotFoundError,
  DuplicateUomError,
} from "../../lib/errors";
import { eq, ne, and, or, count, ilike } from "drizzle-orm";

export class UomService {
  /**
   * Create a new Unit of Measure record.
   */
  static async createUom(
    input: CreateUomInput,
    userId?: string
  ) {
    // Check if UOM with same name or abbreviation already exists (case-insensitive)
    const [existing] = await db
      .select({ id: unitsOfMeasure.id })
      .from(unitsOfMeasure)
      .where(
        or(
          ilike(unitsOfMeasure.name, input.name),
          ilike(unitsOfMeasure.abbreviation, input.abbreviation)
        )
      )
      .limit(1);

    if (existing) {
      throw new DuplicateUomError(input.name);
    }

    const [newUom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: input.name,
        abbreviation: input.abbreviation,
        description: input.description ?? null,
        measureType: input.measureType ?? null,
        isActive: input.isActive ?? true,
        createdBy: userId ?? null,
      })
      .returning();

    return newUom;
  }

  /**
   * Get Unit of Measure by ID
   */
  static async getUomById(id: string) {
    const [uom] = await db
      .select()
      .from(unitsOfMeasure)
      .where(eq(unitsOfMeasure.id, id))
      .limit(1);

    if (!uom) {
      throw new UomNotFoundError(id);
    }

    return uom;
  }

  /**
   * List Units of Measure with pagination, search, and filtering
   */
  static async listUoms(query: ListUomsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.measureType) {
      conditions.push(eq(unitsOfMeasure.measureType, query.measureType));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(unitsOfMeasure.isActive, query.isActive));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(unitsOfMeasure.name, searchPattern),
          ilike(unitsOfMeasure.abbreviation, searchPattern),
          ilike(unitsOfMeasure.description, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const countQuery = db.select({ total: count() }).from(unitsOfMeasure);
    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.total ?? 0);

    // Data query
    const selectQuery = db.select().from(unitsOfMeasure);
    if (whereClause) {
      selectQuery.where(whereClause);
    }

    const data = await selectQuery
      .orderBy(unitsOfMeasure.name)
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
   * Update Unit of Measure record
   */
  static async updateUom(
    id: string,
    input: UpdateUomInput,
    userId?: string
  ) {
    const existing = await this.getUomById(id);

    const checkConditions = [];
    if (input.name !== undefined && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      checkConditions.push(ilike(unitsOfMeasure.name, input.name));
    }
    if (input.abbreviation !== undefined && input.abbreviation.toLowerCase() !== existing.abbreviation.toLowerCase()) {
      checkConditions.push(ilike(unitsOfMeasure.abbreviation, input.abbreviation));
    }

    if (checkConditions.length > 0) {
      const [duplicate] = await db
        .select({ id: unitsOfMeasure.id })
        .from(unitsOfMeasure)
        .where(
          and(
            or(...checkConditions),
            ne(unitsOfMeasure.id, id)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new DuplicateUomError(input.name ?? input.abbreviation ?? "");
      }
    }

    const updateData: Partial<typeof unitsOfMeasure.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.abbreviation !== undefined) updateData.abbreviation = input.abbreviation;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.measureType !== undefined) updateData.measureType = input.measureType;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(unitsOfMeasure)
      .set(updateData)
      .where(eq(unitsOfMeasure.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete or deactivate Unit of Measure depending on Product references
   */
  static async deleteUom(id: string): Promise<{ success: boolean; message: string; mode: "deleted" | "deactivated" }> {
    const uom = await this.getUomById(id);

    // Check if any product references this UOM
    const [productRef] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.uomId, id))
      .limit(1);

    if (productRef) {
      // UOM is referenced by products: deactivate instead of hard-deleting
      await db
        .update(unitsOfMeasure)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(unitsOfMeasure.id, id));

      return {
        success: true,
        message: `Unit of Measure '${uom.name}' is referenced by products and was deactivated to preserve data integrity.`,
        mode: "deactivated",
      };
    }

    // Unreferenced: safe to hard delete
    await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, id));

    return {
      success: true,
      message: `Unit of Measure '${uom.name}' deleted successfully.`,
      mode: "deleted",
    };
  }
}
