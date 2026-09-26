-- =============================================================================
-- Migration: 0003_deliveries
-- Domain:    Person 2 — Module 2: Deliveries & Delivery Items
-- Database:  PostgreSQL 16
-- =============================================================================

-- =============================================================================
-- SECTION 1 — deliveries
-- =============================================================================

CREATE TABLE IF NOT EXISTS deliveries (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity / Reference
  delivery_number             VARCHAR(100)  NOT NULL,
  customer_name               VARCHAR(255),
  customer_reference          VARCHAR(255),
  notes                       TEXT,

  -- Scope & Source
  warehouse_id                UUID          NOT NULL
                                REFERENCES warehouses (id) ON DELETE RESTRICT,
  default_source_location_id  UUID
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
  CONSTRAINT deliveries_delivery_number_unique UNIQUE (delivery_number),
  CONSTRAINT deliveries_delivery_number_not_empty CHECK (TRIM(delivery_number) <> ''),
  CONSTRAINT deliveries_status_check CHECK (
    status IN ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS deliveries_delivery_number_idx ON deliveries (delivery_number);
CREATE INDEX IF NOT EXISTS deliveries_warehouse_id_idx   ON deliveries (warehouse_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx         ON deliveries (status);
CREATE INDEX IF NOT EXISTS deliveries_created_by_idx     ON deliveries (created_by);
CREATE INDEX IF NOT EXISTS deliveries_created_at_idx     ON deliveries (created_at);

-- Trigger
CREATE TRIGGER deliveries_set_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 2 — delivery_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS delivery_items (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent Delivery
  delivery_id             UUID           NOT NULL
                            REFERENCES deliveries (id) ON DELETE CASCADE,

  -- Item details
  product_id              UUID           NOT NULL
                            REFERENCES products (id) ON DELETE RESTRICT,
  source_location_id      UUID           NOT NULL
                            REFERENCES locations (id) ON DELETE RESTRICT,

  -- Quantity
  quantity                NUMERIC(15, 4) NOT NULL DEFAULT 0,

  -- Timestamps
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT delivery_items_quantity_positive CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS delivery_items_delivery_id_idx        ON delivery_items (delivery_id);
CREATE INDEX IF NOT EXISTS delivery_items_product_id_idx         ON delivery_items (product_id);
CREATE INDEX IF NOT EXISTS delivery_items_source_location_id_idx ON delivery_items (source_location_id);

-- Trigger
CREATE TRIGGER delivery_items_set_updated_at
  BEFORE UPDATE ON delivery_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- END OF MIGRATION 0003
-- =============================================================================
