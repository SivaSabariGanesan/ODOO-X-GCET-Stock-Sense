-- Migration: 0007_receipt_items_unit_price_notes.sql
-- Adds unit_price and notes columns to receipt_items table.
-- These fields exist in the Drizzle schema (receipt-items.ts) but were missing
-- from the database because drizzle-kit generate:pg fails to resolve ESM imports.

ALTER TABLE receipt_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 4),
  ADD COLUMN IF NOT EXISTS notes      TEXT;
