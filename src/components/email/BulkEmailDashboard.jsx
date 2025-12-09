// ============================================================================
// BULK EMAIL DASHBOARD - Main Email Marketing Hub
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  Mail,
  Users,
  FileText,
  BarChart3,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MousePointerClick,
  Eye,
  Plus,
  ArrowRight,
  Sparkles,
  FolderOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import sub-components
import ContactManager from './ContactManager';
import CampaignBuilder from './CampaignBuilder';
import TemplateManager from './TemplateManager';
import EmailAnalytics from './EmailAnalytics';
import ContactListsPage from './ContactListsPage';

// Import services
import { emailService } from '@/services/emailService';

export default function BulkEmailDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    contactCount: 0,
    campaignCount: 0,
    openRate: 0,
    clickRate: 0
  });
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load overall stats
      const overallStats = await emailService.analytics.getOverallStats();
      setStats(overallStats);
      
      // Load recent campaigns
      const campaigns = await emailService.campaigns.getAll();
      setRecentCampaigns(campaigns?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-slate-500',
      scheduled: 'bg-blue-500',
      sending: 'bg-yellow-500',
      sent: 'bg-green-500',
      paused: 'bg-orange-500',
      cancelled: 'bg-red-500',
      failed: 'bg-red-600'
    };
    return colors[status] || 'bg-slate-500';
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: FileText,
      scheduled: Clock,
      sending: Send,
      sent: CheckCircle2,
      paused: AlertCircle,
      cancelled: AlertCircle,
      failed: AlertCircle
    };
    const Icon = icons[status] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Email Marketing</h2>
          <p className="text-white/90">Create, send, and track your email campaigns</p>
        </div>
        <Button 
          onClick={() => setActiveTab('campaigns')}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Contacts</p>
                <p className="text-3xl font-bold text-white">{stats.contactCount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              Active subscribers
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Emails Sent</p>
                <p className="text-3xl font-bold text-white">{stats.totalSent.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-white/90">
              <Mail className="w-4 h-4 mr-1" />
              {stats.campaignCount} campaigns
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Open Rate</p>
                <p className="text-3xl font-bold text-white">{stats.openRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Progress value={parseFloat(stats.openRate)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Click Rate</p>
                <p className="text-3xl font-bold text-white">{stats.clickRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <MousePointerClick className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <Progress value={parseFloat(stats.clickRate)} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/40 backdrop-blur-sm border-white/30 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/60">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-white/60">
            <Send className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-white/60">
            <Users className="w-4 h-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white/60">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white/60">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="lists" className="data-[state=active]:bg-white/60">
            <FolderOpen className="w-4 h-4 mr-2" />
            Contact Lists
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Campaigns */}
            <Card className="lg:col-span-2 bg-white/40 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle className="text-lg">Recent Campaigns</CardTitle>
                <CardDescription>Your latest email campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {recentCampaigns.length > 0 ? (
                  <div className="space-y-4">
                    {recentCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between p-4 bg-white/60 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                        onClick={() => setActiveTab('campaigns')}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg ${getStatusColor(campaign.status)} flex items-center justify-center text-white`}>
                            {getStatusIcon(campaign.status)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{campaign.name}</p>
                            <p className="text-sm text-white/90">{campaign.subject}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="capitalize">
                            {campaign.status}
                          </Badge>
                          <p className="text-sm text-white/80 mt-1">
                            {campaign.total_sent > 0 ? `${campaign.total_sent} sent` : 'Not sent'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-white/90 mx-auto mb-4" />
                    <p className="text-white/90 mb-4">No campaigns yet</p>
                    <Button onClick={() => setActiveTab('campaigns')}>
                      Create Your First Campaign
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/40 backdrop-blur-sm border-white/30">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/60 hover:bg-white/80"
                  onClick={() => setActiveTab('campaigns')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/60 hover:bg-white/80"
                  onClick={() => setActiveTab('contacts')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Import Contacts
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/60 hover:bg-white/80"
                  onClick={() => setActiveTab('templates')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Template
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/60 hover:bg-white/80"
                  onClick={() => setActiveTab('analytics')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started Guide */}
          {stats.campaignCount === 0 && (
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Getting Started with Email Marketing
                </CardTitle>
                <CardDescription>Follow these steps to send your first campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <p className="font-medium text-white">Add Contacts</p>
                      <p className="text-sm text-white/90">Import CSV or sync from prospects</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <p className="font-medium text-white">Upload Template</p>
                      <p className="text-sm text-white/90">Add your Canva HTML design</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <p className="font-medium text-white">Create Campaign</p>
                      <p className="text-sm text-white/90">Set up your email campaign</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                      <p className="font-medium text-white">Send or Schedule</p>
                      <p className="text-sm text-white/90">Launch your campaign</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <CampaignBuilder onCampaignCreated={loadDashboardData} />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <ContactManager 
            onContactsUpdated={loadDashboardData} 
            onNavigateToLists={() => setActiveTab('lists')}
          />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <EmailAnalytics campaigns={recentCampaigns} stats={stats} />
        </TabsContent>

        {/* Contact Lists Tab */}
        <TabsContent value="lists">
          <ContactListsPage onBack={() => setActiveTab('contacts')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
