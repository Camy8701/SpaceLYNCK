-- ============================================================================
-- BULK EMAIL MARKETING - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to create all required tables
-- Version: 1.0.0
-- Date: December 2025
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- TABLE: email_contacts
-- Stores all email contacts from various sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    company VARCHAR(200),
    phone VARCHAR(50),
    website VARCHAR(255),
    location VARCHAR(255),
    
    -- Source tracking
    source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'csv_import', 'prospect', 'api', 'form'
    source_id VARCHAR(255), -- Reference to original source (e.g., prospect_id)
    
    -- Status & Engagement
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced', 'complained'
    subscription_status VARCHAR(20) DEFAULT 'subscribed', -- 'subscribed', 'unsubscribed', 'pending'
    
    -- Custom fields (JSON for flexibility)
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Engagement metrics
    total_emails_sent INTEGER DEFAULT 0,
    total_emails_opened INTEGER DEFAULT 0,
    total_emails_clicked INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMPTZ,
    last_email_opened_at TIMESTAMPTZ,
    last_email_clicked_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_contact_per_user UNIQUE (user_id, email)
);

-- Indexes for email_contacts
CREATE INDEX idx_contacts_user_id ON email_contacts(user_id);
CREATE INDEX idx_contacts_email ON email_contacts(email);
CREATE INDEX idx_contacts_status ON email_contacts(status);
CREATE INDEX idx_contacts_source ON email_contacts(source);
CREATE INDEX idx_contacts_tags ON email_contacts USING GIN(tags);

-- ============================================================================
-- TABLE: email_lists
-- Contact lists for organizing recipients
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- List type
    list_type VARCHAR(20) DEFAULT 'static', -- 'static', 'dynamic'
    
    -- For dynamic lists - filter criteria
    filter_criteria JSONB DEFAULT '{}',
    
    -- Stats
    contact_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: email_list_contacts (Junction table)
-- Links contacts to lists
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_list_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES email_lists(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
    
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_list_contact UNIQUE (list_id, contact_id)
);

CREATE INDEX idx_list_contacts_list ON email_list_contacts(list_id);
CREATE INDEX idx_list_contacts_contact ON email_list_contacts(contact_id);

-- ============================================================================
-- TABLE: email_segments
-- Dynamic segments based on criteria
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Segment criteria (JSON for flexible filtering)
    criteria JSONB NOT NULL DEFAULT '{}',
    -- Example criteria:
    -- {
    --   "conditions": [
    --     {"field": "tags", "operator": "contains", "value": "premium"},
    --     {"field": "total_emails_opened", "operator": ">=", "value": 5}
    --   ],
    --   "match": "all" -- or "any"
    -- }
    
    -- Cached count (updated periodically)
    estimated_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: email_templates
-- Email templates (including Canva HTML exports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Template content
    subject VARCHAR(500),
    html_content TEXT NOT NULL,
    text_content TEXT, -- Plain text version
    preview_text VARCHAR(255), -- Email preview text
    
    -- Template metadata
    category VARCHAR(50) DEFAULT 'general', -- 'newsletter', 'promotional', 'transactional', 'general'
    thumbnail_url TEXT, -- Preview image URL
    
    -- Template variables (for personalization)
    variables JSONB DEFAULT '[]',
    -- Example: ["first_name", "company", "unsubscribe_link"]
    
    -- Source info
    source VARCHAR(50) DEFAULT 'custom', -- 'custom', 'canva', 'predefined'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user ON email_templates(user_id);
CREATE INDEX idx_templates_category ON email_templates(category);

-- ============================================================================
-- TABLE: email_campaigns
-- Email campaigns (drafts, scheduled, sent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Campaign details
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Email content
    subject VARCHAR(500) NOT NULL,
    from_name VARCHAR(100) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),
    
    -- Content (can reference template or be custom)
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    preview_text VARCHAR(255),
    
    -- Recipients
    recipient_type VARCHAR(20) NOT NULL DEFAULT 'list', -- 'list', 'segment', 'all', 'custom'
    recipient_list_id UUID REFERENCES email_lists(id) ON DELETE SET NULL,
    recipient_segment_id UUID REFERENCES email_segments(id) ON DELETE SET NULL,
    recipient_count INTEGER DEFAULT 0,
    
    -- Scheduling
    status VARCHAR(20) NOT NULL DEFAULT 'draft', 
    -- 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'
    
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Campaign settings
    track_opens BOOLEAN DEFAULT true,
    track_clicks BOOLEAN DEFAULT true,
    
    -- Analytics summary (updated after sending)
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_complained INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    
    -- Rates (calculated)
    open_rate DECIMAL(5,2) DEFAULT 0,
    click_rate DECIMAL(5,2) DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user ON email_campaigns(user_id);
CREATE INDEX idx_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON email_campaigns(scheduled_at) WHERE status = 'scheduled';

-- ============================================================================
-- TABLE: email_sends
-- Individual email send records (for tracking each recipient)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
    
    -- Recipient info (denormalized for historical accuracy)
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(200),
    
    -- Send status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'
    
    -- External IDs (from Resend)
    external_id VARCHAR(255), -- Resend message ID
    
    -- Tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    first_opened_at TIMESTAMPTZ,
    last_opened_at TIMESTAMPTZ,
    first_clicked_at TIMESTAMPTZ,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Click tracking details
    clicked_links JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_sends_contact ON email_sends(contact_id);
CREATE INDEX idx_sends_status ON email_sends(status);
CREATE INDEX idx_sends_external ON email_sends(external_id);

-- ============================================================================
-- TABLE: email_analytics_events
-- Detailed analytics events (opens, clicks, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
    
    event_type VARCHAR(30) NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
    
    -- Event details
    event_data JSONB DEFAULT '{}',
    -- For clicks: {"url": "https://...", "link_id": "..."}
    -- For bounces: {"type": "hard", "reason": "..."}
    
    -- Device/Location info (from tracking pixel/webhook)
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    country VARCHAR(2),
    city VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_send ON email_analytics_events(send_id);
CREATE INDEX idx_events_campaign ON email_analytics_events(campaign_id);
CREATE INDEX idx_events_type ON email_analytics_events(event_type);
CREATE INDEX idx_events_created ON email_analytics_events(created_at);

-- ============================================================================
-- TABLE: email_unsubscribes
-- Unsubscribe tracking
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

CREATE INDEX idx_unsubscribes_email ON email_unsubscribes(email);

-- ============================================================================
-- TABLE: email_queue
-- Queue for pending emails (for batch processing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,
    
    -- Email data
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(200),
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    from_name VARCHAR(100) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),
    
    -- Queue management
    priority INTEGER DEFAULT 5, -- 1-10, lower = higher priority
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
    
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_status ON email_queue(status) WHERE status = 'pending';
CREATE INDEX idx_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';

-- ============================================================================
-- TABLE: csv_imports
-- Track CSV import jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS csv_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    
    -- Import settings
    list_id UUID REFERENCES email_lists(id) ON DELETE SET NULL,
    column_mapping JSONB NOT NULL, -- {"email": 0, "first_name": 1, ...}
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Stats
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    errors JSONB DEFAULT '[]', -- Array of error details
    
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

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_email_contacts_updated_at BEFORE UPDATE ON email_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON email_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_segments_updated_at BEFORE UPDATE ON email_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sends_updated_at BEFORE UPDATE ON email_sends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update list contact count
CREATE OR REPLACE FUNCTION update_list_contact_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE email_lists SET contact_count = contact_count + 1 WHERE id = NEW.list_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE email_lists SET contact_count = contact_count - 1 WHERE id = OLD.list_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_list_count_on_insert
    AFTER INSERT ON email_list_contacts
    FOR EACH ROW EXECUTE FUNCTION update_list_contact_count();

CREATE TRIGGER update_list_count_on_delete
    AFTER DELETE ON email_list_contacts
    FOR EACH ROW EXECUTE FUNCTION update_list_contact_count();

-- Function to update contact engagement metrics
CREATE OR REPLACE FUNCTION update_contact_engagement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'sent' THEN
        UPDATE email_contacts SET 
            total_emails_sent = total_emails_sent + 1,
            last_email_sent_at = NOW()
        WHERE id = NEW.contact_id;
    ELSIF NEW.event_type = 'opened' THEN
        UPDATE email_contacts SET 
            total_emails_opened = total_emails_opened + 1,
            last_email_opened_at = NOW()
        WHERE id = NEW.contact_id;
    ELSIF NEW.event_type = 'clicked' THEN
        UPDATE email_contacts SET 
            total_emails_clicked = total_emails_clicked + 1,
            last_email_clicked_at = NOW()
        WHERE id = NEW.contact_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_engagement_on_event
    AFTER INSERT ON email_analytics_events
    FOR EACH ROW EXECUTE FUNCTION update_contact_engagement();

-- Function to update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE email_campaigns SET
        total_sent = (SELECT COUNT(*) FROM email_sends WHERE campaign_id = NEW.campaign_id AND status IN ('sent', 'delivered', 'opened', 'clicked')),
        total_delivered = (SELECT COUNT(*) FROM email_sends WHERE campaign_id = NEW.campaign_id AND status IN ('delivered', 'opened', 'clicked')),
        total_opened = (SELECT COUNT(*) FROM email_sends WHERE campaign_id = NEW.campaign_id AND first_opened_at IS NOT NULL),
        total_clicked = (SELECT COUNT(*) FROM email_sends WHERE campaign_id = NEW.campaign_id AND first_clicked_at IS NOT NULL),
        total_bounced = (SELECT COUNT(*) FROM email_sends WHERE campaign_id = NEW.campaign_id AND status = 'bounced')
    WHERE id = NEW.campaign_id;
    
    -- Update rates
    UPDATE email_campaigns SET
        open_rate = CASE WHEN total_delivered > 0 THEN (total_opened::DECIMAL / total_delivered * 100) ELSE 0 END,
        click_rate = CASE WHEN total_delivered > 0 THEN (total_clicked::DECIMAL / total_delivered * 100) ELSE 0 END,
        bounce_rate = CASE WHEN total_sent > 0 THEN (total_bounced::DECIMAL / total_sent * 100) ELSE 0 END
    WHERE id = NEW.campaign_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_stats_on_send_update
    AFTER UPDATE ON email_sends
    FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_list_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view own contacts" ON email_contacts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON email_contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON email_contacts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON email_contacts
    FOR DELETE USING (auth.uid() = user_id);

-- Lists policies
CREATE POLICY "Users can view own lists" ON email_lists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON email_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON email_lists
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON email_lists
    FOR DELETE USING (auth.uid() = user_id);

-- List contacts policies (via list ownership)
CREATE POLICY "Users can view own list contacts" ON email_list_contacts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM email_lists WHERE id = list_id AND user_id = auth.uid())
    );
CREATE POLICY "Users can insert own list contacts" ON email_list_contacts
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM email_lists WHERE id = list_id AND user_id = auth.uid())
    );
CREATE POLICY "Users can delete own list contacts" ON email_list_contacts
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM email_lists WHERE id = list_id AND user_id = auth.uid())
    );

-- Segments policies
CREATE POLICY "Users can manage own segments" ON email_segments
    FOR ALL USING (auth.uid() = user_id);

-- Templates policies
CREATE POLICY "Users can manage own templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);

-- Campaigns policies
CREATE POLICY "Users can manage own campaigns" ON email_campaigns
    FOR ALL USING (auth.uid() = user_id);

-- Sends policies (via campaign ownership)
CREATE POLICY "Users can view own sends" ON email_sends
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM email_campaigns WHERE id = campaign_id AND user_id = auth.uid())
    );

-- Analytics events policies
CREATE POLICY "Users can view own analytics" ON email_analytics_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM email_campaigns WHERE id = campaign_id AND user_id = auth.uid())
    );

-- Unsubscribes policies
CREATE POLICY "Users can manage own unsubscribes" ON email_unsubscribes
    FOR ALL USING (auth.uid() = user_id);

-- Queue policies
CREATE POLICY "Users can view own queue" ON email_queue
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM email_campaigns WHERE id = campaign_id AND user_id = auth.uid())
    );

-- CSV imports policies
CREATE POLICY "Users can manage own imports" ON csv_imports
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SERVICE ROLE POLICIES (for Edge Functions)
-- ============================================================================
-- Note: Edge Functions use service_role key which bypasses RLS
-- These are additional policies for specific operations

-- Allow service role to process queue
CREATE POLICY "Service can process queue" ON email_queue
    FOR ALL USING (true);

CREATE POLICY "Service can update sends" ON email_sends
    FOR ALL USING (true);

CREATE POLICY "Service can insert analytics" ON email_analytics_events
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SCHEDULED JOBS (pg_cron)
-- ============================================================================
-- Note: Run these after enabling pg_cron extension in Supabase dashboard

-- Process scheduled campaigns every minute
-- SELECT cron.schedule(
--     'process-scheduled-campaigns',
--     '* * * * *',
--     $$
--     UPDATE email_campaigns 
--     SET status = 'sending', started_at = NOW()
--     WHERE status = 'scheduled' 
--     AND scheduled_at <= NOW()
--     $$
-- );

-- Process email queue every 30 seconds (run via Edge Function instead for better control)

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data for testing
/*
-- Sample list
INSERT INTO email_lists (id, user_id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', auth.uid(), 'Newsletter Subscribers', 'Main newsletter list');

-- Sample template
INSERT INTO email_templates (id, user_id, name, subject, html_content, category) VALUES
    ('00000000-0000-0000-0000-000000000002', auth.uid(), 'Welcome Email', 
     'Welcome to {{company}}!',
     '<html><body><h1>Welcome {{first_name}}!</h1><p>Thanks for joining us.</p></body></html>',
     'transactional');
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
