import { db } from "../../db/client.js";
import { products } from "../../db/schema/products.js";
import { categories } from "../../db/schema/categories.js";
import { unitsOfMeasure } from "../../db/schema/units-of-measure.js";
import { warehouses } from "../../db/schema/warehouses.js";
import { locations } from "../../db/schema/locations.js";
import { reorderRules } from "../../db/schema/reorder-rules.js";
import { receipts } from "../../db/schema/receipts.js";
import { deliveries } from "../../db/schema/deliveries.js";
import { internalTransfers } from "../../db/schema/internal-transfers.js";
import { inventoryAdjustments } from "../../db/schema/inventory-adjustments.js";
import { StockBalanceService } from "../stock-balances/service.js";
import { StockLedgerService } from "../stock-movements/service.js";
import { DashboardService } from "../dashboard/service.js";
import { ReceiptProcessingService } from "../receipts/processing.service.js";
import { DeliveryProcessingService } from "../deliveries/processing.service.js";
import { TransferService } from "../transfers/service.js";
import { AdjustmentService } from "../adjustments/service.js";
import { documentationSearchService } from "./documentation-search.js";
import { eq, ilike, or, and, count, desc } from "drizzle-orm";
import type { ToolDefinition, UserContext } from "./types.js";

// Helper to sanitize database limits
function sanitizeLimit(requestedLimit?: number, maxAllowed = 50, defaultVal = 20): number {
  if (!requestedLimit || isNaN(requestedLimit) || requestedLimit <= 0) return defaultVal;
  return Math.min(requestedLimit, maxAllowed);
}

export const aiTools: Record<string, ToolDefinition> = {
  search_project_documentation: {
    name: "search_project_documentation",
    description: "Search StockSense architecture, API endpoints, authentication contracts, WebSocket event formats, and workflow documentation.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Keyword or topic to search in documentation (e.g., 'low stock API', 'transfer workflow', 'authentication', 'WebSocket events')" },
      },
      required: ["query"],
    },
    handler: async (params) => {
      const query = String(params.query ?? "");
      const sections = documentationSearchService.search(query, 3);
      if (sections.length === 0) {
        return { message: `No documentation matching '${query}' was found.` };
      }
      return { sections };
    },
  },

  list_products: {
    name: "list_products",
    description: "List products in StockSense with optional search query or category filter.",
    parameters: {
      type: "OBJECT",
      properties: {
        search: { type: "STRING", description: "Search by product name or SKU" },
        categoryId: { type: "STRING", description: "Filter by category ID" },
        limit: { type: "NUMBER", description: "Maximum number of items to return (max 50)" },
      },
    },
    handler: async (params) => {
      const limit = sanitizeLimit(params.limit);
      let query = db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          description: products.description,
          isActive: products.isActive,
          categoryId: products.categoryId,
          uomId: products.uomId,
        })
        .from(products);

      const conditions = [];
      if (params.search) {
        const pattern = `%${params.search}%`;
        conditions.push(or(ilike(products.name, pattern), ilike(products.sku, pattern)));
      }
      if (params.categoryId) {
        conditions.push(eq(products.categoryId, params.categoryId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const rows = await query.limit(limit);
      return { total: rows.length, products: rows };
    },
  },

  get_product_details: {
    name: "get_product_details",
    description: "Get comprehensive details and location-wise stock balances for a specific product by SKU or ID.",
    parameters: {
      type: "OBJECT",
      properties: {
        skuOrId: { type: "STRING", description: "Product SKU or UUID ID" },
      },
      required: ["skuOrId"],
    },
    handler: async (params) => {
      const term = String(params.skuOrId);
      const [prod] = await db
        .select()
        .from(products)
        .where(or(eq(products.id, term), eq(products.sku, term)))
        .limit(1);

      if (!prod) {
        return { error: `Product '${term}' was not found in StockSense.` };
      }

      const balances = await StockBalanceService.listBalances({ productId: prod.id, limit: 50 });
      return {
        product: prod,
        totalStock: balances.data.reduce((acc, b) => acc + (b.availableQuantity ?? 0), 0),
        locationBreakdown: balances.data,
      };
    },
  },

  list_categories: {
    name: "list_categories",
    description: "List product categories and their hierarchy.",
    parameters: {
      type: "OBJECT",
      properties: {
        search: { type: "STRING", description: "Search by category name or code" },
      },
    },
    handler: async (params) => {
      const rows = await db.select().from(categories).limit(50);
      return { total: rows.length, categories: rows };
    },
  },

  list_uoms: {
    name: "list_uoms",
    description: "List supported Units of Measure (UOM).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
    handler: async () => {
      const rows = await db.select().from(unitsOfMeasure).limit(50);
      return { total: rows.length, uoms: rows };
    },
  },

  list_warehouses: {
    name: "list_warehouses",
    description: "List active warehouses in StockSense.",
    parameters: {
      type: "OBJECT",
      properties: {
        search: { type: "STRING", description: "Search by warehouse name or shortCode" },
      },
    },
    handler: async (params) => {
      const rows = await db.select().from(warehouses).limit(50);
      return { total: rows.length, warehouses: rows };
    },
  },

  list_locations: {
    name: "list_locations",
    description: "List storage locations within warehouses.",
    parameters: {
      type: "OBJECT",
      properties: {
        warehouseId: { type: "STRING", description: "Filter by warehouse ID" },
      },
    },
    handler: async (params) => {
      let query = db.select().from(locations);
      if (params.warehouseId) {
        query = query.where(eq(locations.warehouseId, params.warehouseId)) as any;
      }
      const rows = await query.limit(50);
      return { total: rows.length, locations: rows };
    },
  },

  get_stock_balance: {
    name: "get_stock_balance",
    description: "Query current authoritative stock balances by product, warehouse, or location.",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "Product UUID" },
        warehouseId: { type: "STRING", description: "Warehouse UUID" },
        locationId: { type: "STRING", description: "Location UUID" },
        limit: { type: "NUMBER", description: "Max results" },
      },
    },
    handler: async (params) => {
      const limit = sanitizeLimit(params.limit);
      const res = await StockBalanceService.listBalances({
        productId: params.productId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        limit,
      });
      return { total: res.pagination.totalItems, balances: res.data };
    },
  },

  get_low_stock_items: {
    name: "get_low_stock_items",
    description: "Query products currently below their configured minimum reordering rule thresholds.",
    parameters: {
      type: "OBJECT",
      properties: {
        warehouseId: { type: "STRING", description: "Filter by warehouse ID" },
        limit: { type: "NUMBER", description: "Max results" },
      },
    },
    handler: async (params) => {
      const limit = sanitizeLimit(params.limit);
      const res = await DashboardService.getLowStock({
        warehouseId: params.warehouseId,
        limit,
      });
      return { total: res.pagination?.total ?? res.data?.length ?? 0, lowStockItems: res.data ?? [] };
    },
  },

  get_reordering_rules: {
    name: "get_reordering_rules",
    description: "List reordering rules (min/max thresholds) linking products to storage locations.",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "Filter by product ID" },
        locationId: { type: "STRING", description: "Filter by location ID" },
      },
    },
    handler: async (params) => {
      let query = db.select().from(reorderRules);
      const conds = [];
      if (params.productId) conds.push(eq(reorderRules.productId, params.productId));
      if (params.locationId) conds.push(eq(reorderRules.locationId, params.locationId));
      if (conds.length > 0) query = query.where(and(...conds)) as any;
      const rows = await query.limit(50);
      return { total: rows.length, reorderingRules: rows };
    },
  },

  get_stock_movements: {
    name: "get_stock_movements",
    description: "Query immutable audit history of stock movements (receipts, deliveries, transfers, adjustments).",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "Filter by product ID" },
        locationId: { type: "STRING", description: "Filter by location ID" },
        movementType: { type: "STRING", description: "RECEIPT, DELIVERY, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT" },
        limit: { type: "NUMBER", description: "Max items" },
      },
    },
    handler: async (params) => {
      const limit = sanitizeLimit(params.limit);
      const res = await StockLedgerService.listMovements({
        productId: params.productId,
        locationId: params.locationId,
        movementType: params.movementType as any,
        limit,
      });
      return { total: res.pagination.totalItems, movements: res.data };
    },
  },

  get_receipts: {
    name: "get_receipts",
    description: "List stock receipt documents (Stock In).",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "DRAFT, WAITING, READY, DONE, CANCELED" },
        limit: { type: "NUMBER", description: "Max items" },
      },
    },
    handler: async (params) => {
      let query = db.select().from(receipts);
      if (params.status) query = query.where(eq(receipts.status, params.status as any)) as any;
      const rows = await query.orderBy(desc(receipts.createdAt)).limit(sanitizeLimit(params.limit));
      return { total: rows.length, receipts: rows };
    },
  },

  get_deliveries: {
    name: "get_deliveries",
    description: "List delivery orders (Stock Out).",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "DRAFT, WAITING, READY, DONE, CANCELED" },
        limit: { type: "NUMBER", description: "Max items" },
      },
    },
    handler: async (params) => {
      let query = db.select().from(deliveries);
      if (params.status) query = query.where(eq(deliveries.status, params.status as any)) as any;
      const rows = await query.orderBy(desc(deliveries.createdAt)).limit(sanitizeLimit(params.limit));
      return { total: rows.length, deliveries: rows };
    },
  },

  get_transfers: {
    name: "get_transfers",
    description: "List internal stock transfer orders.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "DRAFT, WAITING, READY, DONE, CANCELED" },
        limit: { type: "NUMBER", description: "Max items" },
      },
    },
    handler: async (params) => {
      let query = db.select().from(internalTransfers);
      if (params.status) query = query.where(eq(internalTransfers.status, params.status as any)) as any;
      const rows = await query.orderBy(desc(internalTransfers.createdAt)).limit(sanitizeLimit(params.limit));
      return { total: rows.length, transfers: rows };
    },
  },

  get_adjustments: {
    name: "get_adjustments",
    description: "List physical inventory count adjustment documents.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "DRAFT, WAITING, READY, DONE, CANCELED" },
        limit: { type: "NUMBER", description: "Max items" },
      },
    },
    handler: async (params) => {
      let query = db.select().from(inventoryAdjustments);
      if (params.status) query = query.where(eq(inventoryAdjustments.status, params.status as any)) as any;
      const rows = await query.orderBy(desc(inventoryAdjustments.createdAt)).limit(sanitizeLimit(params.limit));
      return { total: rows.length, adjustments: rows };
    },
  },

  get_dashboard_summary: {
    name: "get_dashboard_summary",
    description: "Get high-level system dashboard overview metrics.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
    handler: async () => {
      const summary = await DashboardService.getSummary();
      return { summary };
    },
  },

  // Action Tools (Require Confirmation & Admin/Manager RBAC)
  process_receipt: {
    name: "process_receipt",
    description: "Process a Receipt document (receive stock into warehouse location). Requires Confirmation.",
    requiresConfirmation: true,
    requiredRole: ["admin", "manager"],
    parameters: {
      type: "OBJECT",
      properties: {
        receiptId: { type: "STRING", description: "Receipt UUID to process" },
      },
      required: ["receiptId"],
    },
    handler: async (params, user) => {
      const result = await ReceiptProcessingService.processReceipt(String(params.receiptId), user.id);
      return { success: true, message: `Receipt '${params.receiptId}' processed successfully.`, receipt: result };
    },
  },

  process_delivery: {
    name: "process_delivery",
    description: "Process a Delivery document (issue stock out of warehouse location). Requires Confirmation.",
    requiresConfirmation: true,
    requiredRole: ["admin", "manager"],
    parameters: {
      type: "OBJECT",
      properties: {
        deliveryId: { type: "STRING", description: "Delivery UUID to process" },
      },
      required: ["deliveryId"],
    },
    handler: async (params, user) => {
      const result = await DeliveryProcessingService.processDelivery(String(params.deliveryId), user.id);
      return { success: true, message: `Delivery '${params.deliveryId}' processed successfully.`, delivery: result };
    },
  },

  process_transfer: {
    name: "process_transfer",
    description: "Process an Internal Transfer document (move stock between locations). Requires Confirmation.",
    requiresConfirmation: true,
    requiredRole: ["admin", "manager"],
    parameters: {
      type: "OBJECT",
      properties: {
        transferId: { type: "STRING", description: "Internal Transfer UUID to process" },
      },
      required: ["transferId"],
    },
    handler: async (params, user) => {
      const result = await TransferService.processTransfer(String(params.transferId), user.id);
      return { success: true, message: `Transfer '${params.transferId}' processed successfully.`, transfer: result };
    },
  },

  process_adjustment: {
    name: "process_adjustment",
    description: "Process an Inventory Adjustment document (apply physical count correction). Requires Confirmation.",
    requiresConfirmation: true,
    requiredRole: ["admin", "manager"],
    parameters: {
      type: "OBJECT",
      properties: {
        adjustmentId: { type: "STRING", description: "Inventory Adjustment UUID to process" },
      },
      required: ["adjustmentId"],
    },
    handler: async (params, user) => {
      const result = await AdjustmentService.processAdjustment(String(params.adjustmentId), user.id);
      return { success: true, message: `Adjustment '${params.adjustmentId}' processed successfully.`, adjustment: result };
    },
  },
};
