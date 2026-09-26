-- =============================================================================
-- Migration: 0006_stock_movements
-- Domain:    Person 2 — Module 5: Stock Movements Audit Trail
-- Database:  PostgreSQL 16
-- =============================================================================

-- =============================================================================
-- SECTION 1 — stock_movements
-- =============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product
  product_id                  UUID          NOT NULL
                                REFERENCES products (id) ON DELETE RESTRICT,

  -- Locations (nullable to support single-ended operations like receipts/deliveries)
  source_location_id          UUID          REFERENCES locations (id) ON DELETE RESTRICT,
  destination_location_id     UUID          REFERENCES locations (id) ON DELETE RESTRICT,

  -- Quantity moved
  quantity                    NUMERIC(15, 4) NOT NULL DEFAULT 0,

  -- Movement Classification
  movement_type               VARCHAR(50)   NOT NULL,

  -- Polymorphic Reference (No FK constraint on reference_id)
  reference_type              VARCHAR(50)   NOT NULL,
  reference_id                UUID          NOT NULL,

  -- Audit
  created_by                  UUID          REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamp
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT stock_movements_quantity_positive CHECK (quantity > 0),
  CONSTRAINT stock_movements_movement_type_check CHECK (
    movement_type IN ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT')
  ),
  CONSTRAINT stock_movements_reference_type_check CHECK (
    reference_type IN ('RECEIPT', 'DELIVERY', 'INTERNAL_TRANSFER', 'INVENTORY_ADJUSTMENT')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx              ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS stock_movements_source_location_id_idx       ON stock_movements (source_location_id);
CREATE INDEX IF NOT EXISTS stock_movements_destination_location_id_idx  ON stock_movements (destination_location_id);
CREATE INDEX IF NOT EXISTS stock_movements_movement_type_idx            ON stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS stock_movements_reference_type_idx           ON stock_movements (reference_type);
CREATE INDEX IF NOT EXISTS stock_movements_reference_id_idx             ON stock_movements (reference_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx              ON stock_movements (created_at);

-- Composite Indexes
CREATE INDEX IF NOT EXISTS stock_movements_reference_idx        ON stock_movements (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS stock_movements_product_created_idx  ON stock_movements (product_id, created_at);

-- =============================================================================
-- END OF MIGRATION 0006
-- =============================================================================
