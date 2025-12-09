// ============================================================================
// DATABASE SETUP CHECKER - Diagnose and guide database setup for email marketing
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Database,
  RefreshCw,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { runDatabaseDiagnostics } from '@/services/emailService';
import toast from 'react-hot-toast';

export default function DatabaseSetupChecker({ onClose }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await runDatabaseDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setDiagnostics({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL copied to clipboard');
  };

  const requiredTables = [
    { name: 'email_campaigns', description: 'Stores campaign data, subject, content, status' },
    { name: 'email_contacts', description: 'Stores contact information for email recipients' },
    { name: 'email_lists', description: 'Organizes contacts into mailing lists' },
    { name: 'email_templates', description: 'Stores reusable email templates' },
    { name: 'email_sends', description: 'Tracks individual email send records' }
  ];

  // Quick setup SQL for essential tables only
  const quickSetupSql = `-- ============================================================================
-- QUICK SETUP: Essential Email Marketing Tables
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Campaign',
  description TEXT,
  subject VARCHAR(500) NOT NULL DEFAULT '(Draft - No Subject)',
  from_name VARCHAR(255) NOT NULL DEFAULT 'LynckStudio Pro',
  from_email VARCHAR(255) NOT NULL DEFAULT 'info@lynckstudio.pro',
  reply_to VARCHAR(255),
  template_id UUID,
  html_content TEXT NOT NULL DEFAULT '<p>Draft content</p>',
  text_content TEXT,
  preview_text VARCHAR(500),
  recipient_type VARCHAR(50) DEFAULT 'all',
  recipient_list_id UUID,
  recipient_segment_id UUID,
  track_opens BOOLEAN DEFAULT true,
  track_clicks BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
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
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Contacts Table
CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  full_name VARCHAR(500),
  company VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(500),
  location VARCHAR(255),
  source VARCHAR(100),
  source_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  subscription_status VARCHAR(50) DEFAULT 'subscribed',
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Email Lists Table
CREATE TABLE IF NOT EXISTS email_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'static',
  filter_criteria JSONB,
  contact_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email List Contacts (junction table)
CREATE TABLE IF NOT EXISTS email_list_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, contact_id)
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  subject VARCHAR(500),
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables TEXT[],
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Sends Table (tracks individual emails)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES email_contacts(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  resend_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_list_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage own campaigns" ON email_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contacts" ON email_contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own lists" ON email_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own list contacts" ON email_list_contacts FOR ALL 
  USING (EXISTS (SELECT 1 FROM email_lists WHERE id = email_list_contacts.list_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own templates" ON email_templates FOR ALL 
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can view own sends" ON email_sends FOR ALL 
  USING (EXISTS (SELECT 1 FROM email_campaigns WHERE id = email_sends.campaign_id AND user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_user_id ON email_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_email ON email_contacts(email);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Email marketing tables created successfully!';
END $$;
`;

  const allTablesExist = diagnostics && 
    Object.values(diagnostics.tables || {}).every(exists => exists);

  const getStatusColor = (exists) => exists ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (exists) => exists ? CheckCircle2 : XCircle;

  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-600">Running database diagnostics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card className={`${allTablesExist ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${allTablesExist ? 'bg-green-100' : 'bg-red-100'}`}>
                {allTablesExist ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <CardTitle className={allTablesExist ? 'text-green-800' : 'text-red-800'}>
                  {allTablesExist ? 'Database Ready!' : 'Database Setup Required'}
                </CardTitle>
                <CardDescription className={allTablesExist ? 'text-green-700' : 'text-red-700'}>
                  {allTablesExist 
                    ? 'All required tables are configured correctly.'
                    : 'Some database tables are missing. Please run the setup SQL.'
                  }
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={runDiagnostics}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Authentication Status */}
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${diagnostics?.authenticated ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <User className={`w-4 h-4 ${diagnostics?.authenticated ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className="font-medium text-slate-800">Authentication Status</p>
              <p className="text-sm text-slate-600">
                {diagnostics?.authenticated 
                  ? `Logged in (User ID: ${diagnostics.userId?.slice(0, 8)}...)`
                  : 'Not logged in - Please sign in to manage campaigns'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Status */}
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Tables
          </CardTitle>
          <CardDescription>Status of required email marketing tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requiredTables.map((table) => {
              const exists = diagnostics?.tables?.[table.name];
              const StatusIcon = getStatusIcon(exists);
              return (
                <div 
                  key={table.name} 
                  className={`flex items-center justify-between p-3 rounded-lg ${exists ? 'bg-green-50' : 'bg-red-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${getStatusColor(exists)}`} />
                    <div>
                      <p className={`font-mono text-sm ${getStatusColor(exists)}`}>{table.name}</p>
                      <p className="text-xs text-slate-500">{table.description}</p>
                    </div>
                  </div>
                  <Badge variant={exists ? "default" : "destructive"} className={exists ? "bg-green-600" : ""}>
                    {exists ? 'Ready' : 'Missing'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {!allTablesExist && (
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-orange-700">Setup Instructions</CardTitle>
            <CardDescription>Follow these steps to set up your database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-slate-800">Open Supabase Dashboard</p>
                  <p className="text-sm text-slate-600">Go to your Supabase project and open the SQL Editor</p>
                  <a 
                    href="https://supabase.com/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    Open Supabase Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-slate-800">Copy the SQL below</p>
                  <p className="text-sm text-slate-600">Click the button to copy the setup SQL to your clipboard</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-slate-800">Run the SQL</p>
                  <p className="text-sm text-slate-600">Paste and execute the SQL in the Supabase SQL Editor</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">4</div>
                <div>
                  <p className="font-medium text-slate-800">Refresh this page</p>
                  <p className="text-sm text-slate-600">Click "Refresh" above to verify the tables were created</p>
                </div>
              </div>
            </div>

            {/* SQL Code Block */}
            <Collapsible open={showSql} onOpenChange={setShowSql}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>View Setup SQL</span>
                    {showSql ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-3 relative">
                  <Button 
                    size="sm" 
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(quickSetupSql)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy SQL
                  </Button>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                    {quickSetupSql}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Close Button */}
      {onClose && (
        <div className="flex justify-end">
          <Button onClick={onClose}>
            {allTablesExist ? 'Continue to Campaigns' : 'Close'}
          </Button>
        </div>
      )}
    </div>
  );
}
