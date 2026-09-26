import { db } from "../../db/client.js";
import { stockBalances, type StockBalance } from "../../db/schema/stock-balances.js";
import { products } from "../../db/schema/products.js";
import { locations } from "../../db/schema/locations.js";
import { warehouses } from "../../db/schema/warehouses.js";
import { unitsOfMeasure } from "../../db/schema/units-of-measure.js";
import { eq, and, or, ilike, count, gte, lte, gt, asc, desc, sql } from "drizzle-orm";
import {
  ProductNotFoundError,
  LocationNotFoundError,
  InsufficientStockError,
  StockBalanceNotFoundError,
  AppError,
} from "../../lib/errors.js";
import type {
  IncreaseStockInput,
  DecreaseStockInput,
  SetStockInput,
  ReserveStockInput,
  UnreserveStockInput,
  TransferStockPrimitiveInput,
  ListBalancesQuery,
  StockBalanceDetails,
  PaginatedBalancesResponse,
} from "./types.js";

export class StockBalanceService {
  /**
   * Get stock balance for a product at a specific location.
   * Returns authoritative stock balance record or a zero-quantity default if no record exists yet.
   */
  public static async getBalance(
    productId: string,
    locationId: string,
    txContext?: any
  ): Promise<StockBalanceDetails> {
    const executor = txContext ?? db;

    const [record] = await executor
      .select({
        balance: stockBalances,
        productName: products.name,
        productSku: products.sku,
        uomName: unitsOfMeasure.name,
        uomAbbreviation: unitsOfMeasure.abbreviation,
        locationName: locations.name,
        locationFullPath: locations.fullPath,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(locations, eq(stockBalances.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .where(
        and(
          eq(stockBalances.productId, productId),
          eq(stockBalances.locationId, locationId)
        )
      )
      .limit(1);

    if (!record) {
      // Check if product and location exist
      const [prod] = await executor
        .select({ name: products.name, sku: products.sku, uomId: products.uomId })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!prod) {
        throw new ProductNotFoundError(productId);
      }

      const [loc] = await executor
        .select({
          name: locations.name,
          fullPath: locations.fullPath,
          warehouseId: locations.warehouseId,
        })
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(locationId);
      }

      let warehouseName: string | undefined;
      let warehouseShortCode: string | undefined;
      if (loc.warehouseId) {
        const [wh] = await executor
          .select({ name: warehouses.name, shortCode: warehouses.shortCode })
          .from(warehouses)
          .where(eq(warehouses.id, loc.warehouseId))
          .limit(1);
        warehouseName = wh?.name;
        warehouseShortCode = wh?.shortCode;
      }

      let uomName: string | undefined;
      let uomAbbreviation: string | undefined;
      if (prod.uomId) {
        const [uom] = await executor
          .select({ name: unitsOfMeasure.name, abbreviation: unitsOfMeasure.abbreviation })
          .from(unitsOfMeasure)
          .where(eq(unitsOfMeasure.id, prod.uomId))
          .limit(1);
        uomName = uom?.name;
        uomAbbreviation = uom?.abbreviation;
      }

      return {
        id: "",
        productId,
        locationId,
        quantity: "0.0000",
        reservedQuantity: "0.0000",
        availableQuantity: "0.0000",
        lastMovedAt: new Date(0),
        createdAt: new Date(0),
        updatedAt: new Date(0),
        productName: prod.name,
        productSku: prod.sku,
        uomName,
        uomAbbreviation,
        locationName: loc.name,
        locationFullPath: loc.fullPath,
        warehouseId: loc.warehouseId,
        warehouseName,
        warehouseShortCode,
      };
    }

    const available = (
      parseFloat(record.balance.quantity) - parseFloat(record.balance.reservedQuantity)
    ).toFixed(4);

    return {
      ...record.balance,
      productName: record.productName,
      productSku: record.productSku,
      uomName: record.uomName || undefined,
      uomAbbreviation: record.uomAbbreviation || undefined,
      locationName: record.locationName,
      locationFullPath: record.locationFullPath,
      warehouseId: record.warehouseId,
      warehouseName: record.warehouseName,
      warehouseShortCode: record.warehouseShortCode,
      availableQuantity: available,
    };
  }

  /**
   * Get detailed stock balance record by primary key ID.
   */
  public static async getBalanceById(
    id: string,
    txContext?: any
  ): Promise<StockBalanceDetails> {
    const executor = txContext ?? db;

    const [record] = await executor
      .select({
        balance: stockBalances,
        productName: products.name,
        productSku: products.sku,
        uomName: unitsOfMeasure.name,
        uomAbbreviation: unitsOfMeasure.abbreviation,
        locationName: locations.name,
        locationFullPath: locations.fullPath,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(locations, eq(stockBalances.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .where(eq(stockBalances.id, id))
      .limit(1);

    if (!record) {
      throw new StockBalanceNotFoundError(id);
    }

    const available = (
      parseFloat(record.balance.quantity) - parseFloat(record.balance.reservedQuantity)
    ).toFixed(4);

    return {
      ...record.balance,
      productName: record.productName,
      productSku: record.productSku,
      uomName: record.uomName || undefined,
      uomAbbreviation: record.uomAbbreviation || undefined,
      locationName: record.locationName,
      locationFullPath: record.locationFullPath,
      warehouseId: record.warehouseId,
      warehouseName: record.warehouseName,
      warehouseShortCode: record.warehouseShortCode,
      availableQuantity: available,
    };
  }

  /**
   * Safely and atomically increase stock for a product at a location.
   * Uses PostgreSQL ON CONFLICT DO UPDATE for atomic concurrency protection.
   */
  public static async increaseStock(
    input: IncreaseStockInput,
    txContext?: any
  ): Promise<StockBalance> {
    const executor = txContext ?? db;

    const qtyNum = Number(input.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new AppError("Quantity for stock increase must be a positive number greater than 0", 400);
    }

    // 1. Validate Product exists
    const [prod] = await executor
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!prod) {
      throw new ProductNotFoundError(input.productId);
    }

    // 2. Validate Location exists
    const [loc] = await executor
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, input.locationId))
      .limit(1);

    if (!loc) {
      throw new LocationNotFoundError(input.locationId);
    }

    // 3. Atomic Upsert with SQL increment
    const [inserted] = await executor
      .insert(stockBalances)
      .values({
        productId: input.productId,
        locationId: input.locationId,
        quantity: qtyNum.toFixed(4),
        reservedQuantity: "0.0000",
        lastMovedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockBalances.productId, stockBalances.locationId],
        set: {
          quantity: sql`${stockBalances.quantity} + ${qtyNum.toFixed(4)}::numeric`,
          lastMovedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted;
  }

  /**
   * Safely and atomically decrease stock for a product at a location.
   * Enforces stock availability policy (no negative stock).
   * Uses database row locking (FOR UPDATE) to guarantee thread safety.
   */
  public static async decreaseStock(
    input: DecreaseStockInput,
    txContext?: any
  ): Promise<StockBalance> {
    const qtyNum = Number(input.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new AppError("Quantity for stock decrease must be a positive number greater than 0", 400);
    }

    const runDecrease = async (tx: any) => {
      // 1. Validate Product exists
      const [prod] = await tx
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!prod) {
        throw new ProductNotFoundError(input.productId);
      }

      // 2. Validate Location exists
      const [loc] = await tx
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.id, input.locationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(input.locationId);
      }

      // 3. Fetch Stock Balance with FOR UPDATE row lock
      const [existing] = await tx
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, input.productId),
            eq(stockBalances.locationId, input.locationId)
          )
        )
        .for("update")
        .limit(1);

      const currentQty = existing ? parseFloat(existing.quantity) : 0;
      const reservedQty = existing ? parseFloat(existing.reservedQuantity) : 0;
      const availableQty = currentQty - reservedQty;

      if (availableQty < qtyNum) {
        throw new InsufficientStockError(
          `Insufficient stock for product '${prod.name}' at location '${loc.name}'. Available: ${availableQty}, Requested decrease: ${qtyNum}`
        );
      }

      const newQty = (currentQty - qtyNum).toFixed(4);

      const [updated] = await tx
        .update(stockBalances)
        .set({
          quantity: newQty,
          lastMovedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stockBalances.id, existing.id))
        .returning();

      return updated;
    };

    if (txContext) {
      return await runDecrease(txContext);
    } else {
      return await db.transaction(runDecrease);
    }
  }

  /**
   * Absolute stock setting (used by physical inventory count adjustments).
   * Validates quantity >= 0 and non-negative stock.
   */
  public static async setStock(
    input: SetStockInput,
    txContext?: any
  ): Promise<StockBalance> {
    const executor = txContext ?? db;

    const qtyNum = Number(input.quantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      throw new AppError("Stock quantity cannot be negative", 400);
    }

    // 1. Validate Product exists
    const [prod] = await executor
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!prod) {
      throw new ProductNotFoundError(input.productId);
    }

    // 2. Validate Location exists
    const [loc] = await executor
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, input.locationId))
      .limit(1);

    if (!loc) {
      throw new LocationNotFoundError(input.locationId);
    }

    // 3. Atomic Upsert
    const [inserted] = await executor
      .insert(stockBalances)
      .values({
        productId: input.productId,
        locationId: input.locationId,
        quantity: qtyNum.toFixed(4),
        reservedQuantity: "0.0000",
        lastMovedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockBalances.productId, stockBalances.locationId],
        set: {
          quantity: qtyNum.toFixed(4),
          lastMovedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted;
  }

  /**
   * Atomic stock transfer primitive between two locations.
   */
  public static async transferStockPrimitive(
    input: TransferStockPrimitiveInput,
    txContext?: any
  ): Promise<{ source: StockBalance; destination: StockBalance }> {
    if (input.sourceLocationId === input.destinationLocationId) {
      throw new AppError("Source location and destination location must be different", 400);
    }

    const source = await StockBalanceService.decreaseStock(
      {
        productId: input.productId,
        locationId: input.sourceLocationId,
        quantity: input.quantity,
      },
      txContext
    );

    const destination = await StockBalanceService.increaseStock(
      {
        productId: input.productId,
        locationId: input.destinationLocationId,
        quantity: input.quantity,
      },
      txContext
    );

    return { source, destination };
  }

  /**
   * Reserve stock quantity for order allocations.
   */
  public static async reserveStock(
    input: ReserveStockInput,
    txContext?: any
  ): Promise<StockBalance> {
    const executor = txContext ?? db;

    const qtyNum = Number(input.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new AppError("Reserved quantity must be a positive number greater than 0", 400);
    }

    const selectQuery = executor
      .select()
      .from(stockBalances)
      .where(
        and(
          eq(stockBalances.productId, input.productId),
          eq(stockBalances.locationId, input.locationId)
        )
      );

    const [existing] = txContext ? await selectQuery.for("update").limit(1) : await selectQuery.limit(1);

    if (!existing) {
      throw new InsufficientStockError("Cannot reserve stock when no balance row exists at location");
    }

    const currentQty = parseFloat(existing.quantity);
    const currentReserved = parseFloat(existing.reservedQuantity);
    const available = currentQty - currentReserved;

    if (available < qtyNum) {
      throw new InsufficientStockError(`Insufficient unreserved stock available to reserve. Available: ${available}, Requested: ${qtyNum}`);
    }

    const newReserved = (currentReserved + qtyNum).toFixed(4);

    const [updated] = await executor
      .update(stockBalances)
      .set({
        reservedQuantity: newReserved,
        updatedAt: new Date(),
      })
      .where(eq(stockBalances.id, existing.id))
      .returning();

    return updated;
  }

  /**
   * Unreserve stock quantity.
   */
  public static async unreserveStock(
    input: UnreserveStockInput,
    txContext?: any
  ): Promise<StockBalance> {
    const executor = txContext ?? db;

    const qtyNum = Number(input.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new AppError("Unreserved quantity must be a positive number greater than 0", 400);
    }

    const selectQuery = executor
      .select()
      .from(stockBalances)
      .where(
        and(
          eq(stockBalances.productId, input.productId),
          eq(stockBalances.locationId, input.locationId)
        )
      );

    const [existing] = txContext ? await selectQuery.for("update").limit(1) : await selectQuery.limit(1);

    if (!existing) {
      throw new StockBalanceNotFoundError(`No stock balance row found for product '${input.productId}' at location '${input.locationId}'`);
    }

    const currentReserved = parseFloat(existing.reservedQuantity);
    if (currentReserved < qtyNum) {
      throw new AppError(`Cannot unreserve more stock than currently reserved. Reserved: ${currentReserved}, Requested unreserve: ${qtyNum}`, 400);
    }

    const newReserved = (currentReserved - qtyNum).toFixed(4);

    const [updated] = await executor
      .update(stockBalances)
      .set({
        reservedQuantity: newReserved,
        updatedAt: new Date(),
      })
      .where(eq(stockBalances.id, existing.id))
      .returning();

    return updated;
  }

  /**
   * Get product stock breakdown across all locations and total aggregate quantity.
   */
  public static async getProductStock(
    productId: string,
    txContext?: any
  ): Promise<{ productId: string; totalQuantity: string; totalReserved: string; totalAvailable: string; locationBalances: StockBalanceDetails[] }> {
    const executor = txContext ?? db;

    const [prod] = await executor
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!prod) {
      throw new ProductNotFoundError(productId);
    }

    const rows = await executor
      .select({
        balance: stockBalances,
        productName: products.name,
        productSku: products.sku,
        uomName: unitsOfMeasure.name,
        uomAbbreviation: unitsOfMeasure.abbreviation,
        locationName: locations.name,
        locationFullPath: locations.fullPath,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(locations, eq(stockBalances.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .where(eq(stockBalances.productId, productId));

    let sumQty = 0;
    let sumRes = 0;

    const locationBalances: StockBalanceDetails[] = rows.map((r) => {
      const q = parseFloat(r.balance.quantity);
      const res = parseFloat(r.balance.reservedQuantity);
      sumQty += q;
      sumRes += res;

      return {
        ...r.balance,
        productName: r.productName,
        productSku: r.productSku,
        uomName: r.uomName || undefined,
        uomAbbreviation: r.uomAbbreviation || undefined,
        locationName: r.locationName,
        locationFullPath: r.locationFullPath,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouseName,
        warehouseShortCode: r.warehouseShortCode,
        availableQuantity: (q - res).toFixed(4),
      };
    });

    return {
      productId,
      totalQuantity: sumQty.toFixed(4),
      totalReserved: sumRes.toFixed(4),
      totalAvailable: (sumQty - sumRes).toFixed(4),
      locationBalances,
    };
  }

  /**
   * Get all product stock balances at a specific location.
   */
  public static async getLocationStock(
    locationId: string,
    txContext?: any
  ): Promise<{ locationId: string; locationName: string; locationFullPath: string; warehouseId: string; warehouseName: string; balances: StockBalanceDetails[] }> {
    const executor = txContext ?? db;

    const [loc] = await executor
      .select({
        id: locations.id,
        name: locations.name,
        fullPath: locations.fullPath,
        warehouseId: locations.warehouseId,
        warehouseName: warehouses.name,
      })
      .from(locations)
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .where(eq(locations.id, locationId))
      .limit(1);

    if (!loc) {
      throw new LocationNotFoundError(locationId);
    }

    const rows = await executor
      .select({
        balance: stockBalances,
        productName: products.name,
        productSku: products.sku,
        uomName: unitsOfMeasure.name,
        uomAbbreviation: unitsOfMeasure.abbreviation,
        locationName: locations.name,
        locationFullPath: locations.fullPath,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(locations, eq(stockBalances.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .where(eq(stockBalances.locationId, locationId));

    const balances: StockBalanceDetails[] = rows.map((r) => {
      const q = parseFloat(r.balance.quantity);
      const res = parseFloat(r.balance.reservedQuantity);
      return {
        ...r.balance,
        productName: r.productName,
        productSku: r.productSku,
        uomName: r.uomName || undefined,
        uomAbbreviation: r.uomAbbreviation || undefined,
        locationName: r.locationName,
        locationFullPath: r.locationFullPath,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouseName,
        warehouseShortCode: r.warehouseShortCode,
        availableQuantity: (q - res).toFixed(4),
      };
    });

    return {
      locationId: loc.id,
      locationName: loc.name,
      locationFullPath: loc.fullPath,
      warehouseId: loc.warehouseId,
      warehouseName: loc.warehouseName,
      balances,
    };
  }

  /**
   * List stock balances with filtering & pagination.
   */
  public static async listBalances(
    query: ListBalancesQuery,
    txContext?: any
  ): Promise<PaginatedBalancesResponse> {
    const executor = txContext ?? db;

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.productId) {
      conditions.push(eq(stockBalances.productId, query.productId));
    }

    if (query.locationId) {
      conditions.push(eq(stockBalances.locationId, query.locationId));
    }

    if (query.warehouseId) {
      conditions.push(eq(locations.warehouseId, query.warehouseId));
    }

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    if (query.hasStock) {
      conditions.push(gt(stockBalances.quantity, "0"));
    }

    if (query.minQuantity !== undefined) {
      conditions.push(gte(stockBalances.quantity, String(query.minQuantity)));
    }

    if (query.maxQuantity !== undefined) {
      conditions.push(lte(stockBalances.quantity, String(query.maxQuantity)));
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, term),
          ilike(products.sku, term),
          ilike(locations.name, term),
          ilike(locations.fullPath, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count matching rows
    const [{ totalCount }] = await executor
      .select({ totalCount: count() })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(locations, eq(stockBalances.locationId, locations.id))
      .where(whereClause);

    const total = Number(totalCount || 0);

    // Dynamic sorting
    let sortColumn = stockBalances.lastMovedAt;
    if (query.sortBy === "quantity") sortColumn = stockBalances.quantity as any;
    if (query.sortBy === "createdAt") sortColumn = stockBalances.createdAt as any;
    if (query.sortBy === "productName") sortColumn = products.name as any;

    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const rows = await executor
      .select({
        balance: stockBalances,
        productName: products.name,
        productSku: products.sku,
        uomName: unitsOfMeasure.name,
        uomAbbreviation: unitsOfMeasure.abbreviation,
        locationName: locations.name,
        locationFullPath: locations.fullPath,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(locations, eq(stockBalances.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const data: StockBalanceDetails[] = rows.map((r) => {
      const q = parseFloat(r.balance.quantity);
      const res = parseFloat(r.balance.reservedQuantity);
      return {
        ...r.balance,
        productName: r.productName,
        productSku: r.productSku,
        uomName: r.uomName || undefined,
        uomAbbreviation: r.uomAbbreviation || undefined,
        locationName: r.locationName,
        locationFullPath: r.locationFullPath,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouseName,
        warehouseShortCode: r.warehouseShortCode,
        availableQuantity: (q - res).toFixed(4),
      };
    });

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
}
