import { db } from "../../db/client";
import { stockMovements, StockMovement, ReferenceType } from "../../db/schema/stock-movements";
import { products } from "../../db/schema/products";
import { locations } from "../../db/schema/locations";
import { users } from "../../db/schema/users";
import { stockMovementsTotal } from "../../lib/metrics.js";
import {
  ListStockMovementsQuery,
  RecordMovementInput,
  RecordTransferMovementsInput,
  StockMovementWithDetails,
  PaginatedStockMovementsResponse,
} from "./types";
import {
  StockMovementNotFoundError,
  ProductNotFoundError,
  LocationNotFoundError,
  AppError,
} from "../../lib/errors";
import { recordMovementSchema, recordTransferMovementsSchema } from "./schema";
import { eq, and, or, gte, lte, sql, count, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const sourceLocAlias = alias(locations, "sourceLoc");
const destLocAlias = alias(locations, "destLoc");

export class StockLedgerService {
  /**
   * Authoritative Stock Ledger Method: Records an immutable stock movement record.
   * Must participate in the caller's outer database transaction context `tx` if provided.
   *
   * Validates product, location(s), positive quantity, and movement types.
   * Does NOT mutate current stock balances (stock balances are owned by StockBalanceService).
   */
  static async recordMovement(
    input: RecordMovementInput,
    tx?: any
  ): Promise<StockMovement> {
    const executor = tx ?? db;

    // 1. Schema Validation
    const parseResult = recordMovementSchema.safeParse(input);
    if (!parseResult.success) {
      throw new AppError("Invalid stock movement data", 400, parseResult.error.flatten());
    }

    const qtyNum = typeof input.quantity === "number" ? input.quantity : parseFloat(input.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new AppError(`Invalid quantity '${input.quantity}' for stock movement. Quantity must be a positive number.`, 400);
    }

    // 2. Verify Product Existence
    const [prod] = await executor
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!prod) {
      throw new ProductNotFoundError(input.productId);
    }

    // 3. Verify Source Location Existence if provided
    if (input.sourceLocationId) {
      const [srcLoc] = await executor
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, input.sourceLocationId))
        .limit(1);

      if (!srcLoc) {
        throw new LocationNotFoundError(input.sourceLocationId);
      }
    }

    // 4. Verify Destination Location Existence if provided
    if (input.destinationLocationId) {
      const [destLoc] = await executor
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, input.destinationLocationId))
        .limit(1);

      if (!destLoc) {
        throw new LocationNotFoundError(input.destinationLocationId);
      }
    }

    // 5. Format quantity to standard DB 4-decimal string representation
    const formattedQty = qtyNum.toFixed(4);

    // 6. Insert Append-Only Immutable Stock Movement Record
    const [inserted] = await executor
      .insert(stockMovements)
      .values({
        productId: input.productId,
        sourceLocationId: input.sourceLocationId ?? null,
        destinationLocationId: input.destinationLocationId ?? null,
        quantity: formattedQty,
        movementType: input.movementType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    try {
      stockMovementsTotal.inc({ movement_type: inserted.movementType });
    } catch {}

    return inserted;
  }

  /**
   * Helper primitive for recording internal transfer movements.
   * Records a transfer movement connecting source location and destination location.
   */
  static async recordTransferMovements(
    input: RecordTransferMovementsInput,
    tx?: any
  ): Promise<StockMovement> {
    const parseResult = recordTransferMovementsSchema.safeParse(input);
    if (!parseResult.success) {
      throw new AppError("Invalid internal transfer movement data", 400, parseResult.error.flatten());
    }

    return StockLedgerService.recordMovement(
      {
        productId: input.productId,
        sourceLocationId: input.sourceLocationId,
        destinationLocationId: input.destinationLocationId,
        quantity: input.quantity,
        movementType: "TRANSFER",
        referenceType: input.referenceType ?? "INTERNAL_TRANSFER",
        referenceId: input.referenceId,
        createdBy: input.createdBy,
      },
      tx
    );
  }

  /**
   * Authoritative Stock Ledger Method: Read-only query for historical stock movements.
   * Supports filtering by product, warehouse, location, movementType, referenceType, date range, search, and pagination.
   */
  static async listMovements(
    query: ListStockMovementsQuery,
    tx?: any
  ): Promise<PaginatedStockMovementsResponse> {
    const executor = tx ?? db;
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.productId) {
      conditions.push(eq(stockMovements.productId, query.productId));
    }

    if (query.warehouseId) {
      conditions.push(
        or(
          eq(sourceLocAlias.warehouseId, query.warehouseId),
          eq(destLocAlias.warehouseId, query.warehouseId)
        )
      );
    }

    if (query.locationId) {
      conditions.push(
        or(
          eq(stockMovements.sourceLocationId, query.locationId),
          eq(stockMovements.destinationLocationId, query.locationId)
        )
      );
    }

    if (query.sourceLocationId) {
      conditions.push(eq(stockMovements.sourceLocationId, query.sourceLocationId));
    }

    if (query.destinationLocationId) {
      conditions.push(eq(stockMovements.destinationLocationId, query.destinationLocationId));
    }

    if (query.movementType) {
      conditions.push(eq(stockMovements.movementType, query.movementType));
    }

    if (query.referenceType) {
      conditions.push(eq(stockMovements.referenceType, query.referenceType));
    }

    if (query.referenceId) {
      conditions.push(eq(stockMovements.referenceId, query.referenceId));
    }

    if (query.createdBy) {
      conditions.push(eq(stockMovements.createdBy, query.createdBy));
    }

    if (query.fromDate) {
      const fromParsed = new Date(query.fromDate);
      if (!isNaN(fromParsed.getTime())) {
        conditions.push(gte(stockMovements.createdAt, fromParsed));
      }
    }

    if (query.toDate) {
      const toParsed = new Date(query.toDate);
      if (!isNaN(toParsed.getTime())) {
        conditions.push(lte(stockMovements.createdAt, toParsed));
      }
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(products.name, searchPattern),
          ilike(products.sku, searchPattern),
          ilike(stockMovements.movementType, searchPattern),
          ilike(stockMovements.referenceType, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query for pagination (joins location aliases if warehouseId is filtered)
    const countQuery = executor
      .select({ total: count() })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id));

    if (query.warehouseId) {
      countQuery
        .leftJoin(sourceLocAlias, eq(stockMovements.sourceLocationId, sourceLocAlias.id))
        .leftJoin(destLocAlias, eq(stockMovements.destinationLocationId, destLocAlias.id));
    }

    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.total ?? 0);

    // Paginated records query with full relational details
    const selectQuery = executor
      .select({
        movement: stockMovements,
        product: products,
        sourceLocation: sourceLocAlias,
        destinationLocation: destLocAlias,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(sourceLocAlias, eq(stockMovements.sourceLocationId, sourceLocAlias.id))
      .leftJoin(destLocAlias, eq(stockMovements.destinationLocationId, destLocAlias.id))
      .leftJoin(users, eq(stockMovements.createdBy, users.id));

    if (whereClause) {
      selectQuery.where(whereClause);
    }

    const rows = await selectQuery
      .orderBy(sql`${stockMovements.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const data: StockMovementWithDetails[] = rows.map((row: any) => ({
      ...row.movement,
      product: row.product ?? undefined,
      sourceLocation: row.sourceLocation ?? undefined,
      destinationLocation: row.destinationLocation ?? undefined,
      creator: row.user?.id ? row.user : undefined,
    }));

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
   * Authoritative Stock Ledger Method: Get single stock movement by ID with details
   */
  static async getMovementById(
    id: string,
    tx?: any
  ): Promise<StockMovementWithDetails> {
    const executor = tx ?? db;

    const [row] = await executor
      .select({
        movement: stockMovements,
        product: products,
        sourceLocation: sourceLocAlias,
        destinationLocation: destLocAlias,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(sourceLocAlias, eq(stockMovements.sourceLocationId, sourceLocAlias.id))
      .leftJoin(destLocAlias, eq(stockMovements.destinationLocationId, destLocAlias.id))
      .leftJoin(users, eq(stockMovements.createdBy, users.id))
      .where(eq(stockMovements.id, id))
      .limit(1);

    if (!row) {
      throw new StockMovementNotFoundError(id);
    }

    return {
      ...row.movement,
      product: row.product ?? undefined,
      sourceLocation: row.sourceLocation ?? undefined,
      destinationLocation: row.destinationLocation ?? undefined,
      creator: row.user?.id ? row.user : undefined,
    };
  }

  /**
   * Convenience method to fetch all stock movements logged for a specific reference (e.g. Receipt, Transfer, etc.)
   */
  static async getMovementsByReference(
    referenceType: ReferenceType,
    referenceId: string,
    tx?: any
  ): Promise<StockMovementWithDetails[]> {
    const res = await StockLedgerService.listMovements(
      { referenceType, referenceId, limit: 100 },
      tx
    );
    return res.data;
  }
}
