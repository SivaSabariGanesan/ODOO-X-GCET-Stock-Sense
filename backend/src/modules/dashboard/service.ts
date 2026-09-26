import { db } from "../../db/client";
import { products } from "../../db/schema/products";
import { warehouses } from "../../db/schema/warehouses";
import { locations } from "../../db/schema/locations";
import { unitsOfMeasure } from "../../db/schema/units-of-measure";
import { stockBalances } from "../../db/schema/stock-balances";
import { stockMovements } from "../../db/schema/stock-movements";
import { reorderRules } from "../../db/schema/reorder-rules";
import { StockBalanceService } from "../stock-balances/service";
import { StockLedgerService } from "../stock-movements/service";
import {
  DashboardSummary,
  DashboardLowStockQuery,
  PaginatedLowStockResponse,
  LowStockItem,
  DashboardWarehouseSummary,
  StockByUom,
  DashboardStockQuery,
  DashboardMovementsQuery,
} from "./types";
import { eq, and, or, sql, count, ilike, sum } from "drizzle-orm";

export class DashboardService {
  /**
   * Authoritative Dashboard Method: High-level metric aggregation.
   * Performs database-level aggregations (COUNT, SUM, GROUP BY UOM) across master data and current inventory.
   */
  static async getSummary(): Promise<DashboardSummary> {
    // 1. Total Active Products Count
    const [prodCountResult] = await db
      .select({ total: count() })
      .from(products)
      .where(eq(products.isActive, true));
    const totalProducts = Number(prodCountResult?.total ?? 0);

    // 2. Total Active Warehouses Count
    const [whCountResult] = await db
      .select({ total: count() })
      .from(warehouses)
      .where(eq(warehouses.isActive, true));
    const totalWarehouses = Number(whCountResult?.total ?? 0);

    // 3. Total Active Locations Count
    const [locCountResult] = await db
      .select({ total: count() })
      .from(locations)
      .where(eq(locations.isActive, true));
    const totalLocations = Number(locCountResult?.total ?? 0);

    // 4. Total Stock Balance Items Count
    const [stockCountResult] = await db
      .select({ total: count() })
      .from(stockBalances);
    const totalStockItems = Number(stockCountResult?.total ?? 0);

    // 5. Total Stock Movements Count
    const [moveCountResult] = await db
      .select({ total: count() })
      .from(stockMovements);
    const recentMovementsCount = Number(moveCountResult?.total ?? 0);

    // 6. Low Stock Count (Reorder rules where current stock < minQuantity)
    const [lowStockResult] = await db
      .select({ total: count() })
      .from(reorderRules)
      .leftJoin(
        stockBalances,
        and(
          eq(reorderRules.productId, stockBalances.productId),
          eq(reorderRules.locationId, stockBalances.locationId)
        )
      )
      .where(
        and(
          eq(reorderRules.isActive, true),
          sql`COALESCE(${stockBalances.quantity}::numeric, 0) < ${reorderRules.minQuantity}::numeric`
        )
      );
    const lowStockCount = Number(lowStockResult?.total ?? 0);

    // 7. Stock Quantities grouped safely by UOM (never combining incompatible units)
    const uomRows = await db
      .select({
        uomId: unitsOfMeasure.id,
        uomName: unitsOfMeasure.name,
        uomAbbreviation: unitsOfMeasure.abbreviation,
        totalQty: sum(stockBalances.quantity),
        totalRes: sum(stockBalances.reservedQuantity),
      })
      .from(stockBalances)
      .innerJoin(products, eq(stockBalances.productId, products.id))
      .innerJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .groupBy(unitsOfMeasure.id, unitsOfMeasure.name, unitsOfMeasure.abbreviation);

    const stockByUom: StockByUom[] = uomRows.map((row) => ({
      uomId: row.uomId,
      uomName: row.uomName,
      uomAbbreviation: row.uomAbbreviation,
      totalQuantity: (parseFloat(row.totalQty ?? "0")).toFixed(4),
      totalReservedQuantity: (parseFloat(row.totalRes ?? "0")).toFixed(4),
    }));

    return {
      totalProducts,
      totalWarehouses,
      totalLocations,
      totalStockItems,
      lowStockCount,
      recentMovementsCount,
      stockByUom,
    };
  }

  /**
   * Authoritative Dashboard Method: Returns paginated low-stock items.
   * Compares active reordering rules against current stock balances (treating missing balance rows as 0 stock).
   */
  static async getLowStock(
    query: DashboardLowStockQuery
  ): Promise<PaginatedLowStockResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(reorderRules.isActive, true),
      sql`COALESCE(${stockBalances.quantity}::numeric, 0) < ${reorderRules.minQuantity}::numeric`,
    ];

    if (query.warehouseId) {
      conditions.push(eq(locations.warehouseId, query.warehouseId));
    }

    if (query.locationId) {
      conditions.push(eq(reorderRules.locationId, query.locationId));
    }

    if (query.productId) {
      conditions.push(eq(reorderRules.productId, query.productId));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(products.name, searchPattern),
          ilike(products.sku, searchPattern)
        )
      );
    }

    const whereClause = and(...conditions);

    // Count low stock items
    const [countResult] = await db
      .select({ total: count() })
      .from(reorderRules)
      .innerJoin(products, eq(reorderRules.productId, products.id))
      .innerJoin(locations, eq(reorderRules.locationId, locations.id))
      .leftJoin(
        stockBalances,
        and(
          eq(reorderRules.productId, stockBalances.productId),
          eq(reorderRules.locationId, stockBalances.locationId)
        )
      )
      .where(whereClause);

    const total = Number(countResult?.total ?? 0);

    // Paginated low stock records query
    const rows = await db
      .select({
        rule: reorderRules,
        product: products,
        uom: unitsOfMeasure,
        location: locations,
        warehouse: warehouses,
        balance: stockBalances,
      })
      .from(reorderRules)
      .innerJoin(products, eq(reorderRules.productId, products.id))
      .innerJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .innerJoin(locations, eq(reorderRules.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .leftJoin(
        stockBalances,
        and(
          eq(reorderRules.productId, stockBalances.productId),
          eq(reorderRules.locationId, stockBalances.locationId)
        )
      )
      .where(whereClause)
      .orderBy(sql`${reorderRules.minQuantity}::numeric - COALESCE(${stockBalances.quantity}::numeric, 0) DESC`)
      .limit(limit)
      .offset(offset);

    const data: LowStockItem[] = rows.map((row) => {
      const minQtyNum = parseFloat(row.rule.minQuantity);
      const currQtyNum = row.balance ? parseFloat(row.balance.quantity) : 0;
      const reservedQtyNum = row.balance ? parseFloat(row.balance.reservedQuantity) : 0;
      const availableQtyNum = Math.max(0, currQtyNum - reservedQtyNum);
      const shortageNum = Math.max(0, minQtyNum - currQtyNum);

      return {
        ruleId: row.rule.id,
        productId: row.product.id,
        productName: row.product.name,
        productSku: row.product.sku,
        uom: {
          id: row.uom.id,
          name: row.uom.name,
          abbreviation: row.uom.abbreviation,
        },
        warehouse: {
          id: row.warehouse.id,
          name: row.warehouse.name,
          shortCode: row.warehouse.shortCode,
        },
        location: {
          id: row.location.id,
          name: row.location.name,
          fullPath: row.location.fullPath,
        },
        minQuantity: minQtyNum.toFixed(4),
        maxQuantity: row.rule.maxQuantity ? parseFloat(row.rule.maxQuantity).toFixed(4) : null,
        reorderQty: parseFloat(row.rule.reorderQty).toFixed(4),
        currentQuantity: currQtyNum.toFixed(4),
        reservedQuantity: reservedQtyNum.toFixed(4),
        availableQuantity: availableQtyNum.toFixed(4),
        shortageQuantity: shortageNum.toFixed(4),
      };
    });

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
   * Delegates stock breakdown queries to StockBalanceService
   */
  static async getStock(query: DashboardStockQuery) {
    return StockBalanceService.listBalances(query);
  }

  /**
   * Delegates movement history queries to StockLedgerService
   */
  static async getMovements(query: DashboardMovementsQuery) {
    return StockLedgerService.listMovements(query);
  }

  /**
   * Authoritative Dashboard Method: Returns warehouse-level stock and location breakdown.
   */
  static async getWarehouses(): Promise<DashboardWarehouseSummary[]> {
    const whList = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.isActive, true))
      .orderBy(warehouses.name);

    const result: DashboardWarehouseSummary[] = [];

    for (const wh of whList) {
      // Count locations in warehouse
      const [locCountResult] = await db
        .select({ total: count() })
        .from(locations)
        .where(and(eq(locations.warehouseId, wh.id), eq(locations.isActive, true)));
      const locationCount = Number(locCountResult?.total ?? 0);

      // Count stock items in warehouse locations
      const [stockCountResult] = await db
        .select({ total: count() })
        .from(stockBalances)
        .innerJoin(locations, eq(stockBalances.locationId, locations.id))
        .where(eq(locations.warehouseId, wh.id));
      const totalStockItems = Number(stockCountResult?.total ?? 0);

      // Count low stock rules in warehouse
      const [lowStockResult] = await db
        .select({ total: count() })
        .from(reorderRules)
        .innerJoin(locations, eq(reorderRules.locationId, locations.id))
        .leftJoin(
          stockBalances,
          and(
            eq(reorderRules.productId, stockBalances.productId),
            eq(reorderRules.locationId, stockBalances.locationId)
          )
        )
        .where(
          and(
            eq(locations.warehouseId, wh.id),
            eq(reorderRules.isActive, true),
            sql`COALESCE(${stockBalances.quantity}::numeric, 0) < ${reorderRules.minQuantity}::numeric`
          )
        );
      const lowStockCount = Number(lowStockResult?.total ?? 0);

      // Warehouse stock grouped by UOM
      const uomRows = await db
        .select({
          uomId: unitsOfMeasure.id,
          uomName: unitsOfMeasure.name,
          uomAbbreviation: unitsOfMeasure.abbreviation,
          totalQty: sum(stockBalances.quantity),
        })
        .from(stockBalances)
        .innerJoin(locations, eq(stockBalances.locationId, locations.id))
        .innerJoin(products, eq(stockBalances.productId, products.id))
        .innerJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
        .where(eq(locations.warehouseId, wh.id))
        .groupBy(unitsOfMeasure.id, unitsOfMeasure.name, unitsOfMeasure.abbreviation);

      const stockByUom = uomRows.map((r) => ({
        uomId: r.uomId,
        uomName: r.uomName,
        uomAbbreviation: r.uomAbbreviation,
        quantity: (parseFloat(r.totalQty ?? "0")).toFixed(4),
      }));

      result.push({
        id: wh.id,
        name: wh.name,
        shortCode: wh.shortCode,
        isActive: wh.isActive,
        locationCount,
        totalStockItems,
        lowStockCount,
        stockByUom,
      });
    }

    return result;
  }
}
