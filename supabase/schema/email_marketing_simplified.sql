-- ============================================================================
-- BULK EMAIL MARKETING - SUPABASE DATABASE SCHEMA (SIMPLIFIED)
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor
-- Version: 1.0.0 - Simplified (without pg_cron)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: email_contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    company VARCHAR(200),
    phone VARCHAR(50),
    website VARCHAR(255),
    location VARCHAR(255),
    
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_id VARCHAR(255),
    
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    subscription_status VARCHAR(20) DEFAULT 'subscribed',
    
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    total_emails_sent INTEGER DEFAULT 0,
    total_emails_opened INTEGER DEFAULT 0,
    total_emails_clicked INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMPTZ,
    last_email_opened_at TIMESTAMPTZ,
    last_email_clicked_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_contact_per_user UNIQUE (user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON email_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON email_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON email_contacts(status);

-- ============================================================================
-- TABLE: email_lists
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    list_type VARCHAR(20) DEFAULT 'static',
    filter_criteria JSONB DEFAULT '{}',
    contact_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: email_list_contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_list_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES email_lists(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_list_contact UNIQUE (list_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_list_contacts_list ON email_list_contacts(list_id);
CREATE INDEX IF NOT EXISTS idx_list_contacts_contact ON email_list_contacts(contact_id);

-- ============================================================================
-- TABLE: email_segments
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL DEFAULT '{}',
    estimated_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: email_templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(500),
    html_content TEXT NOT NULL,
    text_content TEXT,
    preview_text VARCHAR(255),
    category VARCHAR(50) DEFAULT 'general',
    thumbnail_url TEXT,
    variables JSONB DEFAULT '[]',
    source VARCHAR(50) DEFAULT 'custom',
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON email_templates(category);

-- ============================================================================
-- TABLE: email_campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(500) NOT NULL,
    from_name VARCHAR(100) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),
    
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    preview_text VARCHAR(255),
    
    recipient_type VARCHAR(20) NOT NULL DEFAULT 'all',
    recipient_list_id UUID REFERENCES email_lists(id) ON DELETE SET NULL,
    recipient_segment_id UUID REFERENCES email_segments(id) ON DELETE SET NULL,
    recipient_count INTEGER DEFAULT 0,
    
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    track_opens BOOLEAN DEFAULT true,
    track_clicks BOOLEAN DEFAULT true,
    
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_complained INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    
    open_rate DECIMAL(5,2) DEFAULT 0,
    click_rate DECIMAL(5,2) DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);

-- ============================================================================
-- TABLE: email_sends
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
    
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    external_id VARCHAR(255),
    
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    first_opened_at TIMESTAMPTZ,
    last_opened_at TIMESTAMPTZ,
    first_clicked_at TIMESTAMPTZ,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    error_message TEXT,
    error_code VARCHAR(50),
    clicked_links JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sends_contact ON email_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_sends_external ON email_sends(external_id);

-- ============================================================================
-- TABLE: email_analytics_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
    
    event_type VARCHAR(30) NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(20),
    country VARCHAR(2),
    city VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_campaign ON email_analytics_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON email_analytics_events(event_type);

-- ============================================================================
-- TABLE: email_unsubscribes
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES email_contacts(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    
    email VARCHAR(255) NOT NULL,
    reason TEXT,
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: csv_imports
-- ============================================================================
CREATE TABLE IF NOT EXISTS csv_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    list_id UUID REFERENCES email_lists(id) ON DELETE SET NULL,
    column_mapping JSONB NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending',
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_email_contacts_updated_at ON email_contacts;
CREATE TRIGGER update_email_contacts_updated_at BEFORE UPDATE ON email_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_lists_updated_at ON email_lists;
CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON email_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_sends_updated_at ON email_sends;
CREATE TRIGGER update_email_sends_updated_at BEFORE UPDATE ON email_sends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_list_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- Contacts policies
DROP POLICY IF EXISTS "Users can view own contacts" ON email_contacts;
CREATE POLICY "Users can view own contacts" ON email_contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own contacts" ON email_contacts;
CREATE POLICY "Users can insert own contacts" ON email_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own contacts" ON email_contacts;
CREATE POLICY "Users can update own contacts" ON email_contacts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own contacts" ON email_contacts;
CREATE POLICY "Users can delete own contacts" ON email_contacts FOR DELETE USING (auth.uid() = user_id);

-- Lists policies
DROP POLICY IF EXISTS "Users can manage own lists" ON email_lists;
CREATE POLICY "Users can manage own lists" ON email_lists FOR ALL USING (auth.uid() = user_id);

-- List contacts policies
DROP POLICY IF EXISTS "Users can manage own list contacts" ON email_list_contacts;
CREATE POLICY "Users can manage own list contacts" ON email_list_contacts FOR ALL USING (
    EXISTS (SELECT 1 FROM email_lists WHERE id = list_id AND user_id = auth.uid())
);

-- Segments policies
DROP POLICY IF EXISTS "Users can manage own segments" ON email_segments;
CREATE POLICY "Users can manage own segments" ON email_segments FOR ALL USING (auth.uid() = user_id);

-- Templates policies
DROP POLICY IF EXISTS "Users can manage own templates" ON email_templates;
CREATE POLICY "Users can manage own templates" ON email_templates FOR ALL USING (auth.uid() = user_id);

-- Campaigns policies
DROP POLICY IF EXISTS "Users can manage own campaigns" ON email_campaigns;
CREATE POLICY "Users can manage own campaigns" ON email_campaigns FOR ALL USING (auth.uid() = user_id);

-- Sends policies
DROP POLICY IF EXISTS "Users can view own sends" ON email_sends;
CREATE POLICY "Users can view own sends" ON email_sends FOR SELECT USING (
    EXISTS (SELECT 1 FROM email_campaigns WHERE id = campaign_id AND user_id = auth.uid())
);

-- Analytics policies
DROP POLICY IF EXISTS "Users can view own analytics" ON email_analytics_events;
CREATE POLICY "Users can view own analytics" ON email_analytics_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM email_campaigns WHERE id = campaign_id AND user_id = auth.uid())
);

-- Unsubscribes policies
DROP POLICY IF EXISTS "Users can manage own unsubscribes" ON email_unsubscribes;
CREATE POLICY "Users can manage own unsubscribes" ON email_unsubscribes FOR ALL USING (auth.uid() = user_id);

-- CSV imports policies
DROP POLICY IF EXISTS "Users can manage own imports" ON csv_imports;
CREATE POLICY "Users can manage own imports" ON csv_imports FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- ALLOW ANONYMOUS ACCESS FOR TESTING (REMOVE IN PRODUCTION)
-- ============================================================================
-- These policies allow unauthenticated access for development/testing
-- IMPORTANT: Remove these in production!

DROP POLICY IF EXISTS "Allow anonymous read contacts" ON email_contacts;
CREATE POLICY "Allow anonymous read contacts" ON email_contacts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous insert contacts" ON email_contacts;
CREATE POLICY "Allow anonymous insert contacts" ON email_contacts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous update contacts" ON email_contacts;
CREATE POLICY "Allow anonymous update contacts" ON email_contacts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow anonymous delete contacts" ON email_contacts;
CREATE POLICY "Allow anonymous delete contacts" ON email_contacts FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anonymous all lists" ON email_lists;
CREATE POLICY "Allow anonymous all lists" ON email_lists FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all list_contacts" ON email_list_contacts;
CREATE POLICY "Allow anonymous all list_contacts" ON email_list_contacts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all segments" ON email_segments;
CREATE POLICY "Allow anonymous all segments" ON email_segments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all templates" ON email_templates;
CREATE POLICY "Allow anonymous all templates" ON email_templates FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all campaigns" ON email_campaigns;
CREATE POLICY "Allow anonymous all campaigns" ON email_campaigns FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all sends" ON email_sends;
CREATE POLICY "Allow anonymous all sends" ON email_sends FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all analytics" ON email_analytics_events;
CREATE POLICY "Allow anonymous all analytics" ON email_analytics_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all unsubscribes" ON email_unsubscribes;
CREATE POLICY "Allow anonymous all unsubscribes" ON email_unsubscribes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous all imports" ON csv_imports;
CREATE POLICY "Allow anonymous all imports" ON csv_imports FOR ALL USING (true);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
