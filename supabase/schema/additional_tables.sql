-- ============================================================================
-- ADDITIONAL TABLES FOR LYNCKSPACE APPLICATION
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to create missing tables
-- ============================================================================

-- ============================================================================
-- TABLE: marketing_audits
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketing_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    business_name VARCHAR(255),
    business_url VARCHAR(500),
    
    overall_score INTEGER DEFAULT 0,
    categories JSONB DEFAULT '[]',
    details JSONB DEFAULT '[]',
    
    status VARCHAR(20) DEFAULT 'completed',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_audits_user ON marketing_audits(user_id);

-- Enable RLS
ALTER TABLE marketing_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own audits" ON marketing_audits;
CREATE POLICY "Users can manage own audits" ON marketing_audits FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anonymous all marketing_audits" ON marketing_audits;
CREATE POLICY "Allow anonymous all marketing_audits" ON marketing_audits FOR ALL USING (true);

-- ============================================================================
-- TABLE: prospects
-- ============================================================================
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(255),
    business_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    location VARCHAR(255),
    
    status VARCHAR(20) DEFAULT 'active',
    category VARCHAR(50) DEFAULT 'new',
    conversion_rate INTEGER DEFAULT 0,
    
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    
    last_activity VARCHAR(100),
    last_contacted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);

-- Enable RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own prospects" ON prospects;
CREATE POLICY "Users can manage own prospects" ON prospects FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anonymous all prospects" ON prospects;
CREATE POLICY "Allow anonymous all prospects" ON prospects FOR ALL USING (true);

-- ============================================================================
-- TABLE: projects (for project management features)
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by VARCHAR(255),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    
    start_date DATE,
    end_date DATE,
    
    color VARCHAR(7),
    icon VARCHAR(50),
    
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id OR created_by = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow anonymous all projects" ON projects;
CREATE POLICY "Allow anonymous all projects" ON projects FOR ALL USING (true);

-- ============================================================================
-- TABLE: tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    tags TEXT[] DEFAULT '{}',
    checklist JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "Allow anonymous all tasks" ON tasks;
CREATE POLICY "Allow anonymous all tasks" ON tasks FOR ALL USING (true);

-- ============================================================================
-- TABLE: time_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    created_by VARCHAR(255),
    
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INTEGER DEFAULT 0, -- in seconds
    
    status VARCHAR(20) DEFAULT 'active',
    billable BOOLEAN DEFAULT true,
    
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_created_by ON time_entries(created_by);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own time_entries" ON time_entries;
CREATE POLICY "Users can manage own time_entries" ON time_entries FOR ALL USING (auth.uid() = user_id OR created_by = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow anonymous all time_entries" ON time_entries;
CREATE POLICY "Allow anonymous all time_entries" ON time_entries FOR ALL USING (true);

-- ============================================================================
-- TABLE: user_gamification
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    
    badges JSONB DEFAULT '[]',
    achievements JSONB DEFAULT '[]',
    stats JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_gamification_user ON user_gamification(user_id);

-- Enable RLS
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own gamification" ON user_gamification;
CREATE POLICY "Users can manage own gamification" ON user_gamification FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anonymous all user_gamification" ON user_gamification;
CREATE POLICY "Allow anonymous all user_gamification" ON user_gamification FOR ALL USING (true);

-- ============================================================================
-- TRIGGERS for updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_marketing_audits_updated_at ON marketing_audits;
CREATE TRIGGER update_marketing_audits_updated_at BEFORE UPDATE ON marketing_audits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prospects_updated_at ON prospects;
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_gamification_updated_at ON user_gamification;
CREATE TRIGGER update_user_gamification_updated_at BEFORE UPDATE ON user_gamification
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF ADDITIONAL TABLES
-- ============================================================================
