import React, { useState } from 'react';
import { ArrowLeft, Mail, Calendar, Megaphone, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketingToolsView({ onBack, sidebarCollapsed }) {
  const [activeTab, setActiveTab] = useState('social');

  return (
    <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
      {/* Header with Back Button */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 hover:bg-white/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketing Hub
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Marketing Tools</h1>
            <p className="text-slate-600">Manage your social media, email campaigns, and ads</p>
          </div>
        </div>
      </div>

      {/* Tabs for Different Tools */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/40 backdrop-blur-sm border-white/30 mb-6">
          <TabsTrigger value="social" className="data-[state=active]:bg-white/60">
            Social Planner
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-white/60">
            Email Marketing
          </TabsTrigger>
          <TabsTrigger value="ads" className="data-[state=active]:bg-white/60">
            Ad Manager
          </TabsTrigger>
        </TabsList>

        {/* Social Planner Tab */}
        <TabsContent value="social">
          <Card className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardHeader>
              <CardTitle>Social Media Planner</CardTitle>
              <CardDescription>
                Schedule and manage posts across multiple social media platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Social Platforms */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Connect Your Accounts</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: 'Facebook', icon: '📘', connected: false },
                      { name: 'Instagram', icon: '📷', connected: false },
                      { name: 'Twitter', icon: '🐦', connected: false },
                      { name: 'LinkedIn', icon: '💼', connected: false },
                      { name: 'TikTok', icon: '🎵', connected: false },
                      { name: 'YouTube', icon: '📺', connected: false },
                      { name: 'Pinterest', icon: '📌', connected: false },
                      { name: 'Threads', icon: '🧵', connected: false },
                    ].map((platform) => (
                      <Button
                        key={platform.name}
                        variant="outline"
                        className="bg-white/60 hover:bg-white/80 justify-start"
                      >
                        <span className="text-2xl mr-2">{platform.icon}</span>
                        {platform.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <Calendar className="w-8 h-8 text-blue-600 mb-3" />
                      <h4 className="font-semibold text-slate-900 mb-2">Content Calendar</h4>
                      <p className="text-sm text-slate-700">
                        Plan and visualize your social media content schedule
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
                      <h4 className="font-semibold text-slate-900 mb-2">Bulk Upload</h4>
                      <p className="text-sm text-slate-700">
                        Upload multiple posts at once via CSV for efficient scheduling
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <Megaphone className="w-8 h-8 text-orange-600 mb-3" />
                      <h4 className="font-semibold text-slate-900 mb-2">Automation</h4>
                      <p className="text-sm text-slate-700">
                        Set up recurring posts and evergreen content queues
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Coming Soon */}
                <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-300">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">🚀 Full Social Planner Coming Soon!</h3>
                  <p className="text-slate-700">
                    The complete social media planning interface with calendar view, post composer,
                    analytics, and multi-platform scheduling will be available soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Marketing Tab */}
        <TabsContent value="email">
          <Card className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardHeader>
              <CardTitle>Email Marketing</CardTitle>
              <CardDescription>
                Create, send, and track email campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Campaigns', value: '0', icon: Mail },
                    { label: 'Emails Sent', value: '0', icon: TrendingUp },
                    { label: 'Open Rate', value: '0%', icon: Calendar },
                    { label: 'Click Rate', value: '0%', icon: Megaphone },
                  ].map((stat, index) => (
                    <Card key={index} className="bg-white/60">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <stat.icon className="w-5 h-5 text-slate-600" />
                          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                        <p className="text-sm text-slate-600">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">📧 Campaign Builder</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        Create beautiful email campaigns with our drag-and-drop editor
                      </p>
                      <Button variant="outline" size="sm">Create Campaign</Button>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">📋 Template Library</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        Choose from pre-designed templates or create your own
                      </p>
                      <Button variant="outline" size="sm">Browse Templates</Button>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">👥 Contact Lists</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        Manage and segment your email subscribers
                      </p>
                      <Button variant="outline" size="sm">Manage Lists</Button>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">📊 Analytics</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        Track opens, clicks, and campaign performance
                      </p>
                      <Button variant="outline" size="sm">View Analytics</Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Coming Soon */}
                <div className="mt-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-300">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">📬 Full Email Marketing Platform Coming Soon!</h3>
                  <p className="text-slate-700">
                    Complete email marketing features including automation, A/B testing, advanced segmentation,
                    and detailed analytics will be available soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ad Manager Tab */}
        <TabsContent value="ads">
          <Card className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardHeader>
              <CardTitle>Ad Manager</CardTitle>
              <CardDescription>
                Manage Google Ads, Facebook Ads, and LinkedIn campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Ad Platforms */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Connect Ad Accounts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: 'Google Ads', icon: '🔍', color: 'from-blue-500 to-blue-600' },
                      { name: 'Facebook Ads', icon: '📘', color: 'from-blue-600 to-blue-700' },
                      { name: 'LinkedIn Ads', icon: '💼', color: 'from-blue-700 to-blue-800' },
                    ].map((platform) => (
                      <Card key={platform.name} className={`bg-gradient-to-br ${platform.color}`}>
                        <CardContent className="pt-6 text-white">
                          <div className="text-4xl mb-3">{platform.icon}</div>
                          <h4 className="font-semibold mb-2">{platform.name}</h4>
                          <Button variant="secondary" size="sm" className="w-full">
                            Connect Account
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">🎯 Campaign Management</h4>
                      <p className="text-sm text-slate-700">
                        Create and manage ad campaigns across multiple platforms from one place
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">📈 Performance Tracking</h4>
                      <p className="text-sm text-slate-700">
                        Monitor ROI, conversions, and campaign performance in real-time
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">💰 Budget Management</h4>
                      <p className="text-sm text-slate-700">
                        Set and control ad spend across all your advertising platforms
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-slate-900 mb-2">🔔 Alerts & Insights</h4>
                      <p className="text-sm text-slate-700">
                        Get notified about campaign performance and optimization opportunities
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Coming Soon */}
                <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border-2 border-green-300">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">🚀 Full Ad Manager Coming Soon!</h3>
                  <p className="text-slate-700">
                    Complete ad management platform with campaign creation, audience targeting,
                    bid optimization, and advanced analytics will be available soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
