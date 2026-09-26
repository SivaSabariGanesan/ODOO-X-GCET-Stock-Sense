# StockSense — Database Schema Specification & Data Architecture

This document provides a comprehensive specification of the PostgreSQL 16 database schema powering the StockSense Inventory Management System. The database is managed using **Drizzle ORM** with TypeScript schema definitions located in `backend/src/db/schema/`.

---

## 1. Architectural Principles

### 1.1 Physical Stock Isolation (Double-Entry Engine)
- Physical inventory quantities live **exclusively** in `stock_balances(product_id, location_id)`.
- Master product records (`products`) store metadata only (SKU, name, barcode, category, UOM). They **never** store mutable stock totals.
- Total product stock across the enterprise is computed dynamically by summing `available_quantity` across all valid locations.

### 1.2 Immutable Movement Audit Ledger
- Every stock-altering transaction (receipt processing, delivery processing, internal transfer execution, inventory adjustment application) creates an unalterable audit row in `stock_movements`.
- `stock_movements` records cannot be updated or deleted by any API endpoint or user action.

### 1.3 Single-Transaction Atomicity
- All operations modifying inventory run inside explicit PostgreSQL database transactions (`db.transaction(async (tx) => { ... })`).
- If an item is out of stock, a destination location is invalid, or a balance increment fails, the entire transaction rolls back cleanly to preserve data integrity.

---

## 2. Entity Relationship Overview

```text
┌──────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Categories  │◄──────│    Products     │──────►│ Units of Measure│
└──────────────┘       └────────┬────────┘       └─────────────────┘
                                │
                                │ (1:N)
                                ▼
                       ┌─────────────────┐       ┌─────────────────┐
                       │ Stock Balances  │──────►│    Locations    │
                       └─────────────────┘       └────────┬────────┘
                                ▲                         │
                                │                         │ (N:1)
                                │                         ▼
                       ┌─────────────────┐       ┌─────────────────┐
                       │ Stock Movements │       │   Warehouses    │
                       └─────────────────┘       └─────────────────┘
```

---

## 3. Table-by-Table Schema Specification (18 Tables)

### 3.1 Authentication & Security

#### `users`
Stores user accounts, credentials, role assignments, and email verification status.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Indexes/Constraints**: `email` (UNIQUE NOT NULL)
- **Columns**:
  - `id`: `uuid` (PK)
  - `email`: `varchar(255)` (UNIQUE, NOT NULL)
  - `password_hash`: `varchar(255)` (NOT NULL)
  - `name`: `varchar(255)` (NOT NULL)
  - `role`: `varchar(50)` (NOT NULL, default `'user'`, enum: `'admin'`, `'manager'`, `'user'`)
  - `is_email_verified`: `boolean` (NOT NULL, default `false`)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)
  - `updated_at`: `timestamp` (NOT NULL, default `now()`)

#### `password_reset_otps`
Stores hashed 6-digit OTP codes for secure password resets.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Foreign Keys**: `user_id` → `users(id)` ON DELETE CASCADE
- **Columns**:
  - `id`: `uuid` (PK)
  - `user_id`: `uuid` (FK to `users.id`, NOT NULL)
  - `otp_hash`: `varchar(255)` (NOT NULL)
  - `expires_at`: `timestamp` (NOT NULL)
  - `attempts_count`: `integer` (NOT NULL, default `0`)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)

---

### 3.2 Product Master Data

#### `categories`
Hierarchical product categorization taxonomy.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Indexes/Constraints**: `code` (UNIQUE NOT NULL)
- **Foreign Keys**: `parent_id` → `categories(id)` ON DELETE SET NULL
- **Columns**:
  - `id`: `uuid` (PK)
  - `name`: `varchar(255)` (NOT NULL)
  - `code`: `varchar(100)` (UNIQUE, NOT NULL)
  - `description`: `text` (NULLABLE)
  - `parent_id`: `uuid` (FK self-reference)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)
  - `updated_at`: `timestamp` (NOT NULL, default `now()`)

#### `units_of_measure`
Units of measurement used across product inventory and recipes.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Indexes/Constraints**: `abbreviation` (UNIQUE NOT NULL)
- **Columns**:
  - `id`: `uuid` (PK)
  - `name`: `varchar(255)` (NOT NULL)
  - `abbreviation`: `varchar(20)` (UNIQUE, NOT NULL)
  - `measure_type`: `varchar(50)` (NOT NULL, enum: `'unit'`, `'weight'`, `'volume'`, `'length'`, `'time'`)
  - `is_active`: `boolean` (NOT NULL, default `true`)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)

#### `products`
Master catalog row for every inventory item.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Indexes/Constraints**: `sku` (UNIQUE NOT NULL)
- **Foreign Keys**: `category_id` → `categories(id)`, `uom_id` → `units_of_measure(id)`
- **Columns**:
  - `id`: `uuid` (PK)
  - `name`: `varchar(255)` (NOT NULL)
  - `sku`: `varchar(100)` (UNIQUE, NOT NULL)
  - `description`: `text` (NULLABLE)
  - `category_id`: `uuid` (FK to `categories.id`, NOT NULL)
  - `uom_id`: `uuid` (FK to `units_of_measure.id`, NOT NULL)
  - `barcode`: `varchar(100)` (NULLABLE)
  - `is_active`: `boolean` (NOT NULL, default `true`)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)
  - `updated_at`: `timestamp` (NOT NULL, default `now()`)

---

### 3.3 Warehouse Facilities & Storage Hierarchy

#### `warehouses`
Physical warehouse buildings and fulfillment centers.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Indexes/Constraints**: `short_code` (UNIQUE NOT NULL)
- **Columns**:
  - `id`: `uuid` (PK)
  - `name`: `varchar(255)` (NOT NULL)
  - `short_code`: `varchar(50)` (UNIQUE, NOT NULL)
  - `address`: `text` (NULLABLE)
  - `is_active`: `boolean` (NOT NULL, default `true`)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)

#### `locations`
Hierarchical sub-locations (aisles, racks, shelves, bins) within a warehouse.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Foreign Keys**: `warehouse_id` → `warehouses(id)` ON DELETE CASCADE
- **Columns**:
  - `id`: `uuid` (PK)
  - `warehouse_id`: `uuid` (FK to `warehouses.id`, NOT NULL)
  - `name`: `varchar(255)` (NOT NULL)
  - `code`: `varchar(100)` (NOT NULL)
  - `location_type`: `varchar(50)` (NOT NULL, enum: `'shelf'`, `'aisle'`, `'bin'`, `'dock'`, `'scrap'`)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)

#### `reorder_rules`
Automated threshold rules triggering low-stock alert notifications.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Foreign Keys**: `product_id` → `products(id)`, `location_id` → `locations(id)`
- **Columns**:
  - `id`: `uuid` (PK)
  - `product_id`: `uuid` (FK to `products.id`, NOT NULL)
  - `location_id`: `uuid` (FK to `locations.id`, NOT NULL)
  - `min_quantity`: `numeric(12, 4)` (NOT NULL)
  - `max_quantity`: `numeric(12, 4)` (NOT NULL)
  - `reorder_quantity`: `numeric(12, 4)` (NOT NULL)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)

---

### 3.4 Core Stock Engine & Audit Ledger

#### `stock_balances`
**Physical Source of Truth** for current stock quantities.
- **Primary Key**: Composite `(product_id, location_id)`
- **Foreign Keys**: `product_id` → `products(id)`, `location_id` → `locations(id)`
- **Columns**:
  - `product_id`: `uuid` (PK, FK to `products.id`)
  - `location_id`: `uuid` (PK, FK to `locations.id`)
  - `available_quantity`: `numeric(12, 4)` (NOT NULL, default `0.0000`)
  - `reserved_quantity`: `numeric(12, 4)` (NOT NULL, default `0.0000`)
  - `last_updated`: `timestamp` (NOT NULL, default `now()`)

#### `stock_movements`
**Immutable Ledger** recording every historical physical stock change.
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Foreign Keys**: `product_id` → `products(id)`, `location_id` → `locations(id)`, `created_by` → `users(id)`
- **Columns**:
  - `id`: `uuid` (PK)
  - `product_id`: `uuid` (FK to `products.id`, NOT NULL)
  - `location_id`: `uuid` (FK to `locations.id`, NOT NULL)
  - `movement_type`: `varchar(50)` (NOT NULL, enum: `'RECEIPT'`, `'DELIVERY'`, `'TRANSFER_IN'`, `'TRANSFER_OUT'`, `'ADJUSTMENT'`)
  - `quantity_change`: `numeric(12, 4)` (NOT NULL)
  - `reference_number`: `varchar(100)` (NOT NULL)
  - `created_by`: `uuid` (FK to `users.id`, NOT NULL)
  - `created_at`: `timestamp` (NOT NULL, default `now()`)

---

### 3.5 Operations Documents (Headers & Line Items)

#### Inbound Receipts: `receipts` & `receipt_items`
- `receipts`: `id`, `receipt_number` (UNIQUE), `supplier_name`, `destination_warehouse_id`, `status` (`DRAFT`/`READY`/`DONE`/`CANCELED`), `created_by`, `received_date`.
- `receipt_items`: `id`, `receipt_id`, `product_id`, `location_id`, `quantity_received`, `unit_price`, `total_price`.

#### Outbound Deliveries: `deliveries` & `delivery_items`
- `deliveries`: `id`, `delivery_number` (UNIQUE), `customer_name`, `source_warehouse_id`, `status` (`DRAFT`/`READY`/`DONE`/`CANCELED`), `created_by`, `shipped_date`.
- `delivery_items`: `id`, `delivery_id`, `product_id`, `location_id`, `quantity_shipped`, `unit_price`.

#### Internal Transfers: `internal_transfers` & `internal_transfer_items`
- `internal_transfers`: `id`, `transfer_number` (UNIQUE), `source_warehouse_id`, `dest_warehouse_id`, `status`, `transferred_date`.
- `internal_transfer_items`: `id`, `transfer_id`, `product_id`, `source_location_id`, `dest_location_id`, `quantity_transferred`.

#### Inventory Adjustments: `inventory_adjustments` & `inventory_adjustment_items`
- `inventory_adjustments`: `id`, `adjustment_number` (UNIQUE), `warehouse_id`, `reason` (`COUNT_MISMATCH`/`DAMAGE`/`SCRAP`), `status`, `applied_at`.
- `inventory_adjustment_items`: `id`, `adjustment_id`, `product_id`, `location_id`, `theoretical_quantity`, `actual_quantity`, `quantity_difference`.

---

## 4. Migration Strategy

Drizzle ORM migration files live under `backend/src/db/migrations/`.
Applied migrations are tracked in the `_migrations` meta-table.

```bash
# Run migration runner
bun --cwd backend run db:migrate
```
