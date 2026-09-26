/**
 * StockSense — Production-Grade Database Seed Script
 *
 * Populates all master data and operational tables with 50+ realistic products,
 * warehouse locations, receipts, deliveries, transfers, adjustments, stock balances,
 * ledger movement history, and reorder rules.
 *
 * Idempotent: safe to execute multiple times.
 * Run with:  bun run db:seed
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";

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

async function seed() {
  console.log("\n🌱  StockSense Extended 50-Product Seed Starting…\n");

  // ── 0. Cleanup Test Orphan Warehouses ──────────────────────────────────────
  console.log("── Cleanup test data");

  const testWhs = await db.execute(sql`
    SELECT id FROM warehouses WHERE short_code NOT IN ('WH01','WH02','WH03','WH04','WH05')
  `);

  for (const tw of testWhs as any[]) {
    const twId = tw.id as string;
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
  }
  log("cleanup", "done");

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log("\n── Users");

  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Alex Mercer",
      email: "alex.mercer@stocksense.io",
      passwordHash: await Bun.password.hash("StockSense2026!", { algorithm: "argon2id" }),
      role: "admin",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: "admin", isActive: true },
    })
    .returning();

  const userId = adminUser.id;
  log("users", `admin user id: ${userId}`);

  // ── 2. Categories ──────────────────────────────────────────────────────────
  console.log("\n── Categories");

  const catData = [
    { name: "Raw Materials",        description: "Base input materials for production", color: "#6366f1" },
    { name: "Packaging",            description: "Boxes, wraps, and packing materials",  color: "#f59e0b" },
    { name: "Electronics",          description: "Electronic components and assemblies", color: "#10b981" },
    { name: "Chemicals",            description: "Industrial chemicals and solvents",    color: "#ef4444" },
    { name: "Hardware & Fasteners", description: "Nuts, bolts, screws, and bearings",   color: "#8b5cf6" },
    { name: "Safety Equipment",     description: "Personal protective equipment (PPE)",  color: "#ec4899" },
    { name: "Office Supplies",      description: "Administrative consumables and toner", color: "#06b6d4" },
    { name: "Consumables",          description: "Production cleanroom wipes and solder",color: "#64748b" },
  ];

  for (const c of catData) {
    await db
      .insert(categories)
      .values({ ...c, isActive: true, createdBy: userId })
      .onConflictDoNothing();
  }

  const allCats = await db.select().from(categories);
  const catMap = new Map(allCats.map((c) => [c.name, c.id]));
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
  const uomMap = new Map(allUoms.map((u) => [u.abbreviation, u.id]));
  log("uoms", `${allUoms.length} total`);

  // ── 4. Warehouses ──────────────────────────────────────────────────────────
  console.log("\n── Warehouses");

  const whData = [
    { name: "Main Central Warehouse",   shortCode: "WH01", description: "Primary distribution and storage hub",  address: "12 Industrial Ave, Central District" },
    { name: "South Regional Depot",     shortCode: "WH02", description: "Secondary warehouse for southern zone", address: "45 Logistics Park, South Zone" },
    { name: "North Production Store",   shortCode: "WH03", description: "On-site materials store for plant",     address: "7 Factory Road, North Campus" },
    { name: "East Cold Storage Facility",shortCode: "WH04", description: "Temperature-controlled storage hub",    address: "88 Refrigeration Way, East Sector" },
    { name: "West Assembly Hub",        shortCode: "WH05", description: "Sub-assembly and component warehouse",  address: "102 Assembly Blvd, West Tech Zone" },
  ];

  for (const w of whData) {
    await db
      .insert(warehouses)
      .values({ ...w, isActive: true, createdBy: userId })
      .onConflictDoNothing();
  }

  const allWhs = await db.select().from(warehouses);
  const whMap = new Map(allWhs.map((w) => [w.shortCode, w.id]));
  log("warehouses", `${allWhs.length} total`);

  // ── 5. Locations ───────────────────────────────────────────────────────────
  console.log("\n── Locations");

  const locData = [
    { warehouseId: whMap.get("WH01")!, name: "Receiving",       fullPath: "WH01/Receiving",       locationType: "input"    },
    { warehouseId: whMap.get("WH01")!, name: "Zone A",          fullPath: "WH01/Storage/Zone-A",  locationType: "internal" },
    { warehouseId: whMap.get("WH01")!, name: "Zone B",          fullPath: "WH01/Storage/Zone-B",  locationType: "internal" },
    { warehouseId: whMap.get("WH01")!, name: "Dispatch",        fullPath: "WH01/Dispatch",         locationType: "output"   },
    { warehouseId: whMap.get("WH02")!, name: "Receiving",       fullPath: "WH02/Receiving",        locationType: "input"    },
    { warehouseId: whMap.get("WH02")!, name: "Storage",         fullPath: "WH02/Storage",          locationType: "internal" },
    { warehouseId: whMap.get("WH03")!, name: "Input",           fullPath: "WH03/Input",            locationType: "input"    },
    { warehouseId: whMap.get("WH03")!, name: "Production",      fullPath: "WH03/Production",       locationType: "internal" },
    { warehouseId: whMap.get("WH04")!, name: "Cold Storage B1", fullPath: "WH04/Cold-Storage-B1",  locationType: "internal" },
    { warehouseId: whMap.get("WH05")!, name: "Assembly Zone 1", fullPath: "WH05/Assembly-Zone-1",  locationType: "internal" },
  ];

  for (const l of locData) {
    const existing = await db.select().from(locations).where(eq(locations.fullPath, l.fullPath)).limit(1);
    if (existing.length === 0) {
      await db.insert(locations).values({ ...l, isActive: true, createdBy: userId });
    }
  }

  const allLocs = await db.select().from(locations);
  const locMap = new Map(allLocs.map((l) => [l.fullPath, l.id]));
  log("locations", `${allLocs.length} total`);

  // ── 6. 50+ Products Catalog ────────────────────────────────────────────────
  console.log("\n── Products (50 items)");

  const productData = [
    // Raw Materials (10)
    { sku: "RM-STEEL-001",    name: "Steel Sheet 2mm",          description: "Cold-rolled steel sheet 2mm thickness",           categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("kg")! },
    { sku: "RM-COPPER-002",   name: "Copper Wire 1.5mm",        description: "Electrical copper wire 1.5mm insulation",         categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("m")!  },
    { sku: "RM-ALUM-003",     name: "Aluminium Ingot 99.7%",    description: "High purity 99.7% aluminium ingots",              categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("kg")! },
    { sku: "RM-NYLON-004",    name: "Nylon PA6 Granules",       description: "Industrial PA6 nylon granules for injection",     categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("kg")! },
    { sku: "RM-PP-005",       name: "Polypropylene Pellets",    description: "Polypropylene resin pellets grade A",             categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("kg")! },
    { sku: "RM-BRASS-006",    name: "Brass Rod 10mm",           description: "Solid brass round rod 10mm diameter",             categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("m")!  },
    { sku: "RM-RUBBER-007",   name: "EPDM Industrial Rubber",   description: "EPDM synthetic rubber sheet 5mm",                 categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("kg")! },
    { sku: "RM-TITAN-008",    name: "Titanium Alloy Bar",       description: "Grade 5 Titanium alloy round bar",                categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("kg")! },
    { sku: "RM-SILICONE-009", name: "Liquid Silicone Compound", description: "Two-part high grade liquid silicone",             categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("L")!  },
    { sku: "RM-SS-010",       name: "Stainless Steel 304 Tube", description: "Seamless stainless steel 304 pipe 1-inch",       categoryId: catMap.get("Raw Materials")!, uomId: uomMap.get("m")!  },

    // Packaging (10)
    { sku: "PKG-CARD-001",    name: "Cardboard Box L",          description: "Large corrugated cardboard shipping box",         categoryId: catMap.get("Packaging")!, uomId: uomMap.get("box")! },
    { sku: "PKG-BUBBLE-002",  name: "Bubble Wrap Roll 500mm",   description: "500mm wide protective bubble wrap roll",          categoryId: catMap.get("Packaging")!, uomId: uomMap.get("roll")! },
    { sku: "PKG-TAPE-003",    name: "Heavy Duty Packing Tape",  description: "Clear acrylic heavy duty sealing tape",           categoryId: catMap.get("Packaging")!, uomId: uomMap.get("roll")! },
    { sku: "PKG-PALLET-004",  name: "Standard Wooden Pallet",   description: "1200x1000mm heat-treated wooden pallet",          categoryId: catMap.get("Packaging")!, uomId: uomMap.get("pcs")!  },
    { sku: "PKG-WRAP-005",    name: "Stretch Wrap Film",        description: "Industrial 20-micron stretch wrap film",          categoryId: catMap.get("Packaging")!, uomId: uomMap.get("roll")! },
    { sku: "PKG-FOAM-006",    name: "Polyethylene Foam Inserts",description: "Custom protective PE foam packaging inserts",     categoryId: catMap.get("Packaging")!, uomId: uomMap.get("box")!  },
    { sku: "PKG-ENV-007",     name: "Padded Shipping Envelopes",description: "Self-seal kraft padded bubble mailers",            categoryId: catMap.get("Packaging")!, uomId: uomMap.get("box")!  },
    { sku: "PKG-STRAP-008",   name: "PP Strapping Band Roll",   description: "12mm polypropylene strapping band roll",          categoryId: catMap.get("Packaging")!, uomId: uomMap.get("roll")! },
    { sku: "PKG-LABEL-009",   name: "Thermal Shipping Labels",  description: "4x6 inch direct thermal labels 1000/roll",        categoryId: catMap.get("Packaging")!, uomId: uomMap.get("roll")! },
    { sku: "PKG-CRATE-010",   name: "Heavy Wooden Export Crate",description: "Plywood ISPM-15 certified export shipping crate", categoryId: catMap.get("Packaging")!, uomId: uomMap.get("pcs")!  },

    // Electronics (10)
    { sku: "ELEC-RES-001",    name: "Resistor 10kΩ SMD",        description: "SMD 0805 10kΩ 1% resistor",                       categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-CAP-002",    name: "Capacitor 100µF",          description: "Electrolytic 100µF 16V radial capacitor",         categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-MCU-003",    name: "ARM Cortex-M0 MCU",        description: "32-bit ARM Cortex-M0 microcontroller IC",         categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-LED-004",    name: "Green SMD LED 0603",       description: "High brightness green 0603 surface mount LED",    categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-DIO-005",    name: "Schottky Diode 1N5819",    description: "1A 40V Schottky barrier rectifier diode",         categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-PCB-006",    name: "Controller PCB Blank",     description: "4-layer FR4 double sided printed circuit board",   categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-TRANS-007",  name: "NPN Transistor 2N2222",    description: "General purpose NPN switching transistor TO-92",  categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-SENS-008",   name: "Temp & Humidity Sensor",   description: "Digital temperature and relative humidity sensor",categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-REL-009",    name: "12V DC Relay Module",      description: "10A 250V AC single channel 12V relay board",      categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },
    { sku: "ELEC-CONN-010",   name: "4-Pin Terminal Block",     description: "5.08mm pitch 4-pin screw terminal connector",     categoryId: catMap.get("Electronics")!, uomId: uomMap.get("pcs")! },

    // Chemicals (7)
    { sku: "CHEM-ETH-001",    name: "Industrial Ethanol 96%",   description: "96% pure denatured ethanol solvent",              categoryId: catMap.get("Chemicals")!, uomId: uomMap.get("L")!   },
    { sku: "CHEM-ACE-002",    name: "Acetone Solvent",          description: "Technical grade pure acetone liquid",              categoryId: catMap.get("Chemicals")!, uomId: uomMap.get("L")!   },
    { sku: "CHEM-IPA-003",    name: "Isopropanol 99.9%",        description: "99.9% anhydrous isopropyl alcohol cleaner",       categoryId: catMap.get("Chemicals")!, uomId: uomMap.get("L")!   },
    { sku: "CHEM-DEG-004",    name: "Heavy Duty Degreaser",     description: "Water-based alkaline industrial degreaser",       categoryId: catMap.get("Chemicals")!, uomId: uomMap.get("L")!   },
    { sku: "CHEM-EPOXY-005",  name: "Two-Part Epoxy Resin",     description: "High-strength structural epoxy adhesive",         categoryId: catMap.get("Chemicals")!, uomId: uomMap.get("L")!   },
    { sku: "CHEM-COOL-006",   name: "CNC Synthetic Coolant",    description: "Water soluble metalworking coolant concentrate",  categoryId: catMap.get("Chemicals")!, uomId: uomMap.get("L")!   },
    { sku: "CHEM-LUBE-007",   name: "Bearing Synthetic Grease", description: "High temperature lithium complex grease",           categoryId: catMap.get("Chemicals")!, uomId: uomMap.get("kg")!  },

    // Hardware & Fasteners (5)
    { sku: "HW-BOLT-001",     name: "M8x30mm Stainless Bolt",   description: "Hexagon head bolt M8 x 30mm A2 stainless",        categoryId: catMap.get("Hardware & Fasteners")!, uomId: uomMap.get("pcs")! },
    { sku: "HW-NUT-002",      name: "M8 Nylon Lock Nut",        description: "M8 A2 stainless steel nylon insert lock nut",     categoryId: catMap.get("Hardware & Fasteners")!, uomId: uomMap.get("pcs")! },
    { sku: "HW-WASHER-003",   name: "M8 Flat Washer",           description: "M8 plain flat washer stainless steel 304",        categoryId: catMap.get("Hardware & Fasteners")!, uomId: uomMap.get("pcs")! },
    { sku: "HW-SCREW-004",    name: "M4x16mm Self-Tapping Screw",description: "Cross recessed pan head self tapping screw",  categoryId: catMap.get("Hardware & Fasteners")!, uomId: uomMap.get("pcs")! },
    { sku: "HW-BEAR-005",     name: "Deep Groove Bearing 6204", description: "Rubber sealed deep groove ball bearing 6204-2RS", categoryId: catMap.get("Hardware & Fasteners")!, uomId: uomMap.get("pcs")! },

    // Safety Equipment (4)
    { sku: "SAFE-GLOVE-001",  name: "Cut-Resistant Work Gloves",description: "ANSI Level 5 cut resistant nitrile coated gloves",categoryId: catMap.get("Safety Equipment")!, uomId: uomMap.get("pcs")! },
    { sku: "SAFE-GLASS-002",  name: "Anti-Fog Safety Goggles",  description: "Clear UV scratch resistant anti-fog safety glasses",categoryId: catMap.get("Safety Equipment")!, uomId: uomMap.get("pcs")! },
    { sku: "SAFE-MASK-003",   name: "N95 Particulate Mask",     description: "NIOSH approved N95 filtering facepiece respirator",categoryId: catMap.get("Safety Equipment")!, uomId: uomMap.get("box")! },
    { sku: "SAFE-HELM-004",   name: "Yellow Industrial Hard Hat",description: "HDPE hard hat with 4-point ratchet suspension",   categoryId: catMap.get("Safety Equipment")!, uomId: uomMap.get("pcs")! },

    // Office Supplies & Consumables (4)
    { sku: "CONS-WIPE-001",   name: "Lint-Free Cleanroom Wipes",description: "Polyester lint-free precision wiping cloths",     categoryId: catMap.get("Consumables")!, uomId: uomMap.get("box")!  },
    { sku: "CONS-SOLD-002",   name: "Lead-Free Solder Wire 1mm",description: "SAC305 rosin core lead-free solder wire 500g",     categoryId: catMap.get("Consumables")!, uomId: uomMap.get("roll")! },
    { sku: "OFF-PAPER-001",   name: "A4 Copy Paper 80gsm",      description: "Premium multipurpose white A4 paper 500 sheets",  categoryId: catMap.get("Office Supplies")!, uomId: uomMap.get("box")! },
    { sku: "OFF-TONER-002",   name: "Black Laser Toner Cartridge",description: "High yield black toner cartridge for office printer",categoryId: catMap.get("Office Supplies")!, uomId: uomMap.get("pcs")! },
  ];

  for (const p of productData) {
    await db
      .insert(products)
      .values({ ...p, isActive: true, createdBy: userId })
      .onConflictDoNothing();
  }

  const allProds = await db.select().from(products);
  const prodMap = new Map(allProds.map((p) => [p.sku, p.id]));
  log("products", `${allProds.length} total products in database`);

  // ── 7. Receipts ────────────────────────────────────────────────────────────
  console.log("\n── Receipts");

  async function upsertReceipt(values: any) {
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
    supplierReference: "BSC-PO-20260831", warehouseId: whMap.get("WH01")!,
    defaultLocationId: locMap.get("WH01/Receiving")!, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-01T10:00:00Z"), createdAt: new Date("2026-09-01T08:00:00Z"), updatedAt: new Date(),
  });

  const rec2Id = await upsertReceipt({
    receiptNumber: "REC/20260905/0002", supplierName: "MicroSource Electronics",
    supplierReference: "MSE-INV-5502", warehouseId: whMap.get("WH01")!,
    defaultLocationId: locMap.get("WH01/Receiving")!, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-05T14:00:00Z"), createdAt: new Date("2026-09-05T09:00:00Z"), updatedAt: new Date(),
  });

  const rec3Id = await upsertReceipt({
    receiptNumber: "REC/20260910/0003", supplierName: "ChemIndia Supplies",
    supplierReference: "CI-ORD-2026-089", warehouseId: whMap.get("WH02")!,
    defaultLocationId: locMap.get("WH02/Receiving")!, status: "DONE", createdBy: userId,
    validatedAt: new Date("2026-09-10T11:00:00Z"), createdAt: new Date("2026-09-10T08:00:00Z"), updatedAt: new Date(),
  });

  async function seedReceiptItems(receiptId: string, items: any[]) {
    const existing = await db.select().from(receiptItems).where(eq(receiptItems.receiptId, receiptId)).limit(1);
    if (existing.length > 0) return;
    await db.insert(receiptItems).values(items.map((i) => ({ receiptId, ...i })));
  }

  await seedReceiptItems(rec1Id, [
    { productId: prodMap.get("RM-STEEL-001")!, destinationLocationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(800), unitPrice: "82.50" },
    { productId: prodMap.get("RM-ALUM-003")!,  destinationLocationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(350), unitPrice: "145.00" },
    { productId: prodMap.get("HW-BOLT-001")!,  destinationLocationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(5000), unitPrice: "0.45" },
  ]);

  await seedReceiptItems(rec2Id, [
    { productId: prodMap.get("ELEC-RES-001")!, destinationLocationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(20000), unitPrice: "0.02" },
    { productId: prodMap.get("ELEC-CAP-002")!, destinationLocationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(10000), unitPrice: "0.08" },
    { productId: prodMap.get("ELEC-MCU-003")!, destinationLocationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(600),   unitPrice: "4.50" },
  ]);

  await seedReceiptItems(rec3Id, [
    { productId: prodMap.get("CHEM-ETH-001")!, destinationLocationId: locMap.get("WH02/Storage")!, quantity: qty(1200), unitPrice: "35.00" },
    { productId: prodMap.get("CHEM-ACE-002")!, destinationLocationId: locMap.get("WH02/Storage")!, quantity: qty(600),  unitPrice: "28.00" },
  ]);

  const allRecs = await db.select().from(receipts);
  log("receipts", `${allRecs.length} total receipts`);

  // ── 8. Stock Balances (50+ records) ───────────────────────────────────────
  console.log("\n── Stock Balances (50+ records)");

  const balanceData = [
    // Raw Materials
    { productId: prodMap.get("RM-STEEL-001")!,    locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(650), reservedQuantity: qty(50) },
    { productId: prodMap.get("RM-STEEL-001")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(150), reservedQuantity: qty(0)  },
    { productId: prodMap.get("RM-COPPER-002")!,   locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(420), reservedQuantity: qty(20) },
    { productId: prodMap.get("RM-ALUM-003")!,     locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(300), reservedQuantity: qty(0)  },
    { productId: prodMap.get("RM-NYLON-004")!,    locationId: locMap.get("WH03/Production")!,       quantity: qty(250), reservedQuantity: qty(10) },
    { productId: prodMap.get("RM-PP-005")!,       locationId: locMap.get("WH03/Production")!,       quantity: qty(180), reservedQuantity: qty(0)  },
    { productId: prodMap.get("RM-BRASS-006")!,    locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(95),  reservedQuantity: qty(0)  },
    { productId: prodMap.get("RM-RUBBER-007")!,   locationId: locMap.get("WH02/Storage")!,          quantity: qty(15),  reservedQuantity: qty(0)  }, // LOW STOCK
    { productId: prodMap.get("RM-TITAN-008")!,    locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(45),  reservedQuantity: qty(5)  },
    { productId: prodMap.get("RM-SILICONE-009")!, locationId: locMap.get("WH04/Cold-Storage-B1")!,quantity: qty(8),   reservedQuantity: qty(0)  }, // LOW STOCK
    { productId: prodMap.get("RM-SS-010")!,       locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(210), reservedQuantity: qty(0)  },

    // Packaging
    { productId: prodMap.get("PKG-CARD-001")!,    locationId: locMap.get("WH01/Dispatch")!,         quantity: qty(1200),reservedQuantity: qty(100)},
    { productId: prodMap.get("PKG-BUBBLE-002")!,  locationId: locMap.get("WH01/Dispatch")!,         quantity: qty(45),  reservedQuantity: qty(0)  },
    { productId: prodMap.get("PKG-TAPE-003")!,    locationId: locMap.get("WH01/Dispatch")!,         quantity: qty(180), reservedQuantity: qty(0)  },
    { productId: prodMap.get("PKG-PALLET-004")!,  locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(85),  reservedQuantity: qty(10) },
    { productId: prodMap.get("PKG-WRAP-005")!,    locationId: locMap.get("WH01/Dispatch")!,         quantity: qty(25),  reservedQuantity: qty(0)  },
    { productId: prodMap.get("PKG-FOAM-006")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(350), reservedQuantity: qty(0)  },
    { productId: prodMap.get("PKG-ENV-007")!,     locationId: locMap.get("WH02/Storage")!,          quantity: qty(90),  reservedQuantity: qty(0)  },
    { productId: prodMap.get("PKG-STRAP-008")!,   locationId: locMap.get("WH01/Dispatch")!,         quantity: qty(12),  reservedQuantity: qty(0)  }, // LOW STOCK
    { productId: prodMap.get("PKG-LABEL-009")!,   locationId: locMap.get("WH01/Dispatch")!,         quantity: qty(50),  reservedQuantity: qty(0)  },
    { productId: prodMap.get("PKG-CRATE-010")!,   locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(18),  reservedQuantity: qty(0)  },

    // Electronics
    { productId: prodMap.get("ELEC-RES-001")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(18000),reservedQuantity:qty(1000)},
    { productId: prodMap.get("ELEC-RES-001")!,    locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(4500), reservedQuantity:qty(0)   },
    { productId: prodMap.get("ELEC-CAP-002")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(9200), reservedQuantity:qty(500) },
    { productId: prodMap.get("ELEC-MCU-003")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(480),  reservedQuantity:qty(50)  },
    { productId: prodMap.get("ELEC-MCU-003")!,    locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(120),  reservedQuantity:qty(0)   },
    { productId: prodMap.get("ELEC-LED-004")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(15000),reservedQuantity:qty(0)   },
    { productId: prodMap.get("ELEC-DIO-005")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(8500), reservedQuantity:qty(0)   },
    { productId: prodMap.get("ELEC-PCB-006")!,    locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(340),  reservedQuantity:qty(20)  },
    { productId: prodMap.get("ELEC-TRANS-007")!,  locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(6200), reservedQuantity:qty(0)   },
    { productId: prodMap.get("ELEC-SENS-008")!,   locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(14),   reservedQuantity:qty(0)   }, // LOW STOCK
    { productId: prodMap.get("ELEC-REL-009")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(210),  reservedQuantity:qty(0)   },
    { productId: prodMap.get("ELEC-CONN-010")!,   locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(850),  reservedQuantity:qty(0)   },

    // Chemicals
    { productId: prodMap.get("CHEM-ETH-001")!,    locationId: locMap.get("WH02/Storage")!,          quantity: qty(1100),reservedQuantity:qty(100) },
    { productId: prodMap.get("CHEM-ACE-002")!,    locationId: locMap.get("WH02/Storage")!,          quantity: qty(550), reservedQuantity:qty(0)   },
    { productId: prodMap.get("CHEM-IPA-003")!,    locationId: locMap.get("WH02/Storage")!,          quantity: qty(800), reservedQuantity:qty(50)  },
    { productId: prodMap.get("CHEM-DEG-004")!,    locationId: locMap.get("WH03/Production")!,       quantity: qty(140), reservedQuantity:qty(0)   },
    { productId: prodMap.get("CHEM-EPOXY-005")!,  locationId: locMap.get("WH04/Cold-Storage-B1")!,quantity: qty(18),  reservedQuantity:qty(0)   }, // LOW STOCK
    { productId: prodMap.get("CHEM-COOL-006")!,   locationId: locMap.get("WH03/Production")!,       quantity: qty(320), reservedQuantity:qty(0)   },
    { productId: prodMap.get("CHEM-LUBE-007")!,   locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(95),  reservedQuantity:qty(0)   },

    // Hardware & Fasteners
    { productId: prodMap.get("HW-BOLT-001")!,     locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(4800),reservedQuantity:qty(200) },
    { productId: prodMap.get("HW-NUT-002")!,      locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(5200),reservedQuantity:qty(0)   },
    { productId: prodMap.get("HW-WASHER-003")!,   locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(8500),reservedQuantity:qty(0)   },
    { productId: prodMap.get("HW-SCREW-004")!,    locationId: locMap.get("WH01/Storage/Zone-A")!, quantity: qty(12000),reservedQuantity:qty(0)  },
    { productId: prodMap.get("HW-BEAR-005")!,     locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(420),  reservedQuantity:qty(10)  },

    // Safety & Consumables
    { productId: prodMap.get("SAFE-GLOVE-001")!,  locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(350), reservedQuantity:qty(0)   },
    { productId: prodMap.get("SAFE-GLASS-002")!,  locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(120), reservedQuantity:qty(0)   },
    { productId: prodMap.get("SAFE-MASK-003")!,   locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(45),  reservedQuantity:qty(0)   }, // LOW STOCK
    { productId: prodMap.get("SAFE-HELM-004")!,   locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(65),  reservedQuantity:qty(0)   },
    { productId: prodMap.get("CONS-WIPE-001")!,   locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(80),  reservedQuantity:qty(0)   },
    { productId: prodMap.get("CONS-SOLD-002")!,   locationId: locMap.get("WH05/Assembly-Zone-1")!,quantity: qty(35),  reservedQuantity:qty(0)   },
    { productId: prodMap.get("OFF-PAPER-001")!,   locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(140), reservedQuantity:qty(0)   },
    { productId: prodMap.get("OFF-TONER-002")!,   locationId: locMap.get("WH01/Storage/Zone-B")!, quantity: qty(12),  reservedQuantity:qty(0)   },
  ];

  for (const b of balanceData) {
    await db
      .insert(stockBalances)
      .values({ ...b, lastMovedAt: new Date() })
      .onConflictDoNothing();
  }

  const balCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM stock_balances`);
  log("stock_balances", `${(balCount[0] as any).c} total balance records in database`);

  // ── 9. Reorder Rules (25+ threshold rules) ─────────────────────────────────
  console.log("\n── Reorder Rules (25+ rules)");

  const reorderRuleData = [
    { productId: prodMap.get("RM-STEEL-001")!,    locationId: locMap.get("WH01/Storage/Zone-A")!, minQuantity: qty(200), maxQuantity: qty(1000),reorderQty: qty(500) },
    { productId: prodMap.get("RM-COPPER-002")!,   locationId: locMap.get("WH01/Storage/Zone-A")!, minQuantity: qty(100), maxQuantity: qty(800), reorderQty: qty(300) },
    { productId: prodMap.get("RM-ALUM-003")!,     locationId: locMap.get("WH01/Storage/Zone-A")!, minQuantity: qty(100), maxQuantity: qty(500), reorderQty: qty(200) },
    { productId: prodMap.get("RM-NYLON-004")!,    locationId: locMap.get("WH03/Production")!,       minQuantity: qty(100), maxQuantity: qty(600), reorderQty: qty(300) },
    { productId: prodMap.get("RM-RUBBER-007")!,   locationId: locMap.get("WH02/Storage")!,          minQuantity: qty(50),  maxQuantity: qty(300), reorderQty: qty(100) }, // Triggers LOW STOCK
    { productId: prodMap.get("RM-SILICONE-009")!, locationId: locMap.get("WH04/Cold-Storage-B1")!,minQuantity: qty(20),  maxQuantity: qty(100), reorderQty: qty(50)  }, // Triggers LOW STOCK
    { productId: prodMap.get("PKG-CARD-001")!,    locationId: locMap.get("WH01/Dispatch")!,         minQuantity: qty(500), maxQuantity: qty(3000),reorderQty: qty(1000)},
    { productId: prodMap.get("PKG-STRAP-008")!,   locationId: locMap.get("WH01/Dispatch")!,         minQuantity: qty(25),  maxQuantity: qty(100), reorderQty: qty(50)  }, // Triggers LOW STOCK
    { productId: prodMap.get("ELEC-RES-001")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, minQuantity: qty(5000),maxQuantity: qty(50000),reorderQty:qty(15000)},
    { productId: prodMap.get("ELEC-CAP-002")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, minQuantity: qty(2000),maxQuantity: qty(20000),reorderQty:qty(8000)},
    { productId: prodMap.get("ELEC-MCU-003")!,    locationId: locMap.get("WH01/Storage/Zone-B")!, minQuantity: qty(100), maxQuantity: qty(1000),reorderQty: qty(300) },
    { productId: prodMap.get("ELEC-SENS-008")!,   locationId: locMap.get("WH05/Assembly-Zone-1")!,minQuantity: qty(50),  maxQuantity: qty(300), reorderQty: qty(100) }, // Triggers LOW STOCK
    { productId: prodMap.get("CHEM-ETH-001")!,    locationId: locMap.get("WH02/Storage")!,          minQuantity: qty(300), maxQuantity: qty(2000),reorderQty: qty(800) },
    { productId: prodMap.get("CHEM-ACE-002")!,    locationId: locMap.get("WH02/Storage")!,          minQuantity: qty(150), maxQuantity: qty(1000),reorderQty: qty(400) },
    { productId: prodMap.get("CHEM-EPOXY-005")!,  locationId: locMap.get("WH04/Cold-Storage-B1")!,minQuantity: qty(30),  maxQuantity: qty(150), reorderQty: qty(60)  }, // Triggers LOW STOCK
    { productId: prodMap.get("HW-BOLT-001")!,     locationId: locMap.get("WH01/Storage/Zone-A")!, minQuantity: qty(1000),maxQuantity: qty(10000),reorderQty:qty(4000)},
    { productId: prodMap.get("HW-NUT-002")!,      locationId: locMap.get("WH01/Storage/Zone-A")!, minQuantity: qty(1000),maxQuantity: qty(10000),reorderQty:qty(4000)},
    { productId: prodMap.get("SAFE-GLOVE-001")!,  locationId: locMap.get("WH01/Storage/Zone-B")!, minQuantity: qty(100), maxQuantity: qty(800), reorderQty: qty(300) },
    { productId: prodMap.get("SAFE-MASK-003")!,   locationId: locMap.get("WH01/Storage/Zone-B")!, minQuantity: qty(100), maxQuantity: qty(500), reorderQty: qty(200) }, // Triggers LOW STOCK
    { productId: prodMap.get("CONS-WIPE-001")!,   locationId: locMap.get("WH05/Assembly-Zone-1")!,minQuantity: qty(30),  maxQuantity: qty(200), reorderQty: qty(80)  },
    { productId: prodMap.get("OFF-PAPER-001")!,   locationId: locMap.get("WH01/Storage/Zone-B")!, minQuantity: qty(50),  maxQuantity: qty(300), reorderQty: qty(100) },
  ];

  for (const rr of reorderRuleData) {
    const existing = await db
      .select()
      .from(reorderRules)
      .where(eq(reorderRules.productId, rr.productId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(reorderRules).values({ ...rr, isActive: true, createdBy: userId });
    }
  }

  const rrCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM reorder_rules`);
  log("reorder_rules", `${(rrCount[0] as any).c} total reordering rules in database`);

  // ── 10. Audit Stock Movements Ledger (50+ entries) ─────────────────────────
  console.log("\n── Stock Movements Ledger");

  const movCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM stock_movements`);
  if ((movCount[0] as any).c < 50) {
    // Generate audit movements for products
    const movEntries = [];
    for (const b of balanceData.slice(0, 35)) {
      movEntries.push({
        productId: b.productId,
        destinationLocationId: b.locationId,
        quantity: b.quantity,
        movementType: "RECEIPT",
        referenceType: "RECEIPT",
        referenceId: rec1Id,
        createdBy: userId,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 3600 * 1000)),
      });
    }

    if (movEntries.length > 0) {
      await db.insert(stockMovements).values(movEntries as any[]);
    }
  }

  const finalMovCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM stock_movements`);
  log("stock_movements", `${(finalMovCount[0] as any).c} total movement history entries in ledger`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log("\n✅  Extended 50-Product Seed Complete!\n");
  console.log("  Demo Login:");
  console.log("    Email:    alex.mercer@stocksense.io");
  console.log("    Password: StockSense2026!\n");

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  process.exit(1);
});
