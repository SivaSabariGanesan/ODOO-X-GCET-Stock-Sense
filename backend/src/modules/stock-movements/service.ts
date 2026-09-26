import { db } from "../../db/client";
import { stockMovements } from "../../db/schema/stock-movements";
import { products } from "../../db/schema/products";
import { locations } from "../../db/schema/locations";
import { users } from "../../db/schema/users";
import {
  ListStockMovementsQuery,
  StockMovementWithDetails,
} from "./types";
import { StockMovementNotFoundError } from "../../lib/errors";
import { eq, and, or, gte, lte, sql, count, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const sourceLocAlias = alias(locations, "sourceLoc");
const destLocAlias = alias(locations, "destLoc");

export class StockLedgerService {
  /**
   * Authoritative Stock Ledger Method: Read-only query for historical stock movements
   * Supports filtering by product, location, movementType, referenceType, date range, search, and pagination.
   */
  static async listMovements(query: ListStockMovementsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.productId) {
      conditions.push(eq(stockMovements.productId, query.productId));
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

    // Execute count query for pagination
    const countQuery = db
      .select({ total: count() })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id));

    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.total ?? 0);

    // Execute paginated records query with full relational details
    const selectQuery = db
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

    const data: StockMovementWithDetails[] = rows.map((row) => ({
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
  static async getMovementById(id: string): Promise<StockMovementWithDetails> {
    const [row] = await db
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
}
