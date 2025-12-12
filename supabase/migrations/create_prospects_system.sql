-- ============================================================================
-- PROSPECTS SYSTEM - Database Schema
-- Creates tables for prospect discovery, management, and audit reports
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROSPECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business Information
  business_name TEXT NOT NULL,
  contact_name TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Categorization
  niche TEXT[],  -- Array of niches (e.g., ['restaurant', 'italian food', 'fine dining'])
  industry TEXT,
  category TEXT,

  -- Business Details
  description TEXT,
  company_size TEXT,  -- '1-10', '11-50', '51-200', '201-500', '500+'
  years_in_business INTEGER,

  -- Online Presence
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  google_business_url TEXT,
  yelp_url TEXT,

  -- Status & Tracking
  status TEXT DEFAULT 'new',  -- 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost'
  source TEXT DEFAULT 'search',  -- 'search', 'manual', 'import', 'ai'
  priority TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high'
  tags TEXT[],

  -- Conversion & Metrics
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,

  -- Audit Status
  audit_generated BOOLEAN DEFAULT FALSE,
  audit_generated_at TIMESTAMPTZ,
  audit_score DECIMAL(5, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prospects
CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_niche ON prospects USING GIN(niche);
CREATE INDEX IF NOT EXISTS idx_prospects_city ON prospects(city);
CREATE INDEX IF NOT EXISTS idx_prospects_country ON prospects(country);
CREATE INDEX IF NOT EXISTS idx_prospects_website ON prospects(website);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at DESC);

-- ============================================================================
-- PROSPECT AUDITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prospect_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audit Metadata
  audit_type TEXT NOT NULL DEFAULT 'basic',  -- 'basic', 'premium', 'full'
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'

  -- SEO Audit
  seo_score DECIMAL(5, 2),
  seo_title_optimized BOOLEAN,
  seo_meta_description BOOLEAN,
  seo_headings_structure BOOLEAN,
  seo_mobile_friendly BOOLEAN,
  seo_https_enabled BOOLEAN,
  seo_sitemap_exists BOOLEAN,
  seo_robots_txt BOOLEAN,
  seo_schema_markup BOOLEAN,

  -- Performance Audit
  performance_score DECIMAL(5, 2),
  performance_load_time DECIMAL(10, 2),  -- in seconds
  performance_page_size DECIMAL(10, 2),  -- in MB
  performance_requests_count INTEGER,
  performance_fcp DECIMAL(10, 2),  -- First Contentful Paint
  performance_lcp DECIMAL(10, 2),  -- Largest Contentful Paint
  performance_cls DECIMAL(10, 4),  -- Cumulative Layout Shift

  -- Online Presence Audit
  online_presence_score DECIMAL(5, 2),
  has_google_business BOOLEAN DEFAULT FALSE,
  has_facebook BOOLEAN DEFAULT FALSE,
  has_instagram BOOLEAN DEFAULT FALSE,
  has_linkedin BOOLEAN DEFAULT FALSE,
  has_twitter BOOLEAN DEFAULT FALSE,
  has_yelp BOOLEAN DEFAULT FALSE,

  -- Reputation Audit
  reputation_score DECIMAL(5, 2),
  google_rating DECIMAL(3, 2),
  google_reviews_count INTEGER,
  yelp_rating DECIMAL(3, 2),
  yelp_reviews_count INTEGER,
  facebook_rating DECIMAL(3, 2),
  facebook_reviews_count INTEGER,

  -- Lead Capture Audit
  lead_capture_score DECIMAL(5, 2),
  has_contact_form BOOLEAN DEFAULT FALSE,
  has_phone_number BOOLEAN DEFAULT FALSE,
  has_email BOOLEAN DEFAULT FALSE,
  has_chat_widget BOOLEAN DEFAULT FALSE,
  has_booking_system BOOLEAN DEFAULT FALSE,

  -- Local SEO Audit
  local_seo_score DECIMAL(5, 2),
  nap_consistency BOOLEAN DEFAULT FALSE,  -- Name, Address, Phone
  local_citations_count INTEGER DEFAULT 0,
  google_business_optimized BOOLEAN DEFAULT FALSE,

  -- Overall Scores
  overall_score DECIMAL(5, 2),

  -- Report Data (JSONB for flexibility)
  detailed_findings JSONB,
  recommendations JSONB,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audits
CREATE INDEX IF NOT EXISTS idx_prospect_audits_prospect_id ON prospect_audits(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_audits_user_id ON prospect_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_audits_status ON prospect_audits(status);
CREATE INDEX IF NOT EXISTS idx_prospect_audits_created_at ON prospect_audits(created_at DESC);

-- ============================================================================
-- PROSPECT LISTS TABLE (for organizing prospects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prospect_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',  -- For UI categorization

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lists
CREATE INDEX IF NOT EXISTS idx_prospect_lists_user_id ON prospect_lists(user_id);

-- ============================================================================
-- PROSPECT LIST MEMBERS TABLE (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prospect_list_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES prospect_lists(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,

  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(list_id, prospect_id)
);

-- Indexes for list members
CREATE INDEX IF NOT EXISTS idx_prospect_list_members_list_id ON prospect_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_prospect_list_members_prospect_id ON prospect_list_members(prospect_id);

-- ============================================================================
-- PROSPECT ACTIVITIES TABLE (track interactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prospect_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL,  -- 'email_sent', 'call_made', 'meeting_scheduled', 'audit_generated', 'status_changed', 'note_added'
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect_id ON prospect_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_user_id ON prospect_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_created_at ON prospect_activities(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_activities ENABLE ROW LEVEL SECURITY;

-- Prospects policies
CREATE POLICY "Users can view their own prospects"
  ON prospects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prospects"
  ON prospects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prospects"
  ON prospects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prospects"
  ON prospects FOR DELETE
  USING (auth.uid() = user_id);

-- Prospect audits policies
CREATE POLICY "Users can view their own prospect audits"
  ON prospect_audits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prospect audits"
  ON prospect_audits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prospect audits"
  ON prospect_audits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prospect audits"
  ON prospect_audits FOR DELETE
  USING (auth.uid() = user_id);

-- Prospect lists policies
CREATE POLICY "Users can view their own prospect lists"
  ON prospect_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prospect lists"
  ON prospect_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prospect lists"
  ON prospect_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prospect lists"
  ON prospect_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Prospect list members policies (inherit from parent list)
CREATE POLICY "Users can view prospect list members for their lists"
  ON prospect_list_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prospect_lists
      WHERE prospect_lists.id = prospect_list_members.list_id
      AND prospect_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members to their lists"
  ON prospect_list_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prospect_lists
      WHERE prospect_lists.id = prospect_list_members.list_id
      AND prospect_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove members from their lists"
  ON prospect_list_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prospect_lists
      WHERE prospect_lists.id = prospect_list_members.list_id
      AND prospect_lists.user_id = auth.uid()
    )
  );

-- Prospect activities policies
CREATE POLICY "Users can view their own prospect activities"
  ON prospect_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prospect activities"
  ON prospect_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospect_audits_updated_at
  BEFORE UPDATE ON prospect_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospect_lists_updated_at
  BEFORE UPDATE ON prospect_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS (for easier querying)
-- ============================================================================

-- View for prospects with their latest audit
CREATE OR REPLACE VIEW prospects_with_latest_audit AS
SELECT
  p.*,
  pa.id AS latest_audit_id,
  pa.overall_score AS latest_audit_score,
  pa.seo_score,
  pa.performance_score,
  pa.reputation_score,
  pa.generated_at AS audit_date
FROM prospects p
LEFT JOIN LATERAL (
  SELECT *
  FROM prospect_audits
  WHERE prospect_audits.prospect_id = p.id
  ORDER BY created_at DESC
  LIMIT 1
) pa ON true;

-- Grant access to the view
GRANT SELECT ON prospects_with_latest_audit TO authenticated;

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Insert a "General" list for all users (will be created per user dynamically)
-- This is handled in the application layer

COMMENT ON TABLE prospects IS 'Stores business prospect information for lead generation and marketing';
COMMENT ON TABLE prospect_audits IS 'Stores comprehensive audit reports for prospects including SEO, performance, and reputation metrics';
COMMENT ON TABLE prospect_lists IS 'Custom lists for organizing prospects';
COMMENT ON TABLE prospect_list_members IS 'Many-to-many relationship between lists and prospects';
COMMENT ON TABLE prospect_activities IS 'Activity timeline for prospect interactions';
