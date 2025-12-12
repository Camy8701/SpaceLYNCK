// ============================================================================
// PROSPECT DETAIL PAGE - View prospect details and generate audit reports
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  FileText,
  Loader2,
  Download,
  RefreshCw,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Shield,
  Zap,
  Users,
  Target,
  Award
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ProspectDetailPage({ prospect, onBack, sidebarCollapsed }) {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadLatestAudit();
    loadActivities();
  }, [prospect.id]);

  const loadLatestAudit = async () => {
    try {
      const { data, error } = await supabase
        .from('prospect_audits')
        .select('*')
        .eq('prospect_id', prospect.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading audit:', error);
      } else if (data) {
        setAudit(data);
      }
    } catch (error) {
      console.error('Error loading audit:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('prospect_activities')
        .select('*')
        .eq('prospect_id', prospect.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleGenerateAudit = async () => {
    try {
      setGenerating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      toast.info('Generating comprehensive audit report...');

      // Call Edge Function to generate audit
      const { data, error } = await supabase.functions.invoke('generate-prospect-audit', {
        body: {
          prospectId: prospect.id,
          website: prospect.website
        }
      });

      if (error) throw error;

      // Reload audit
      await loadLatestAudit();

      // Add activity
      await supabase
        .from('prospect_activities')
        .insert({
          prospect_id: prospect.id,
          user_id: user.id,
          activity_type: 'audit_generated',
          description: 'Generated comprehensive audit report'
        });

      await loadActivities();

      toast.success('Audit report generated successfully!');
    } catch (error) {
      console.error('Error generating audit:', error);
      toast.error(error.message || 'Failed to generate audit');
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  return (
    <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 hover:bg-white/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prospects
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{prospect.business_name}</h1>
              <p className="text-white/90">{prospect.contact_name || 'No contact name'}</p>
            </div>
          </div>
          <Button
            onClick={handleGenerateAudit}
            disabled={generating}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Audit...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {audit ? 'Regenerate Audit' : 'Generate Audit Report'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-600">Website</p>
                {prospect.website ? (
                  <a
                    href={`https://${prospect.website.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {prospect.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-sm text-slate-400">No website</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-slate-600">Email</p>
                <p className="text-sm font-medium text-slate-900">
                  {prospect.email || 'No email'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-slate-600">Phone</p>
                <p className="text-sm font-medium text-slate-900">
                  {prospect.phone || 'No phone'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-slate-600">Location</p>
                <p className="text-sm font-medium text-slate-900">
                  {[prospect.city, prospect.country].filter(Boolean).join(', ') || 'No location'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList className="bg-white/50 backdrop-blur-sm border-white/30 p-1.5 rounded-xl">
          <TabsTrigger value="audit" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg">
            <BarChart3 className="w-4 h-4 mr-2" />
            Audit Report
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg">
            <Building2 className="w-4 h-4 mr-2" />
            Business Details
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg">
            <TrendingUp className="w-4 h-4 mr-2" />
            Activity Timeline
          </TabsTrigger>
        </TabsList>

        {/* Audit Report Tab */}
        <TabsContent value="audit">
          {audit ? (
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
                <CardContent className="pt-8">
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBg(audit.overall_score || 0)} mb-4`}>
                      <span className={`text-5xl font-bold ${getScoreColor(audit.overall_score || 0)}`}>
                        {Math.round(audit.overall_score || 0)}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Overall Audit Score</h3>
                    <p className="text-slate-600">
                      Generated on {new Date(audit.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* SEO Score */}
                <Card className="bg-white/40 backdrop-blur-sm border-white/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-blue-600" />
                      SEO Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(audit.seo_score || 0)}`}>
                          {Math.round(audit.seo_score || 0)}%
                        </span>
                      </div>
                      <Progress value={audit.seo_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Title Optimized</span>
                        {audit.seo_title_optimized ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Meta Description</span>
                        {audit.seo_meta_description ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Mobile Friendly</span>
                        {audit.seo_mobile_friendly ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">HTTPS Enabled</span>
                        {audit.seo_https_enabled ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Score */}
                <Card className="bg-white/40 backdrop-blur-sm border-white/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      Performance Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(audit.performance_score || 0)}`}>
                          {Math.round(audit.performance_score || 0)}%
                        </span>
                      </div>
                      <Progress value={audit.performance_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Load Time</span>
                        <span className="font-medium">
                          {audit.performance_load_time ? `${audit.performance_load_time}s` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Page Size</span>
                        <span className="font-medium">
                          {audit.performance_page_size ? `${audit.performance_page_size}MB` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Requests</span>
                        <span className="font-medium">
                          {audit.performance_requests_count || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reputation Score */}
                <Card className="bg-white/40 backdrop-blur-sm border-white/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Star className="w-5 h-5 text-purple-600" />
                      Reputation Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(audit.reputation_score || 0)}`}>
                          {Math.round(audit.reputation_score || 0)}%
                        </span>
                      </div>
                      <Progress value={audit.reputation_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2 text-sm">
                      {audit.google_rating && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Google Rating</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{audit.google_rating}/5</span>
                            <span className="text-slate-500">({audit.google_reviews_count})</span>
                          </div>
                        </div>
                      )}
                      {audit.yelp_rating && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Yelp Rating</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{audit.yelp_rating}/5</span>
                            <span className="text-slate-500">({audit.yelp_reviews_count})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Online Presence */}
                <Card className="bg-white/40 backdrop-blur-sm border-white/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-green-600" />
                      Online Presence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(audit.online_presence_score || 0)}`}>
                          {Math.round(audit.online_presence_score || 0)}%
                        </span>
                      </div>
                      <Progress value={audit.online_presence_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Google Business</span>
                        {audit.has_google_business ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Facebook</span>
                        {audit.has_facebook ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Instagram</span>
                        {audit.has_instagram ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">LinkedIn</span>
                        {audit.has_linkedin ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Capture */}
                <Card className="bg-white/40 backdrop-blur-sm border-white/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5 text-orange-600" />
                      Lead Capture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(audit.lead_capture_score || 0)}`}>
                          {Math.round(audit.lead_capture_score || 0)}%
                        </span>
                      </div>
                      <Progress value={audit.lead_capture_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Contact Form</span>
                        {audit.has_contact_form ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Phone Number</span>
                        {audit.has_phone_number ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Email Address</span>
                        {audit.has_email ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Chat Widget</span>
                        {audit.has_chat_widget ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Local SEO */}
                <Card className="bg-white/40 backdrop-blur-sm border-white/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="w-5 h-5 text-teal-600" />
                      Local SEO
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(audit.local_seo_score || 0)}`}>
                          {Math.round(audit.local_seo_score || 0)}%
                        </span>
                      </div>
                      <Progress value={audit.local_seo_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">NAP Consistency</span>
                        {audit.nap_consistency ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Local Citations</span>
                        <span className="font-medium">{audit.local_citations_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">GBP Optimized</span>
                        {audit.google_business_optimized ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Download Report */}
              <div className="flex justify-center">
                <Button className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download Full Report (PDF)
                </Button>
              </div>
            </div>
          ) : (
            <Card className="bg-white/40 backdrop-blur-sm border-white/30">
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Audit Report Generated</h3>
                <p className="text-slate-600 mb-6">
                  Click the "Generate Audit Report" button to analyze this prospect's online presence
                </p>
                <Button
                  onClick={handleGenerateAudit}
                  disabled={generating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Audit Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Business Details Tab */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/40 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Business Name</label>
                  <p className="text-lg font-semibold text-slate-900">{prospect.business_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Contact Name</label>
                  <p className="text-lg text-slate-900">{prospect.contact_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Industry</label>
                  <p className="text-lg text-slate-900">{prospect.industry || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Company Size</label>
                  <p className="text-lg text-slate-900">{prospect.company_size || 'N/A'}</p>
                </div>
                {prospect.description && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Description</label>
                    <p className="text-sm text-slate-700 mt-1">{prospect.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/40 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle>Contact & Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Address</label>
                  <p className="text-lg text-slate-900">{prospect.address || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">City</label>
                    <p className="text-lg text-slate-900">{prospect.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">State</label>
                    <p className="text-lg text-slate-900">{prospect.state || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Country</label>
                    <p className="text-lg text-slate-900">{prospect.country || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Postal Code</label>
                    <p className="text-lg text-slate-900">{prospect.postal_code || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card className="bg-white/40 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle>Social Media Presence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prospect.facebook_url && (
                  <a
                    href={prospect.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Facebook</span>
                    <ExternalLink className="w-4 h-4 ml-auto text-slate-400" />
                  </a>
                )}
                {prospect.instagram_url && (
                  <a
                    href={prospect.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
                  >
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <span className="text-sm font-medium">Instagram</span>
                    <ExternalLink className="w-4 h-4 ml-auto text-slate-400" />
                  </a>
                )}
                {prospect.linkedin_url && (
                  <a
                    href={prospect.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
                  >
                    <Linkedin className="w-5 h-5 text-blue-700" />
                    <span className="text-sm font-medium">LinkedIn</span>
                    <ExternalLink className="w-4 h-4 ml-auto text-slate-400" />
                  </a>
                )}
                {prospect.twitter_url && (
                  <a
                    href={prospect.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
                  >
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium">Twitter</span>
                    <ExternalLink className="w-4 h-4 ml-auto text-slate-400" />
                  </a>
                )}
                {!prospect.facebook_url && !prospect.instagram_url && !prospect.linkedin_url && !prospect.twitter_url && (
                  <p className="text-sm text-slate-500 text-center py-4">No social media links available</p>
                )}
              </CardContent>
            </Card>

            {/* Niches/Tags */}
            <Card className="bg-white/40 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle>Categories & Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">Niches</label>
                    <div className="flex flex-wrap gap-2">
                      {prospect.niche && prospect.niche.length > 0 ? (
                        prospect.niche.map((n, idx) => (
                          <Badge key={idx} variant="outline" className="bg-white/60">
                            {n}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No niches specified</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {prospect.tags && prospect.tags.length > 0 ? (
                        prospect.tags.map((tag, idx) => (
                          <Badge key={idx} className="bg-blue-100 text-blue-700 border-blue-200">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No tags</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Timeline Tab */}
        <TabsContent value="activity">
          <Card className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent interactions and updates for this prospect</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 pb-4 border-b border-slate-200 last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="self-start">
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">No activity recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
