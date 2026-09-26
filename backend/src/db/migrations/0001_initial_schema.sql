-- =============================================================================
-- Migration: 0001_initial_schema
-- Domain:    Person 1 — Foundation (users, auth, catalog, warehouse, stock)
-- Database:  PostgreSQL 16
-- =============================================================================
-- Execution order respects FK dependencies:
--   users → password_reset_otps
--   users → categories
--   users → units_of_measure
--   categories + units_of_measure + users → products
--   users → warehouses
--   warehouses + users → locations  (+ self-ref parent_id added after)
--   products + locations + users → reorder_rules
--   products + locations → stock_balances
--
-- Person 2 extension point:
--   Add receipts, deliveries, transfers, adjustments, stock_movements tables
--   in a subsequent migration (0002_inventory_operations.sql). All referenced
--   FKs (products, locations, warehouses, users) are already in place.
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() (idempotent)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SECTION 1 — updated_at trigger function
-- =============================================================================
-- A single shared trigger function that sets updated_at = NOW() before any
-- UPDATE. Applied to every table that carries an updated_at column.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- SECTION 2 — users
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name            VARCHAR(255)  NOT NULL,
  email           VARCHAR(255)  NOT NULL,

  -- Authentication — bcrypt hash only; raw password never persisted
  password_hash   TEXT          NOT NULL,

  -- Role: one of admin | manager | staff
  role            VARCHAR(50)   NOT NULL DEFAULT 'staff',

  -- State
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT users_email_unique      UNIQUE (email),
  CONSTRAINT users_role_check        CHECK  (role IN ('admin', 'manager', 'staff')),
  CONSTRAINT users_name_not_empty    CHECK  (TRIM(name)  <> ''),
  CONSTRAINT users_email_not_empty   CHECK  (TRIM(email) <> '')
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_email_idx     ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx      ON users (role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users (is_active);

-- Trigger
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 3 — password_reset_otps
-- =============================================================================

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id        UUID        NOT NULL
                   REFERENCES users (id) ON DELETE CASCADE,

  -- Security — hash of the OTP; raw value never stored
  otp_hash       TEXT        NOT NULL,

  -- Lifecycle
  expires_at     TIMESTAMPTZ NOT NULL,
  is_used        BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Brute-force guard
  attempt_count  INTEGER     NOT NULL DEFAULT 0,

  -- Timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at        TIMESTAMPTZ,                         -- NULL until redeemed

  -- Constraints
  CONSTRAINT otp_attempt_count_non_negative CHECK (attempt_count >= 0),
  CONSTRAINT otp_used_at_requires_is_used   CHECK (
    used_at IS NULL OR is_used = TRUE
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS password_reset_otps_user_id_idx  ON password_reset_otps (user_id);
CREATE INDEX IF NOT EXISTS password_reset_otps_expires_at_idx ON password_reset_otps (expires_at);

-- Partial index: only live (unused, non-expired) tokens are queried
CREATE INDEX IF NOT EXISTS password_reset_otps_active_idx
  ON password_reset_otps (user_id, expires_at)
  WHERE is_used = FALSE;

-- =============================================================================
-- SECTION 4 — categories
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name         VARCHAR(255) NOT NULL,
  description  TEXT,

  -- Display — optional hex color for UI badges
  color        VARCHAR(7),

  -- State
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,

  -- Audit
  created_by   UUID         REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT categories_name_unique     UNIQUE (name),
  CONSTRAINT categories_name_not_empty  CHECK  (TRIM(name) <> ''),
  CONSTRAINT categories_color_format    CHECK  (
    color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS categories_name_idx      ON categories (name);
CREATE INDEX IF NOT EXISTS categories_is_active_idx ON categories (is_active);

-- Trigger
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 5 — units_of_measure
-- =============================================================================

CREATE TABLE IF NOT EXISTS units_of_measure (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name           VARCHAR(100) NOT NULL,
  abbreviation   VARCHAR(20)  NOT NULL,
  description    TEXT,

  -- Measurement category (e.g. 'weight', 'volume', 'unit', 'length')
  measure_type   VARCHAR(50),

  -- State
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,

  -- Audit
  created_by     UUID         REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uom_name_unique         UNIQUE (name),
  CONSTRAINT uom_abbreviation_unique UNIQUE (abbreviation),
  CONSTRAINT uom_name_not_empty      CHECK  (TRIM(name) <> ''),
  CONSTRAINT uom_abbrev_not_empty    CHECK  (TRIM(abbreviation) <> '')
);

-- Indexes
CREATE INDEX IF NOT EXISTS uom_name_idx         ON units_of_measure (name);
CREATE INDEX IF NOT EXISTS uom_abbreviation_idx ON units_of_measure (abbreviation);
CREATE INDEX IF NOT EXISTS uom_is_active_idx    ON units_of_measure (is_active);

-- Trigger
CREATE TRIGGER uom_set_updated_at
  BEFORE UPDATE ON units_of_measure
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 6 — products
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name         VARCHAR(255) NOT NULL,
  sku          VARCHAR(100) NOT NULL,
  description  TEXT,

  -- Classification
  category_id  UUID         REFERENCES categories       (id) ON DELETE RESTRICT,
  uom_id       UUID         NOT NULL
                              REFERENCES units_of_measure (id) ON DELETE RESTRICT,

  -- Physical / display attributes
  barcode      VARCHAR(100),
  image_url    TEXT,

  -- State
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,

  -- Audit
  created_by   UUID         REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID         REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT products_sku_unique      UNIQUE (sku),
  CONSTRAINT products_barcode_unique  UNIQUE (barcode),
  CONSTRAINT products_name_not_empty  CHECK  (TRIM(name) <> ''),
  CONSTRAINT products_sku_not_empty   CHECK  (TRIM(sku)  <> '')
);

-- Indexes
CREATE INDEX IF NOT EXISTS products_sku_idx         ON products (sku);
CREATE INDEX IF NOT EXISTS products_name_idx        ON products (name);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);
CREATE INDEX IF NOT EXISTS products_uom_id_idx      ON products (uom_id);
CREATE INDEX IF NOT EXISTS products_is_active_idx   ON products (is_active);
CREATE INDEX IF NOT EXISTS products_barcode_idx     ON products (barcode);

-- Trigger
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 7 — warehouses
-- =============================================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name         VARCHAR(255) NOT NULL,
  short_code   VARCHAR(10)  NOT NULL,
  description  TEXT,

  -- Address
  address      TEXT,

  -- State
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,

  -- Audit
  created_by   UUID         REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT warehouses_name_unique         UNIQUE (name),
  CONSTRAINT warehouses_short_code_unique   UNIQUE (short_code),
  CONSTRAINT warehouses_name_not_empty      CHECK  (TRIM(name)       <> ''),
  CONSTRAINT warehouses_short_code_not_empty CHECK (TRIM(short_code) <> ''),
  -- short_code: uppercase alphanumeric only (e.g. "MWH", "WH02")
  CONSTRAINT warehouses_short_code_format   CHECK  (short_code ~ '^[A-Z0-9]{1,10}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS warehouses_name_idx       ON warehouses (name);
CREATE INDEX IF NOT EXISTS warehouses_short_code_idx ON warehouses (short_code);
CREATE INDEX IF NOT EXISTS warehouses_is_active_idx  ON warehouses (is_active);

-- Trigger
CREATE TRIGGER warehouses_set_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 8 — locations
-- =============================================================================
-- Note on self-referential FK: parent_id references locations.id.
-- This must be added AFTER the table is created (cannot forward-reference).
-- =============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Warehouse ownership
  warehouse_id   UUID         NOT NULL
                   REFERENCES warehouses (id) ON DELETE CASCADE,

  -- Self-referential hierarchy (FK added below)
  parent_id      UUID,

  -- Identity
  name           VARCHAR(255) NOT NULL,

  -- Denormalised display path — maintained by the service layer
  -- e.g. "MWH / Rack A / Shelf A-1"
  full_path      TEXT         NOT NULL,

  -- Location category
  -- Values: internal | input | output | quality_control | virtual
  location_type  VARCHAR(50)  NOT NULL DEFAULT 'internal',

  -- State
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,

  -- Audit
  created_by     UUID         REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT locations_name_not_empty  CHECK (TRIM(name) <> ''),
  CONSTRAINT locations_path_not_empty  CHECK (TRIM(full_path) <> ''),
  CONSTRAINT locations_type_check      CHECK (
    location_type IN ('internal', 'input', 'output', 'quality_control', 'virtual')
  ),
  -- A location cannot be its own parent
  CONSTRAINT locations_no_self_parent  CHECK (parent_id IS DISTINCT FROM id)
);

-- Self-referential FK added after table creation
ALTER TABLE locations
  ADD CONSTRAINT locations_parent_id_fkey
  FOREIGN KEY (parent_id)
  REFERENCES locations (id)
  ON DELETE RESTRICT;
-- RESTRICT (not CASCADE): deleting a parent location while it still has
-- children must be an explicit, intentional operation by the service layer.

-- Indexes
CREATE INDEX IF NOT EXISTS locations_warehouse_id_idx   ON locations (warehouse_id);
CREATE INDEX IF NOT EXISTS locations_parent_id_idx      ON locations (parent_id);
CREATE INDEX IF NOT EXISTS locations_location_type_idx  ON locations (location_type);
CREATE INDEX IF NOT EXISTS locations_is_active_idx      ON locations (is_active);
CREATE INDEX IF NOT EXISTS locations_warehouse_active_idx
  ON locations (warehouse_id, is_active);

-- Trigger
CREATE TRIGGER locations_set_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 9 — reorder_rules
-- =============================================================================

CREATE TABLE IF NOT EXISTS reorder_rules (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  product_id    UUID           NOT NULL
                  REFERENCES products  (id) ON DELETE CASCADE,
  location_id   UUID           NOT NULL
                  REFERENCES locations (id) ON DELETE CASCADE,

  -- Thresholds
  min_quantity  NUMERIC(15, 4) NOT NULL DEFAULT 0,
  max_quantity  NUMERIC(15, 4),                    -- NULL = no ceiling
  reorder_qty   NUMERIC(15, 4) NOT NULL DEFAULT 1,

  -- State
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,

  -- Audit
  created_by    UUID           REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID           REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT reorder_rules_product_location_uniq UNIQUE (product_id, location_id),
  CONSTRAINT reorder_rules_min_qty_non_negative  CHECK  (min_quantity  >= 0),
  CONSTRAINT reorder_rules_max_qty_non_negative  CHECK  (max_quantity  IS NULL OR max_quantity >= 0),
  CONSTRAINT reorder_rules_reorder_qty_positive  CHECK  (reorder_qty   >  0),
  -- max must be >= min when both are set
  CONSTRAINT reorder_rules_max_gte_min           CHECK  (
    max_quantity IS NULL OR max_quantity >= min_quantity
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS reorder_rules_product_id_idx  ON reorder_rules (product_id);
CREATE INDEX IF NOT EXISTS reorder_rules_location_id_idx ON reorder_rules (location_id);
CREATE INDEX IF NOT EXISTS reorder_rules_is_active_idx   ON reorder_rules (is_active);

-- Trigger
CREATE TRIGGER reorder_rules_set_updated_at
  BEFORE UPDATE ON reorder_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 10 — stock_balances
-- =============================================================================
-- This table is the write target for ALL inventory operations (Person 2).
-- It must never be written to directly by application code outside of the
-- inventory-operation domain.
-- =============================================================================

CREATE TABLE IF NOT EXISTS stock_balances (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope — the unique key
  product_id         UUID           NOT NULL
                       REFERENCES products  (id) ON DELETE RESTRICT,
  location_id        UUID           NOT NULL
                       REFERENCES locations (id) ON DELETE RESTRICT,

  -- Current quantities
  quantity           NUMERIC(15, 4) NOT NULL DEFAULT 0,
  reserved_quantity  NUMERIC(15, 4) NOT NULL DEFAULT 0,

  -- Time of last inventory-affecting event (set by Person 2's service layer)
  last_moved_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Standard row timestamps
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT stock_balances_product_location_uniq    UNIQUE (product_id, location_id),
  CONSTRAINT stock_balances_quantity_non_negative    CHECK  (quantity          >= 0),
  CONSTRAINT stock_balances_reserved_non_negative    CHECK  (reserved_quantity >= 0),
  CONSTRAINT stock_balances_reserved_lte_quantity    CHECK  (reserved_quantity <= quantity)
);

-- Indexes
CREATE INDEX IF NOT EXISTS stock_balances_product_id_idx  ON stock_balances (product_id);
CREATE INDEX IF NOT EXISTS stock_balances_location_id_idx ON stock_balances (location_id);

-- Composite index for dashboard query: all stock at a given location
CREATE INDEX IF NOT EXISTS stock_balances_location_product_idx
  ON stock_balances (location_id, product_id);

-- Trigger
CREATE TRIGGER stock_balances_set_updated_at
  BEFORE UPDATE ON stock_balances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- END OF MIGRATION 0001
-- =============================================================================
-- Person 2 extension notes:
--
-- Your tables (receipts, receipt_items, deliveries, delivery_items,
-- internal_transfers, transfer_items, inventory_adjustments, adjustment_items,
-- stock_movements) should:
--
--   1. Reference products(id), locations(id), warehouses(id), users(id) via FK.
--   2. Write stock changes through UPDATE on stock_balances
--      (product_id, location_id) rather than inserting new balance rows where
--      a balance already exists.  Use INSERT … ON CONFLICT DO UPDATE for
--      atomic upserts.
--   3. Set stock_balances.last_moved_at = NOW() on every stock-affecting write.
--   4. Decrement/increment reserved_quantity when a delivery/transfer is
--      confirmed vs. when it is done.
--   5. Never DELETE from stock_balances — zero-quantity rows serve as an
--      audit baseline and are expected by reorder_rules lookups.
-- =============================================================================
