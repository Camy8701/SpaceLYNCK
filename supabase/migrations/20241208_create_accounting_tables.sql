-- ============================================================================
-- ACCOUNTING TABLES MIGRATION
-- Run this SQL in your Supabase SQL Editor to create the required tables
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PERSONAL TRANSACTIONS TABLE
-- Stores personal income and expense transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS personal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    account VARCHAR(100) DEFAULT 'Checking',
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_personal_transactions_user_id ON personal_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_transactions_date ON personal_transactions(date);
CREATE INDEX IF NOT EXISTS idx_personal_transactions_type ON personal_transactions(type);

-- Enable RLS
ALTER TABLE personal_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transactions" ON personal_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON personal_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON personal_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON personal_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- BUDGET CATEGORIES TABLE
-- Stores monthly budget categories and spending limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
    spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
    color VARCHAR(50) DEFAULT 'emerald',
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);

-- Enable RLS
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own budget categories" ON budget_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget categories" ON budget_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget categories" ON budget_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget categories" ON budget_categories
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- SAVINGS GOALS TABLE
-- Stores financial savings goals
-- ============================================================================
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    target DECIMAL(12, 2) NOT NULL,
    current DECIMAL(12, 2) NOT NULL DEFAULT 0,
    deadline DATE,
    icon VARCHAR(50) DEFAULT '🎯',
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own savings goals" ON savings_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals" ON savings_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" ON savings_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" ON savings_goals
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- INCOME SPLIT SETTINGS TABLE
-- Stores user preferences for automatic income allocation
-- ============================================================================
CREATE TABLE IF NOT EXISTS income_split_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    taxes_percent DECIMAL(5, 2) DEFAULT 25,
    savings_percent DECIMAL(5, 2) DEFAULT 15,
    investments_percent DECIMAL(5, 2) DEFAULT 10,
    spending_percent DECIMAL(5, 2) DEFAULT 50,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE income_split_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own income split settings" ON income_split_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income split settings" ON income_split_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income split settings" ON income_split_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- INVOICES TABLE (if not exists)
-- Stores business invoices
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    client_email VARCHAR(200),
    client_phone VARCHAR(50),
    client_address TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    due_date DATE,
    notes TEXT,
    terms TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled')),
    is_recurring BOOLEAN DEFAULT false,
    recurring_interval VARCHAR(20),
    payment_methods JSONB DEFAULT '["bank"]'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_name ON invoices(client_name);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
CREATE POLICY "Users can insert their own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
CREATE POLICY "Users can update their own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;
CREATE POLICY "Users can delete their own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- ESTIMATES TABLE
-- Stores business estimates/quotes
-- ============================================================================
CREATE TABLE IF NOT EXISTS estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    estimate_number VARCHAR(50) NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    client_email VARCHAR(200),
    client_phone VARCHAR(50),
    items JSONB DEFAULT '[]'::jsonb,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    valid_until DATE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);

-- Enable RLS
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own estimates" ON estimates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own estimates" ON estimates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own estimates" ON estimates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own estimates" ON estimates
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- BUSINESS EXPENSES TABLE
-- Stores business-related expenses
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    is_billable BOOLEAN DEFAULT false,
    client_id UUID,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_expenses_user_id ON business_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(date);

-- Enable RLS
ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own business expenses" ON business_expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business expenses" ON business_expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business expenses" ON business_expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business expenses" ON business_expenses
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PAYMENTS TABLE
-- Stores payment records for invoices
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50),
    client_name VARCHAR(200),
    amount DECIMAL(12, 2) NOT NULL,
    method VARCHAR(50) DEFAULT 'bank' CHECK (method IN ('stripe', 'paypal', 'bank', 'cash', 'check', 'other')),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET FOR RECEIPTS
-- Run this in SQL Editor or create bucket manually in Supabase Dashboard
-- ============================================================================
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('receipts', 'receipts', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_personal_transactions_updated_at ON personal_transactions;
CREATE TRIGGER update_personal_transactions_updated_at
    BEFORE UPDATE ON personal_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_categories_updated_at ON budget_categories;
CREATE TRIGGER update_budget_categories_updated_at
    BEFORE UPDATE ON budget_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_savings_goals_updated_at ON savings_goals;
CREATE TRIGGER update_savings_goals_updated_at
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_income_split_settings_updated_at ON income_split_settings;
CREATE TRIGGER update_income_split_settings_updated_at
    BEFORE UPDATE ON income_split_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at
    BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_expenses_updated_at ON business_expenses;
CREATE TRIGGER update_business_expenses_updated_at
    BEFORE UPDATE ON business_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON personal_transactions TO authenticated;
GRANT ALL ON budget_categories TO authenticated;
GRANT ALL ON savings_goals TO authenticated;
GRANT ALL ON income_split_settings TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON estimates TO authenticated;
GRANT ALL ON business_expenses TO authenticated;
GRANT ALL ON payments TO authenticated;
