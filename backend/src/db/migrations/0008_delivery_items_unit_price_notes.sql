-- Migration: 0008_delivery_items_unit_price_notes.sql
-- Adds unit_price and notes columns to delivery_items table.
-- These fields exist in the Drizzle schema (delivery-items.ts) but were missing
-- from the database schema migration 0003.

ALTER TABLE delivery_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 4),
  ADD COLUMN IF NOT EXISTS notes      TEXT;
