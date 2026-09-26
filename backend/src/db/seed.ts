/**
 * StockSense — Database Seed Script
 *
 * Populates all tables with realistic demo data exercising the full stock lifecycle:
 *   Receipt → Stock Increase → Internal Transfer → Delivery → Adjustment
 *
 * Idempotent: uses ON CONFLICT DO NOTHING so it's safe to run multiple times.
 * Run with:  bun run db:seed
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, inArray } from "drizzle-orm";

import { users } from "./schema/users";
import { categories } from "./schema/categories";
import { unitsOfMeasure } from "./schema/units-of-measure";
import { warehouses } from "./schema/warehouses";
import { locations } from "./schema/locations";
import { products } from "./schema/products";
import { reorderRules } from "./schema/reorder-rules";
import { stockBalances } from "./schema/stock-balances";
import { receipts } from "./schema/receipts";
import { receiptItems } from "./schema/receipt-items";
import { deliveries } from "./schema/deliveries";
import { deliveryItems } from "./schema/delivery-items";
import { internalTransfers } from "./schema/internal-transfers";
import { internalTransferItems } from "./schema/internal-transfer-items";
import { inventoryAdjustments } from "./schema/inventory-adjustments";
import { inventoryAdjustmentItems } from "./schema/inventory-adjustment-items";
import { stockMovements } from "./schema/stock-movements";

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

function log(section: string, msg: string) {
  console.log(`  [${section}] ${msg}`);
}

function qty(n: number): string {
  return n.toFixed(4);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log("\n🌱  StockSense seed starting…\n");

  // ── 0. Wipe test/orphan data ──────────────────────────────────────────────
  console.log("── Cleanup test data");

  // Find test warehouses (not our seed codes)
  const testWhs = await db.execute(sql`
    SELECT id FROM warehouses WHERE short_code NOT IN ('WH01','WH02','WH03')
  `);

  for (const tw of testWhs as any[]) {
    const twId = tw.id as string;
    // Delete all tables that reference this warehouse (in FK-safe order)
    await db.execute(sql`DELETE FROM stock_movements WHERE source_location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId}) OR destination_location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId})`);
    await db.execute(sql`DELETE FROM stock_balances WHERE location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId})`);
    await db.execute(sql`DELETE FROM reorder_rules WHERE location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId})`);
    await db.execute(sql`DELETE FROM inventory_adjustment_items WHERE adjustment_id IN (SELECT id FROM inventory_adjustments WHERE location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId}))`);
    await db.execute(sql`DELETE FROM inventory_adjustments WHERE location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId})`);
    await db.execute(sql`DELETE FROM internal_transfer_items WHERE transfer_id IN (SELECT id FROM internal_transfers WHERE source_location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId}) OR destination_location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId}))`);
    await db.execute(sql`DELETE FROM internal_transfers WHERE source_location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId}) OR destination_location_id IN (SELECT id FROM locations WHERE warehouse_id = ${twId})`);
    await db.execute(sql`DELETE FROM delivery_items WHERE delivery_id IN (SELECT id FROM deliveries WHERE warehouse_id = ${twId})`);
    await db.execute(sql`DELETE FROM deliveries WHERE warehouse_id = ${twId}`);
    await db.execute(sql`DELETE FROM receipt_items WHERE receipt_id IN (SELECT id FROM receipts WHERE warehouse_id = ${twId})`);
    await db.execute(sql`DELETE FROM receipts WHERE warehouse_id = ${twId}`);
    await db.execute(sql`DELETE FROM locations WHERE warehouse_id = ${twId}`);
    await db.execute(sql`DELETE FROM warehouses WHERE id = ${twId}`);
    log("cleanup", `removed test warehouse ${twId} and all dependent data`);
  }

  log("cleanup", "done");

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log("\n── Users");

  // Upsert admin user
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Admin User",
      email: "admin@stocksense.io",
      passwordHash: await Bun.password.hash("StockSense2026!", { algorithm: "argon2id" }),
      role: "admin",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: "admin", isActive: true },
    })
    .returning();

  // Ensure demo user is admin
  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, "alex.mercer@stocksense.io"));

  const userId = adminUser.id;
  log("users", `admin id: ${userId}`);

  // ── 2. Categories ──────────────────────────────────────────────────────────
  console.log("\n── Categories");

  const catData = [
    { name: "Raw Materials", description: "Base input materials for production", color: "#6366f1" },
    { name: "Packaging",     description: "Boxes, wraps, and packing materials",  color: "#f59e0b" },
    { name: "Electronics",   description: "Electronic components and assemblies",  color: "#10b981" },
    { name: "Chemicals",     description: "Industrial chemicals and solvents",     color: "#ef4444" },
  ];

  for (const c of catData) {
    await db
      .insert(categories)
      .values({ ...c, isActive: true, createdBy: userId })
      .onConflictDoNothing();
  }

  const allCats = await db.select().from(categories);
  const catId = (name: string) => allCats.find((c) => c.name === name)!.id;

  const catRawMaterials = catId("Raw Materials");
  const catPackaging    = catId("Packaging");
  const catElectronics  = catId("Electronics");
  const catChemicals    = catId("Chemicals");
  log("categories", `${allCats.length} total`);

  // ── 3. Units of Measure ────────────────────────────────────────────────────
  console.log("\n── Units of Measure");

  const uomData = [
    { name: "Kilogram",  abbreviation: "kg",   measureType: "weight" },
    { name: "Piece",     abbreviation: "pcs",  measureType: "unit"   },
    { name: "Litre",     abbreviation: "L",    measureType: "volume" },
    { name: "Metre",     abbreviation: "m",    measureType: "length" },
    { name: "Box",       abbreviation: "box",  measureType: "unit"   },
    { name: "Roll",      abbreviation: "roll", measureType: "unit"   },
  ];

  for (const u of uomData) {
    await db
      .insert(unitsOfMeasure)
      .values({ ...u, isActive: true, createdBy: userId })
      .onConflictDoNothing();
  }

  const allUoms = await db.select().from(unitsOfMeasure);
  const uomId = (abbr: string) => allUoms.find((u) => u.abbreviation === abbr)!.id;

  const uomKg   = uomId("kg");
  const uomPcs  = uomId("pcs");
  const uomL    = uomId("L");
  const uomM    = uomId("m");
  const uomBox  = uomId("box");
  const uomRoll = uomId("roll");
  log("uoms", `${allUoms.length} total`);

  // ── 4. Warehouses ──────────────────────────────────────────────────────────
  console.log("\n── Warehouses");

  const whData = [
    { name: "Main Central Warehouse",   shortCode: "WH01", description: "Primary distribution and storage hub",      address: "12 Industrial Ave, Central District" },
    { name: "South Regional Depot",     shortCode: "WH02", description: "Secondary warehouse for southern region",    address: "45 Logistics Park, South Zone"       },
    { name: "North Production Store",   shortCode: "WH03", description: "On-site production materials store",         address: "7 Factory Road, North Campus"        },
  ];

  for (const w of whData) {
    await db
      .insert(warehouses)
      .values({ ...w, isActive: true, createdBy: userId })
      .onConflictDoNothing();
  }

  const allWhs = await db.select().from(warehouses);
  const whId = (code: string) => allWhs.find((w) => w.shortCode === code)!.id;

  const whMain  = whId("WH01");
  const whSouth = whId("WH02");
  const whNorth = whId("WH03");
  log("warehouses", `${allWhs.length} total`);

  // ── 5. Locations ───────────────────────────────────────────────────────────
  console.log("\n── Locations");

  const locData = [
    { warehouseId: whMain,  name: "Receiving",  fullPath: "WH01/Receiving",       locationType: "input"    },
    { warehouseId: whMain,  name: "Zone A",      fullPath: "WH01/Storage/Zone-A",  locationType: "internal" },
    { warehouseId: whMain,  name: "Zone B",      fullPath: "WH01/Storage/Zone-B",  locationType: "internal" },
    { warehouseId: whMain,  name: "Dispatch",    fullPath: "WH01/Dispatch",         locationType: "output"   },
    { warehouseId: whSouth, name: "Receiving",   fullPath: "WH02/Receiving",        locationType: "input"    },
    { warehouseId: whSouth, name: "Storage",     fullPath: "WH02/Storage",          locationType: "internal" },
    { warehouseId: whNorth, name: "Input",       fullPath: "WH03/Input",            locationType: "input"    },
    { warehouseId: whNorth, name: "Production",  fullPath: "WH03/Production",       locationType: "internal" },
  ];

  for (const l of locData) {
    // fullPath is not unique by constraint — check manually
    const existing = await db
      .select()
      .from(locations)
      .where(eq(locations.fullPath, l.fullPath))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(locations).values({ ...l, isActive: true, createdBy: userId });
    }
  }

  const allLocs = await db.select().from(locations);
  const locId = (path: string) => allLocs.find((l) => l.fullPath === path)!.id;

  const locReceiving       = locId("WH01/Receiving");
  const locZoneA           = locId("WH01/Storage/Zone-A");
  const locZoneB           = locId("WH01/Storage/Zone-B");
  const locDispatch        = locId("WH01/Dispatch");
  const locSouthReceiving  = locId("WH02/Receiving");
  const locSouthStorage    = locId("WH02/Storage");
  const locNorthInput      = locId("WH03/Input");
  const locNorthProduction = locId("WH03/Production");
  log("locations", `${allLocs.length} total`);

  // ── 6. Products ────────────────────────────────────────────────────────────
  console.log("\n── Products");

  const productData = [
    { sku: "RM-STEEL-001",    name: "Steel Sheet",          description: "Cold-rolled steel sheet 2mm",     categoryId: catRawMaterials, uomId: uomKg  },
    { sku: "RM-COPPER-002",   name: "Copper Wire",          description: "Electrical copper wire 1.5mm",    categoryId: catRawMaterials, uomId: uomM   },
    { sku: "RM-ALUM-003",     name: "Aluminium Ingot",      description: "99.7% pure aluminium ingots",     categoryId: catRawMaterials, uomId: uomKg  },
    { sku: "RM-NYLON-004",    name: "Nylon Granules",       description: "PA6 nylon granules for injection",categoryId: catRawMaterials, uomId: uomKg  },
    { sku: "RM-PP-005",       name: "Polypropylene",        description: "Polypropylene resin pellets",      categoryId: catRawMaterials, uomId: uomKg  },
    { sku: "PKG-CARD-001",    name: "Cardboard Box L",      description: "Large corrugated cardboard box",  categoryId: catPackaging,    uomId: uomBox },
    { sku: "PKG-BUBBLE-002",  name: "Bubble Wrap Roll",     description: "500mm wide bubble wrap roll",     categoryId: catPackaging,    uomId: uomRoll},
    { sku: "ELEC-RES-001",    name: "Resistor 10kΩ",       description: "SMD 0805 10kΩ resistor",          categoryId: catElectronics,  uomId: uomPcs },
    { sku: "ELEC-CAP-002",    name: "Capacitor 100µF",     description: "Electrolytic 100µF 16V",          categoryId: catElectronics,  uomId: uomPcs },
    { sku: "ELEC-MCU-003",    name: "Microcontroller",      description: "ARM Cortex-M0 MCU",               categoryId: catElectronics,  uomId: uomPcs },
    { sku: "CHEM-ETH-001",    name: "Industrial Ethanol",   description: "96% ethanol for industrial use",  categoryId: catChemicals,    uomId: uomL   },
    { sku: "CHEM-ACE-002",    name: "Acetone Solvent",      description: "Technical grade acetone",         categoryId: catChemicals,    uomId: uomL   },
  ];

  for (const p of productData) {
    await db
      .insert(products)
      .values({ ...p, isActive: true, createdBy: userId })
      .onConflictDoNothing(); // sku is unique
  }

  const allProds = await db.select().from(products);
  const prodId = (sku: string) => allProds.find((p) => p.sku === sku)!.id;

  const pSteel           = prodId("RM-STEEL-001");
  const pAluminium       = prodId("RM-ALUM-003");
  const pResistor        = prodId("ELEC-RES-001");
  const pCapacitor       = prodId("ELEC-CAP-002");
  const pMicrocontroller = prodId("ELEC-MCU-003");
  const pEthanol         = prodId("CHEM-ETH-001");
  const pAcetone         = prodId("CHEM-ACE-002");
  log("products", `${allProds.length} total`);

  // ── 7. Receipts ────────────────────────────────────────────────────────────
  console.log("\n── Receipts");

  // Helper: upsert receipt by number
  async function upsertReceipt(values: Parameters<typeof db.insert>[0] extends any ? any : never) {
    const existing = await db
      .select()
      .from(receipts)
      .where(eq(receipts.receiptNumber, values.receiptNumber))
      .limit(1);
    if (existing.length > 0) return existing[0].id as string;
    const [r] = await db.insert(receipts).values(values).returning();
    return r.id as string;
  }

  const rec1Id = await upsertReceipt({
    receiptNumber: "REC/20260901/0001", supplierName: "Bharat Steel Corp",
    supplierReference: "BSC-PO-20260831", warehouseId: whMain,
    defaultLocationId: locReceiving, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-01T10:00:00Z"),
    createdAt: new Date("2026-09-01T08:00:00Z"), updatedAt: new Date(),
  });

  const rec2Id = await upsertReceipt({
    receiptNumber: "REC/20260905/0002", supplierName: "MicroSource Electronics",
    supplierReference: "MSE-INV-5502", warehouseId: whMain,
    defaultLocationId: locReceiving, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-05T14:00:00Z"),
    createdAt: new Date("2026-09-05T09:00:00Z"), updatedAt: new Date(),
  });

  const rec3Id = await upsertReceipt({
    receiptNumber: "REC/20260910/0003", supplierName: "ChemIndia Supplies",
    supplierReference: "CI-ORD-2026-089", warehouseId: whSouth,
    defaultLocationId: locSouthReceiving, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-10T11:00:00Z"),
    createdAt: new Date("2026-09-10T08:00:00Z"), updatedAt: new Date(),
  });

  await upsertReceipt({
    receiptNumber: "REC/20260915/0004", supplierName: "PackPro Solutions",
    warehouseId: whMain, defaultLocationId: locReceiving, status: "READY",
    createdBy: userId, createdAt: new Date("2026-09-15T07:00:00Z"), updatedAt: new Date(),
  });

  await upsertReceipt({
    receiptNumber: "REC/20260918/0005", supplierName: "PolyTech Resins",
    warehouseId: whNorth, defaultLocationId: locNorthInput, status: "DRAFT",
    createdBy: userId, createdAt: new Date("2026-09-18T07:00:00Z"), updatedAt: new Date(),
  });

  await upsertReceipt({
    receiptNumber: "REC/20260920/0006", supplierName: "CopperLink Industries",
    supplierReference: "CLI-2026-334", warehouseId: whMain,
    defaultLocationId: locReceiving, status: "WAITING",
    createdBy: userId, createdAt: new Date("2026-09-20T07:00:00Z"), updatedAt: new Date(),
  });

  // Receipt items (only insert if none exist for that receipt)
  async function seedReceiptItems(receiptId: string, items: any[]) {
    const existing = await db.select().from(receiptItems).where(eq(receiptItems.receiptId, receiptId)).limit(1);
    if (existing.length > 0) return;
    await db.insert(receiptItems).values(items.map((i) => ({ receiptId, ...i })));
  }

  await seedReceiptItems(rec1Id, [
    { productId: pSteel,    destinationLocationId: locZoneA, quantity: qty(500),   unitPrice: "82.50"  },
    { productId: pAluminium, destinationLocationId: locZoneA, quantity: qty(200),  unitPrice: "145.00" },
  ]);
  await seedReceiptItems(rec2Id, [
    { productId: pResistor,        destinationLocationId: locZoneB, quantity: qty(10000), unitPrice: "0.02"  },
    { productId: pCapacitor,       destinationLocationId: locZoneB, quantity: qty(5000),  unitPrice: "0.08"  },
    { productId: pMicrocontroller, destinationLocationId: locZoneB, quantity: qty(300),   unitPrice: "4.50"  },
  ]);
  await seedReceiptItems(rec3Id, [
    { productId: pEthanol, destinationLocationId: locSouthStorage, quantity: qty(800), unitPrice: "35.00" },
    { productId: pAcetone, destinationLocationId: locSouthStorage, quantity: qty(400), unitPrice: "28.00" },
  ]);

  const allRecs = await db.select().from(receipts);
  log("receipts", `${allRecs.length} total`);

  // ── 8. Internal Transfers ─────────────────────────────────────────────────
  console.log("\n── Internal Transfers");

  async function upsertTransfer(values: any) {
    const existing = await db
      .select()
      .from(internalTransfers)
      .where(eq(internalTransfers.transferNumber, values.transferNumber))
      .limit(1);
    if (existing.length > 0) return existing[0].id as string;
    const [t] = await db.insert(internalTransfers).values(values).returning();
    return t.id as string;
  }

  // Transfer 1: ZoneA → ZoneB (different locations ✓)
  const tr1Id = await upsertTransfer({
    transferNumber: "INT/20260908/0001",
    notes: "Moving steel to Zone B for production staging",
    sourceLocationId: locZoneA, destinationLocationId: locZoneB,
    status: "DONE", createdBy: userId,
    completedAt: new Date("2026-09-08T15:00:00Z"),
    createdAt: new Date("2026-09-08T13:00:00Z"), updatedAt: new Date(),
  });

  // Transfer 2: ZoneB → NorthProduction (different locations ✓)
  const tr2Id = await upsertTransfer({
    transferNumber: "INT/20260912/0002",
    notes: "Supply electronics to production floor",
    sourceLocationId: locZoneB, destinationLocationId: locNorthProduction,
    status: "DONE", createdBy: userId,
    completedAt: new Date("2026-09-12T16:00:00Z"),
    createdAt: new Date("2026-09-12T14:00:00Z"), updatedAt: new Date(),
  });

  // Transfer 3: ZoneA → Dispatch (READY)
  await upsertTransfer({
    transferNumber: "INT/20260921/0003",
    notes: "Staging aluminium for dispatch",
    sourceLocationId: locZoneA, destinationLocationId: locDispatch,
    status: "READY", createdBy: userId,
    createdAt: new Date("2026-09-21T07:00:00Z"), updatedAt: new Date(),
  });

  async function seedTransferItems(transferId: string, items: any[]) {
    const existing = await db.select().from(internalTransferItems).where(eq(internalTransferItems.transferId, transferId)).limit(1);
    if (existing.length > 0) return;
    await db.insert(internalTransferItems).values(items.map((i) => ({ transferId, ...i })));
  }

  await seedTransferItems(tr1Id, [
    { productId: pSteel,    quantity: qty(150) },
    { productId: pAluminium, quantity: qty(80) },
  ]);
  await seedTransferItems(tr2Id, [
    { productId: pMicrocontroller, quantity: qty(100)  },
    { productId: pResistor,        quantity: qty(2000) },
  ]);

  const allTrs = await db.select().from(internalTransfers);
  log("internal_transfers", `${allTrs.length} total`);

  // ── 9. Deliveries ──────────────────────────────────────────────────────────
  console.log("\n── Deliveries");

  async function upsertDelivery(values: any) {
    const existing = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.deliveryNumber, values.deliveryNumber))
      .limit(1);
    if (existing.length > 0) return existing[0].id as string;
    const [d] = await db.insert(deliveries).values(values).returning();
    return d.id as string;
  }

  const del1Id = await upsertDelivery({
    deliveryNumber: "DEL/20260914/0001", customerName: "Precision Parts Ltd",
    customerReference: "PPL-SO-20260912", warehouseId: whMain,
    defaultSourceLocationId: locZoneB, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-14T13:00:00Z"),
    createdAt: new Date("2026-09-14T09:00:00Z"), updatedAt: new Date(),
  });

  const del2Id = await upsertDelivery({
    deliveryNumber: "DEL/20260916/0002", customerName: "TechAssemble Inc",
    customerReference: "TAI-PO-1122", warehouseId: whNorth,
    defaultSourceLocationId: locNorthProduction, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-16T11:00:00Z"),
    createdAt: new Date("2026-09-16T08:00:00Z"), updatedAt: new Date(),
  });

  await upsertDelivery({
    deliveryNumber: "DEL/20260922/0003", customerName: "NovaChem Processing",
    warehouseId: whSouth, defaultSourceLocationId: locSouthStorage,
    status: "READY", createdBy: userId,
    createdAt: new Date("2026-09-22T07:00:00Z"), updatedAt: new Date(),
  });

  await upsertDelivery({
    deliveryNumber: "DEL/20260923/0004", customerName: "BuildCore Constructions",
    warehouseId: whMain, defaultSourceLocationId: locZoneA,
    status: "DRAFT", createdBy: userId,
    createdAt: new Date("2026-09-23T07:00:00Z"), updatedAt: new Date(),
  });

  async function seedDeliveryItems(deliveryId: string, items: any[]) {
    const existing = await db.select().from(deliveryItems).where(eq(deliveryItems.deliveryId, deliveryId)).limit(1);
    if (existing.length > 0) return;
    await db.insert(deliveryItems).values(items.map((i) => ({ deliveryId, ...i })));
  }

  await seedDeliveryItems(del1Id, [
    { productId: pSteel,    sourceLocationId: locZoneB, quantity: qty(120), unitPrice: "95.00"  },
    { productId: pAluminium, sourceLocationId: locZoneB, quantity: qty(50),  unitPrice: "160.00" },
  ]);
  await seedDeliveryItems(del2Id, [
    { productId: pMicrocontroller, sourceLocationId: locNorthProduction, quantity: qty(60),  unitPrice: "5.20"  },
    { productId: pResistor,        sourceLocationId: locNorthProduction, quantity: qty(800), unitPrice: "0.025" },
  ]);

  const allDels = await db.select().from(deliveries);
  log("deliveries", `${allDels.length} total`);

  // ── 10. Inventory Adjustments ──────────────────────────────────────────────
  console.log("\n── Inventory Adjustments");

  async function upsertAdjustment(values: any) {
    const existing = await db
      .select()
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.adjustmentNumber, values.adjustmentNumber))
      .limit(1);
    if (existing.length > 0) return existing[0].id as string;
    const [a] = await db.insert(inventoryAdjustments).values(values).returning();
    return a.id as string;
  }

  const adj1Id = await upsertAdjustment({
    adjustmentNumber: "ADJ/20260917/0001",
    reason: "Quarterly physical count — Zone A discrepancy found",
    locationId: locZoneA, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-17T15:00:00Z"),
    createdAt: new Date("2026-09-17T10:00:00Z"), updatedAt: new Date(),
  });

  await upsertAdjustment({
    adjustmentNumber: "ADJ/20260924/0002",
    reason: "Random spot check on chemical inventory",
    locationId: locSouthStorage, status: "DRAFT", createdBy: userId,
    createdAt: new Date("2026-09-24T07:00:00Z"), updatedAt: new Date(),
  });

  // Adjustment items
  const existAdj1Items = await db.select().from(inventoryAdjustmentItems)
    .where(eq(inventoryAdjustmentItems.adjustmentId, adj1Id)).limit(1);
  if (existAdj1Items.length === 0) {
    await db.insert(inventoryAdjustmentItems).values({
      adjustmentId: adj1Id, productId: pSteel,
      systemQuantity: qty(350), countedQuantity: qty(347), difference: qty(-3),
    });
  }

  const allAdjs = await db.select().from(inventoryAdjustments);
  log("inventory_adjustments", `${allAdjs.length} total`);

  // ── 11. Stock Movements ────────────────────────────────────────────────────
  console.log("\n── Stock Movements");

  const movCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM stock_movements`);
  if ((movCount[0] as any).c > 0) {
    log("stock_movements", `already have movements — skipping`);
  } else {
    await db.insert(stockMovements).values([
      // Receipts
      { productId: pSteel,           destinationLocationId: locZoneA,        quantity: qty(500),   movementType: "RECEIPT",    referenceType: "RECEIPT",             referenceId: rec1Id, createdBy: userId, createdAt: new Date("2026-09-01T10:05:00Z") },
      { productId: pAluminium,       destinationLocationId: locZoneA,        quantity: qty(200),   movementType: "RECEIPT",    referenceType: "RECEIPT",             referenceId: rec1Id, createdBy: userId, createdAt: new Date("2026-09-01T10:06:00Z") },
      { productId: pResistor,        destinationLocationId: locZoneB,        quantity: qty(10000), movementType: "RECEIPT",    referenceType: "RECEIPT",             referenceId: rec2Id, createdBy: userId, createdAt: new Date("2026-09-05T14:05:00Z") },
      { productId: pCapacitor,       destinationLocationId: locZoneB,        quantity: qty(5000),  movementType: "RECEIPT",    referenceType: "RECEIPT",             referenceId: rec2Id, createdBy: userId, createdAt: new Date("2026-09-05T14:06:00Z") },
      { productId: pMicrocontroller, destinationLocationId: locZoneB,        quantity: qty(300),   movementType: "RECEIPT",    referenceType: "RECEIPT",             referenceId: rec2Id, createdBy: userId, createdAt: new Date("2026-09-05T14:07:00Z") },
      { productId: pEthanol,         destinationLocationId: locSouthStorage, quantity: qty(800),   movementType: "RECEIPT",    referenceType: "RECEIPT",             referenceId: rec3Id, createdBy: userId, createdAt: new Date("2026-09-10T11:05:00Z") },
      { productId: pAcetone,         destinationLocationId: locSouthStorage, quantity: qty(400),   movementType: "RECEIPT",    referenceType: "RECEIPT",             referenceId: rec3Id, createdBy: userId, createdAt: new Date("2026-09-10T11:06:00Z") },
      // Transfers
      { productId: pSteel,           sourceLocationId: locZoneA, destinationLocationId: locZoneB,           quantity: qty(150),  movementType: "TRANSFER", referenceType: "INTERNAL_TRANSFER",   referenceId: tr1Id, createdBy: userId, createdAt: new Date("2026-09-08T15:05:00Z") },
      { productId: pAluminium,       sourceLocationId: locZoneA, destinationLocationId: locZoneB,           quantity: qty(80),   movementType: "TRANSFER", referenceType: "INTERNAL_TRANSFER",   referenceId: tr1Id, createdBy: userId, createdAt: new Date("2026-09-08T15:06:00Z") },
      { productId: pMicrocontroller, sourceLocationId: locZoneB, destinationLocationId: locNorthProduction, quantity: qty(100),  movementType: "TRANSFER", referenceType: "INTERNAL_TRANSFER",   referenceId: tr2Id, createdBy: userId, createdAt: new Date("2026-09-12T16:05:00Z") },
      { productId: pResistor,        sourceLocationId: locZoneB, destinationLocationId: locNorthProduction, quantity: qty(2000), movementType: "TRANSFER", referenceType: "INTERNAL_TRANSFER",   referenceId: tr2Id, createdBy: userId, createdAt: new Date("2026-09-12T16:06:00Z") },
      // Deliveries
      { productId: pSteel,           sourceLocationId: locZoneB,             quantity: qty(120),  movementType: "DELIVERY",   referenceType: "DELIVERY",            referenceId: del1Id, createdBy: userId, createdAt: new Date("2026-09-14T13:05:00Z") },
      { productId: pAluminium,       sourceLocationId: locZoneB,             quantity: qty(50),   movementType: "DELIVERY",   referenceType: "DELIVERY",            referenceId: del1Id, createdBy: userId, createdAt: new Date("2026-09-14T13:06:00Z") },
      { productId: pMicrocontroller, sourceLocationId: locNorthProduction,   quantity: qty(60),   movementType: "DELIVERY",   referenceType: "DELIVERY",            referenceId: del2Id, createdBy: userId, createdAt: new Date("2026-09-16T11:05:00Z") },
      { productId: pResistor,        sourceLocationId: locNorthProduction,   quantity: qty(800),  movementType: "DELIVERY",   referenceType: "DELIVERY",            referenceId: del2Id, createdBy: userId, createdAt: new Date("2026-09-16T11:06:00Z") },
      // Adjustment
      { productId: pSteel,           sourceLocationId: locZoneA,             quantity: qty(3),    movementType: "ADJUSTMENT", referenceType: "INVENTORY_ADJUSTMENT", referenceId: adj1Id, createdBy: userId, createdAt: new Date("2026-09-17T15:05:00Z") },
    ]);
    log("stock_movements", "inserted 16 movements");
  }

  // ── 12. Stock Balances ─────────────────────────────────────────────────────
  // Final authoritative state after all operations:
  //   Steel:    ZoneA=347 (500-150-3), ZoneB=30 (150-120)
  //   Aluminium:ZoneA=120 (200-80),    ZoneB=30 (80-50)
  //   Resistor: ZoneB=8000(10000-2000),NorthProd=1200(2000-800)
  //   Capacitor:ZoneB=5000
  //   MCU:      ZoneB=200(300-100),    NorthProd=40(100-60)
  //   Ethanol:  SouthStorage=800
  //   Acetone:  SouthStorage=400
  console.log("\n── Stock Balances");

  const balances = [
    { productId: pSteel,           locationId: locZoneA,           quantity: qty(347),  reservedQuantity: qty(0) },
    { productId: pSteel,           locationId: locZoneB,           quantity: qty(30),   reservedQuantity: qty(0) },
    { productId: pAluminium,       locationId: locZoneA,           quantity: qty(120),  reservedQuantity: qty(0) },
    { productId: pAluminium,       locationId: locZoneB,           quantity: qty(30),   reservedQuantity: qty(0) },
    { productId: pResistor,        locationId: locZoneB,           quantity: qty(8000), reservedQuantity: qty(0) },
    { productId: pResistor,        locationId: locNorthProduction, quantity: qty(1200), reservedQuantity: qty(0) },
    { productId: pCapacitor,       locationId: locZoneB,           quantity: qty(5000), reservedQuantity: qty(0) },
    { productId: pMicrocontroller, locationId: locZoneB,           quantity: qty(200),  reservedQuantity: qty(0) },
    { productId: pMicrocontroller, locationId: locNorthProduction, quantity: qty(40),   reservedQuantity: qty(0) },
    { productId: pEthanol,         locationId: locSouthStorage,    quantity: qty(800),  reservedQuantity: qty(0) },
    { productId: pAcetone,         locationId: locSouthStorage,    quantity: qty(400),  reservedQuantity: qty(0) },
  ];

  for (const b of balances) {
    await db
      .insert(stockBalances)
      .values({ ...b, lastMovedAt: new Date() })
      .onConflictDoNothing(); // unique on (productId, locationId)
  }

  const balCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM stock_balances`);
  log("stock_balances", `${(balCount[0] as any).c} total`);

  // ── 13. Reorder Rules ──────────────────────────────────────────────────────
  console.log("\n── Reorder Rules");

  const rrData = [
    { productId: pSteel,           locationId: locZoneA,           minQuantity: qty(100),  maxQuantity: qty(600),  reorderQty: qty(300)  },
    { productId: pAluminium,       locationId: locZoneA,           minQuantity: qty(50),   maxQuantity: qty(300),  reorderQty: qty(150)  },
    { productId: pResistor,        locationId: locZoneB,           minQuantity: qty(1000), maxQuantity: qty(15000),reorderQty: qty(5000) },
    { productId: pCapacitor,       locationId: locZoneB,           minQuantity: qty(500),  maxQuantity: qty(8000), reorderQty: qty(3000) },
    { productId: pMicrocontroller, locationId: locZoneB,           minQuantity: qty(50),   maxQuantity: qty(500),  reorderQty: qty(200)  },
    { productId: pEthanol,         locationId: locSouthStorage,    minQuantity: qty(100),  maxQuantity: qty(1000), reorderQty: qty(400)  },
  ];

  for (const rr of rrData) {
    const existing = await db.select().from(reorderRules)
      .where(eq(reorderRules.productId, rr.productId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(reorderRules).values({ ...rr, isActive: true, createdBy: userId });
    }
  }

  const rrCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM reorder_rules`);
  log("reorder_rules", `${(rrCount[0] as any).c} total`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log("\n✅  Seed complete!\n");
  console.log("  Demo login:");
  console.log("    Email:    alex.mercer@stocksense.io");
  console.log("    Password: StockSense2026!\n");

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  process.exit(1);
});
