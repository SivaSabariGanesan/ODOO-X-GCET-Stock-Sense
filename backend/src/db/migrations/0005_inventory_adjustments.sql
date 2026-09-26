-- =============================================================================
-- Migration: 0005_inventory_adjustments
-- Domain:    Person 2 — Module 4: Inventory Adjustments & Adjustment Items
-- Database:  PostgreSQL 16
-- =============================================================================

-- =============================================================================
-- SECTION 1 — inventory_adjustments
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity / Reference
  adjustment_number           VARCHAR(100)  NOT NULL,
  reason                      TEXT,

  -- Location
  location_id                 UUID          NOT NULL
                                REFERENCES locations (id) ON DELETE RESTRICT,

  -- State: DRAFT | WAITING | READY | DONE | CANCELED
  status                      VARCHAR(50)   NOT NULL DEFAULT 'DRAFT',

  -- Audit
  created_by                  UUID          REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  validated_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT inventory_adjustments_adjustment_number_unique UNIQUE (adjustment_number),
  CONSTRAINT inventory_adjustments_adjustment_number_not_empty CHECK (TRIM(adjustment_number) <> ''),
  CONSTRAINT inventory_adjustments_status_check CHECK (
    status IN ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS inventory_adjustments_adjustment_number_idx ON inventory_adjustments (adjustment_number);
CREATE INDEX IF NOT EXISTS inventory_adjustments_status_idx            ON inventory_adjustments (status);
CREATE INDEX IF NOT EXISTS inventory_adjustments_location_id_idx       ON inventory_adjustments (location_id);
CREATE INDEX IF NOT EXISTS inventory_adjustments_created_by_idx        ON inventory_adjustments (created_by);
CREATE INDEX IF NOT EXISTS inventory_adjustments_created_at_idx        ON inventory_adjustments (created_at);

-- Trigger
CREATE TRIGGER inventory_adjustments_set_updated_at
  BEFORE UPDATE ON inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 2 — inventory_adjustment_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent Adjustment
  adjustment_id           UUID           NOT NULL
                            REFERENCES inventory_adjustments (id) ON DELETE CASCADE,

  -- Item details
  product_id              UUID           NOT NULL
                            REFERENCES products (id) ON DELETE RESTRICT,

  -- Quantities (difference supports positive, zero, and negative values)
  system_quantity         NUMERIC(15, 4) NOT NULL DEFAULT 0,
  counted_quantity        NUMERIC(15, 4) NOT NULL DEFAULT 0,
  difference              NUMERIC(15, 4) NOT NULL DEFAULT 0,

  -- Timestamps
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT inventory_adjustment_items_system_qty_non_negative CHECK (system_quantity >= 0),
  CONSTRAINT inventory_adjustment_items_counted_qty_non_negative CHECK (counted_quantity >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS inventory_adjustment_items_adjustment_id_idx ON inventory_adjustment_items (adjustment_id);
CREATE INDEX IF NOT EXISTS inventory_adjustment_items_product_id_idx    ON inventory_adjustment_items (product_id);

-- Trigger
CREATE TRIGGER inventory_adjustment_items_set_updated_at
  BEFORE UPDATE ON inventory_adjustment_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- END OF MIGRATION 0005
-- =============================================================================
