// ============================================================================
// MARKETING AUDIT REPORT VIEW
// Displays audit results for business marketing analysis
// ============================================================================
import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileBarChart, Download, Share2, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';

export default function AuditReportView({ onBack, sidebarCollapsed }) {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch audit data from Supabase
      const { data, error: fetchError } = await supabase
        .from('marketing_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for empty table
        console.log('Audit fetch info:', fetchError);
      }
      
      setAuditData(data || null);
    } catch (err) {
      console.error('Error loading audit data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAuditData();
  };

  // Empty state when no audit data exists
  if (!loading && !auditData) {
    return (
      <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
        {/* Header with Back Button */}
        <div className="mb-8">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4 hover:bg-white/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketing Hub
            </Button>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <FileBarChart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Marketing Audit Report</h1>
                  <p className="text-slate-600">Analyze your business marketing performance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <FileBarChart className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Audit Data Yet</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Run your first marketing audit to analyze your business's online presence, 
              SEO performance, and digital marketing effectiveness.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Start New Audit
            </Button>
          </CardContent>
        </Card>

        {/* Feature Preview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Business Details', description: 'Contact info & accessibility' },
            { name: 'Tech Stack Analysis', description: 'Marketing tools & tracking' },
            { name: 'Google Business Profile', description: 'Local search presence' },
            { name: 'SEO Analysis', description: 'Search engine optimization' },
          ].map((feature, index) => (
            <Card key={index} className="bg-white/20 backdrop-blur-sm border-white/30 border-dashed">
              <CardContent className="pt-6 text-center">
                <h4 className="font-semibold text-slate-700 mb-1">{feature.name}</h4>
                <p className="text-sm text-slate-500">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
        <div className="mb-8">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4 hover:bg-white/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketing Hub
            </Button>
          )}
        </div>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-12 pb-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading audit data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render audit data when available
  const overallScore = auditData?.overall_score || 0;
  const categories = auditData?.categories || [];

  return (
    <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
      {/* Header with Back Button */}
      <div className="mb-8">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 hover:bg-white/30"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketing Hub
          </Button>
        )}

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <FileBarChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Marketing Audit Report</h1>
                <p className="text-slate-600">Share this report with your clients to sell your services</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/40 backdrop-blur-sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" className="bg-white/40 backdrop-blur-sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share Report
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <Card className="mb-6 bg-white/40 backdrop-blur-sm border-white/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">Overall Score</h3>
              <p className="text-5xl font-bold text-slate-900">{overallScore}%</p>
            </div>
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg ${
              overallScore >= 70 ? 'bg-gradient-to-br from-green-400 to-green-600' :
              overallScore >= 40 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
              'bg-gradient-to-br from-red-400 to-red-600'
            }`}>
              {overallScore}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Categories */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {categories.map((category, index) => (
            <Card key={index} className="bg-white/40 backdrop-blur-sm border-white/30">
              <CardContent className="pt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">{category.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-slate-900">{category.score}%</span>
                  <Badge
                    variant="outline"
                    className={`${
                      category.score >= 70
                        ? 'bg-green-500/20 text-green-700 border-green-300'
                        : category.score >= 40
                        ? 'bg-orange-500/20 text-orange-700 border-orange-300'
                        : 'bg-red-500/20 text-red-700 border-red-300'
                    }`}
                  >
                    {category.score >= 70 ? 'Good' : category.score >= 40 ? 'Fair' : 'Poor'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-6 bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">No category data available for this audit.</p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Sections */}
      <div className="space-y-6">
        {auditData?.details?.map((section, index) => (
          <Card key={index} className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{section.title}</span>
                <Badge 
                  variant="outline" 
                  className={`${
                    section.score >= 70
                      ? 'bg-green-500/20 text-green-700 border-green-300'
                      : section.score >= 40
                      ? 'bg-orange-500/20 text-orange-700 border-orange-300'
                      : 'bg-red-500/20 text-red-700 border-red-300'
                  }`}
                >
                  {section.score}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {section.description && (
                <p className="text-slate-700 mb-4">{section.description}</p>
              )}
              {section.items && section.items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.items.map((item, itemIndex) => (
                    <div 
                      key={itemIndex} 
                      className={`p-4 rounded-lg border ${
                        item.passed 
                          ? 'bg-green-500/10 border-green-300' 
                          : 'bg-red-500/10 border-red-300'
                      }`}
                    >
                      <h4 className="font-semibold text-slate-900 mb-2">
                        {item.passed ? '✅' : '❌'} {item.title}
                      </h4>
                      <p className="text-sm text-slate-700">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* If no detailed sections exist */}
        {(!auditData?.details || auditData.details.length === 0) && (
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300">
            <CardContent className="pt-6 text-center">
              <FileBarChart className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Detailed Analysis Coming Soon</h3>
              <p className="text-slate-700">
                Run a full audit to see detailed analysis for Business Details, Tech Stack, 
                Google Business Profile, Listings, Online Reputation, and SEO.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
