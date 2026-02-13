-- Add missing columns to tickets table to support ticket purchase flow
-- These columns are required by the purchase_ticket RPC function and frontend types

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS price TEXT,
ADD COLUMN IF NOT EXISTS ticket_number TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;
