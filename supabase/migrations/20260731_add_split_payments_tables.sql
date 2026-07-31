-- ============================================================================
-- Split Payments & Partner Ledger Tables
-- ============================================================================
-- This migration adds support for:
-- 1. Split payments between hotel (92%) and platform (8%)
-- 2. Partner ledger for tracking commissions to sales partners/affiliates
-- 3. Split payment configuration per hotel
-- ============================================================================

-- ============================================================================
-- Table: split_payments
-- Purpose: Records each transaction split between hotel and platform
-- ============================================================================
CREATE TABLE split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) UNIQUE NOT NULL,
  hotel_id UUID REFERENCES hotels(id) NOT NULL,
  
  -- Amounts (in COP - Colombian Pesos)
  total_amount DECIMAL(10,2) NOT NULL,
  hotel_amount DECIMAL(10,2) NOT NULL,
  platform_amount DECIMAL(10,2) NOT NULL,
  
  -- Wompi payment gateway integration
  wompi_transaction_id TEXT,
  wompi_subaccount_id TEXT,
  
  -- Split status: tracks the overall state of the split
  split_status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING: Split created but not yet processed
  -- COMPLETED: Both hotel and platform amounts successfully split
  -- FAILED: Split processing failed
  -- REFUNDED: Payment was refunded
  
  -- Hotel payout status: tracks when hotel receives their share
  hotel_payout_status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING: Hotel amount not yet disbursed
  -- DISBURSED: Hotel amount successfully transferred
  -- FAILED: Disbursement to hotel failed
  
  -- Platform payout status: tracks when platform receives their share
  platform_payout_status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING: Platform amount not yet disbursed
  -- DISBURSED: Platform amount successfully transferred
  -- FAILED: Disbursement to platform failed
  
  -- Invoicing fields
  invoice_generated BOOLEAN DEFAULT false,
  invoice_number TEXT,
  invoice_generated_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Constraints to enforce valid status values
  CONSTRAINT valid_split_status CHECK (split_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  CONSTRAINT valid_hotel_payout CHECK (hotel_payout_status IN ('PENDING', 'DISBURSED', 'FAILED')),
  CONSTRAINT valid_platform_payout CHECK (platform_payout_status IN ('PENDING', 'DISBURSED', 'FAILED'))
);

-- Indexes for split_payments - optimized for common queries
CREATE INDEX idx_split_payments_booking ON split_payments(booking_id);
CREATE INDEX idx_split_payments_hotel ON split_payments(hotel_id);
CREATE INDEX idx_split_payments_status ON split_payments(split_status);
CREATE INDEX idx_split_payments_created ON split_payments(created_at DESC);

-- ============================================================================
-- Table: partner_ledger
-- Purpose: Tracks commissions for partners/affiliates who refer hotels
-- ============================================================================
CREATE TABLE partner_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  hotel_id UUID REFERENCES hotels(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  
  -- Commission type
  commission_type VARCHAR(20) NOT NULL,
  -- 'subscription': 20% of the subscription plan fee
  -- 'reservation': 3% of the 8% platform commission
  
  -- Amounts (in COP)
  base_amount DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  
  -- Status: tracks the lifecycle of the commission
  status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING: Commission earned but not yet approved
  -- APPROVED: Commission approved for payment
  -- PAID: Commission successfully paid to partner
  -- CANCELLED: Commission cancelled (e.g., due to refund or clawback)
  
  -- Business rules
  clawback_deadline TIMESTAMP,
  -- 90 days from first payment - after this, commission is final
  
  -- Partner payout details
  payout_proof_url TEXT,
  payout_method VARCHAR(20),
  -- 'nequi': Nequi mobile wallet
  -- 'daviplata': Daviplata mobile wallet
  -- 'bank_transfer': Traditional bank transfer
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  -- Constraints to enforce valid values
  CONSTRAINT valid_commission_type CHECK (commission_type IN ('subscription', 'reservation')),
  CONSTRAINT valid_ledger_status CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED'))
);

-- Indexes for partner_ledger - optimized for common queries
CREATE INDEX idx_partner_ledger_partner ON partner_ledger(partner_id);
CREATE INDEX idx_partner_ledger_hotel ON partner_ledger(hotel_id);
CREATE INDEX idx_partner_ledger_status ON partner_ledger(status);
CREATE INDEX idx_partner_ledger_type ON partner_ledger(commission_type);
CREATE INDEX idx_partner_ledger_created ON partner_ledger(created_at DESC);

-- ============================================================================
-- Table: split_payment_config
-- Purpose: Stores split payment configuration per hotel
-- ============================================================================
CREATE TABLE split_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) UNIQUE NOT NULL,
  
  -- Split configuration
  platform_percentage DECIMAL(5,2) DEFAULT 8.00,
  hotel_percentage DECIMAL(5,2) DEFAULT 92.00,
  
  -- Wompi integration
  wompi_subaccount_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT false,
  kyc_completed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for split_payment_config - optimized for common queries
CREATE INDEX idx_split_config_hotel ON split_payment_config(hotel_id);
CREATE INDEX idx_split_config_active ON split_payment_config(is_active);
