-- ============================================================================
-- QUICK SETUP: Run this entire script in Supabase SQL Editor
-- https://supabase.com/dashboard/project/qlpsoaffybyebvlshbqv/sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING POLICIES (to avoid conflicts on re-run)
-- ============================================================================
DO $$ 
BEGIN
    -- income_split_settings policies
    DROP POLICY IF EXISTS "Users can view their own income split settings" ON income_split_settings;
    DROP POLICY IF EXISTS "Users can insert their own income split settings" ON income_split_settings;
    DROP POLICY IF EXISTS "Users can update their own income split settings" ON income_split_settings;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own transactions" ON personal_transactions;
    DROP POLICY IF EXISTS "Users can insert their own transactions" ON personal_transactions;
    DROP POLICY IF EXISTS "Users can update their own transactions" ON personal_transactions;
    DROP POLICY IF EXISTS "Users can delete their own transactions" ON personal_transactions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own budget categories" ON budget_categories;
    DROP POLICY IF EXISTS "Users can insert their own budget categories" ON budget_categories;
    DROP POLICY IF EXISTS "Users can update their own budget categories" ON budget_categories;
    DROP POLICY IF EXISTS "Users can delete their own budget categories" ON budget_categories;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own savings goals" ON savings_goals;
    DROP POLICY IF EXISTS "Users can insert their own savings goals" ON savings_goals;
    DROP POLICY IF EXISTS "Users can update their own savings goals" ON savings_goals;
    DROP POLICY IF EXISTS "Users can delete their own savings goals" ON savings_goals;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Personal Transactions
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

-- Budget Categories
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

-- Savings Goals
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

-- Income Split Settings
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

-- Invoices
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

-- Estimates
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

-- Business Expenses
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

-- Payments
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

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE personal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_split_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Personal Transactions
CREATE POLICY "Users can view their own transactions" ON personal_transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON personal_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON personal_transactions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON personal_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Budget Categories
CREATE POLICY "Users can view their own budget categories" ON budget_categories
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget categories" ON budget_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget categories" ON budget_categories
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget categories" ON budget_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Savings Goals
CREATE POLICY "Users can view their own savings goals" ON savings_goals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own savings goals" ON savings_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own savings goals" ON savings_goals
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own savings goals" ON savings_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Income Split Settings
CREATE POLICY "Users can view their own income split settings" ON income_split_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own income split settings" ON income_split_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own income split settings" ON income_split_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Invoices
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Estimates
CREATE POLICY "Users can view their own estimates" ON estimates
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own estimates" ON estimates
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own estimates" ON estimates
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own estimates" ON estimates
    FOR DELETE USING (auth.uid() = user_id);

-- Business Expenses
CREATE POLICY "Users can view their own business expenses" ON business_expenses
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own business expenses" ON business_expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own business expenses" ON business_expenses
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own business expenses" ON business_expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_personal_transactions_user_id ON personal_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_transactions_date ON personal_transactions(date);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_business_expenses_user_id ON business_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

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

-- ============================================================================
-- CREATE RECEIPTS STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts bucket
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- ============================================================================
-- DONE! Tables created successfully.
-- ============================================================================
SELECT 'SUCCESS: All accounting tables created!' as result;
