-- =============================================================================
-- Migration: 0002_receipts
-- Domain:    Person 2 — Module 1: Receipts & Receipt Items
-- Database:  PostgreSQL 16
-- =============================================================================

-- =============================================================================
-- SECTION 1 — receipts
-- =============================================================================

CREATE TABLE IF NOT EXISTS receipts (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity / Reference
  receipt_number        VARCHAR(100)  NOT NULL,
  supplier_name         VARCHAR(255),
  supplier_reference    VARCHAR(255),
  notes                 TEXT,

  -- Scope & Destination
  warehouse_id          UUID          NOT NULL
                          REFERENCES warehouses (id) ON DELETE RESTRICT,
  default_location_id   UUID
                          REFERENCES locations (id) ON DELETE RESTRICT,

  -- State: DRAFT | WAITING | READY | DONE | CANCELED
  status                VARCHAR(50)   NOT NULL DEFAULT 'DRAFT',

  -- Audit
  created_by            UUID          REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  validated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT receipts_receipt_number_unique UNIQUE (receipt_number),
  CONSTRAINT receipts_receipt_number_not_empty CHECK (TRIM(receipt_number) <> ''),
  CONSTRAINT receipts_status_check CHECK (
    status IN ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS receipts_receipt_number_idx ON receipts (receipt_number);
CREATE INDEX IF NOT EXISTS receipts_warehouse_id_idx   ON receipts (warehouse_id);
CREATE INDEX IF NOT EXISTS receipts_status_idx         ON receipts (status);
CREATE INDEX IF NOT EXISTS receipts_created_by_idx     ON receipts (created_by);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx     ON receipts (created_at);

-- Trigger
CREATE TRIGGER receipts_set_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 2 — receipt_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS receipt_items (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent Receipt
  receipt_id              UUID           NOT NULL
                            REFERENCES receipts (id) ON DELETE CASCADE,

  -- Item details
  product_id              UUID           NOT NULL
                            REFERENCES products (id) ON DELETE RESTRICT,
  destination_location_id UUID           NOT NULL
                            REFERENCES locations (id) ON DELETE RESTRICT,

  -- Quantity
  quantity                NUMERIC(15, 4) NOT NULL DEFAULT 0,

  -- Timestamps
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT receipt_items_quantity_positive CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS receipt_items_receipt_id_idx              ON receipt_items (receipt_id);
CREATE INDEX IF NOT EXISTS receipt_items_product_id_idx              ON receipt_items (product_id);
CREATE INDEX IF NOT EXISTS receipt_items_destination_location_id_idx ON receipt_items (destination_location_id);

-- Trigger
CREATE TRIGGER receipt_items_set_updated_at
  BEFORE UPDATE ON receipt_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- END OF MIGRATION 0002
-- =============================================================================
