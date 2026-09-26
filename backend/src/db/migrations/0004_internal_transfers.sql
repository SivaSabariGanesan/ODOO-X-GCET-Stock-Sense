-- =============================================================================
-- Migration: 0004_internal_transfers
-- Domain:    Person 2 — Module 3: Internal Transfers & Transfer Items
-- Database:  PostgreSQL 16
-- =============================================================================

-- =============================================================================
-- SECTION 1 — internal_transfers
-- =============================================================================

CREATE TABLE IF NOT EXISTS internal_transfers (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity / Reference
  transfer_number             VARCHAR(100)  NOT NULL,
  notes                       TEXT,

  -- Locations
  source_location_id          UUID          NOT NULL
                                REFERENCES locations (id) ON DELETE RESTRICT,
  destination_location_id     UUID          NOT NULL
                                REFERENCES locations (id) ON DELETE RESTRICT,

  -- State: DRAFT | WAITING | READY | DONE | CANCELED
  status                      VARCHAR(50)   NOT NULL DEFAULT 'DRAFT',

  -- Audit
  created_by                  UUID          REFERENCES users (id) ON DELETE SET NULL,

  -- Timestamps
  completed_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT internal_transfers_transfer_number_unique UNIQUE (transfer_number),
  CONSTRAINT internal_transfers_transfer_number_not_empty CHECK (TRIM(transfer_number) <> ''),
  CONSTRAINT internal_transfers_status_check CHECK (
    status IN ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED')
  ),
  -- Source and destination locations cannot be identical
  CONSTRAINT internal_transfers_different_locations CHECK (
    source_location_id <> destination_location_id
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS internal_transfers_transfer_number_idx         ON internal_transfers (transfer_number);
CREATE INDEX IF NOT EXISTS internal_transfers_status_idx                  ON internal_transfers (status);
CREATE INDEX IF NOT EXISTS internal_transfers_source_location_id_idx      ON internal_transfers (source_location_id);
CREATE INDEX IF NOT EXISTS internal_transfers_destination_location_id_idx ON internal_transfers (destination_location_id);
CREATE INDEX IF NOT EXISTS internal_transfers_created_by_idx              ON internal_transfers (created_by);
CREATE INDEX IF NOT EXISTS internal_transfers_created_at_idx              ON internal_transfers (created_at);

-- Trigger
CREATE TRIGGER internal_transfers_set_updated_at
  BEFORE UPDATE ON internal_transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SECTION 2 — internal_transfer_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS internal_transfer_items (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent Transfer
  transfer_id             UUID           NOT NULL
                            REFERENCES internal_transfers (id) ON DELETE CASCADE,

  -- Item details
  product_id              UUID           NOT NULL
                            REFERENCES products (id) ON DELETE RESTRICT,

  -- Quantity
  quantity                NUMERIC(15, 4) NOT NULL DEFAULT 0,

  -- Timestamps
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT internal_transfer_items_quantity_positive CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS internal_transfer_items_transfer_id_idx ON internal_transfer_items (transfer_id);
CREATE INDEX IF NOT EXISTS internal_transfer_items_product_id_idx  ON internal_transfer_items (product_id);

-- Trigger
CREATE TRIGGER internal_transfer_items_set_updated_at
  BEFORE UPDATE ON internal_transfer_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- END OF MIGRATION 0004
-- =============================================================================
