// ============================================================================
// EMAIL ANALYTICS - Track and visualize email campaign performance
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  Send,
  AlertTriangle,
  Users,
  Mail,
  ArrowUp,
  ArrowDown,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import { emailService } from '@/services/emailService';

export default function EmailAnalytics({ campaigns = [], stats = {} }) {
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [campaignAnalytics, setCampaignAnalytics] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  useEffect(() => {
    if (selectedCampaign && selectedCampaign !== 'all') {
      loadCampaignAnalytics(selectedCampaign);
    }
  }, [selectedCampaign]);

  const loadCampaignAnalytics = async (campaignId) => {
    try {
      setLoading(true);
      const [analytics, timeSeries] = await Promise.all([
        emailService.campaigns.getAnalytics(campaignId),
        emailService.analytics.getTimeSeriesData(campaignId, dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90)
      ]);
      setCampaignAnalytics(analytics);
      setTimeSeriesData(timeSeries);
    } catch (error) {
      console.error('Error loading campaign analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default data when no real data is available
  const defaultTimeSeriesData = [
    { date: 'Mon', opens: 0, clicks: 0 },
    { date: 'Tue', opens: 0, clicks: 0 },
    { date: 'Wed', opens: 0, clicks: 0 },
    { date: 'Thu', opens: 0, clicks: 0 },
    { date: 'Fri', opens: 0, clicks: 0 },
    { date: 'Sat', opens: 0, clicks: 0 },
    { date: 'Sun', opens: 0, clicks: 0 }
  ];

  const deliveryData = [
    { name: 'Delivered', value: stats.totalSent || 0, color: '#22c55e' },
    { name: 'Bounced', value: stats.totalBounced || 0, color: '#ef4444' },
    { name: 'Pending', value: 0, color: '#f59e0b' }
  ];

  const engagementData = [
    { name: 'Opened', value: stats.totalOpened || 0 },
    { name: 'Clicked', value: stats.totalClicked || 0 },
    { name: 'Unopened', value: Math.max(0, (stats.totalSent || 0) - (stats.totalOpened || 0)) }
  ];

  const COLORS = ['#3b82f6', '#22c55e', '#94a3b8'];

  // Top performing campaigns
  const topCampaigns = campaigns
    .filter(c => c.status === 'sent' && c.total_sent > 0)
    .sort((a, b) => (b.open_rate || 0) - (a.open_rate || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Email Analytics</h3>
          <p className="text-white/90">Track your email campaign performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px] bg-white/60">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.filter(c => c.status === 'sent').map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-white/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Emails Sent"
          value={stats.totalSent?.toLocaleString() || '0'}
          icon={Send}
          color="blue"
          trend={12}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Open Rate"
          value={`${stats.openRate || 0}%`}
          icon={Eye}
          color="green"
          trend={5.2}
          trendLabel="vs industry avg"
        />
        <MetricCard
          title="Click Rate"
          value={`${stats.clickRate || 0}%`}
          icon={MousePointerClick}
          color="purple"
          trend={2.8}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Bounce Rate"
          value={`${stats.totalSent > 0 ? ((stats.totalBounced || 0) / stats.totalSent * 100).toFixed(1) : 0}%`}
          icon={AlertTriangle}
          color="orange"
          trend={-1.2}
          trendLabel="vs last period"
          invertTrend
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opens & Clicks Over Time */}
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle className="text-lg">Opens & Clicks Over Time</CardTitle>
            <CardDescription>Daily engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData.length > 0 ? timeSeriesData : defaultTimeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="opens"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    name="Opens"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 2 }}
                    name="Clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Status */}
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle className="text-lg">Delivery Status</CardTitle>
            <CardDescription>Email delivery breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deliveryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deliveryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Funnel */}
      <Card className="bg-white/40 backdrop-blur-sm border-white/30">
        <CardHeader>
          <CardTitle className="text-lg">Engagement Funnel</CardTitle>
          <CardDescription>How recipients interact with your emails</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FunnelStep
              label="Emails Sent"
              value={stats.totalSent || 0}
              percentage={100}
              color="bg-blue-500"
            />
            <FunnelStep
              label="Delivered"
              value={(stats.totalSent || 0) - (stats.totalBounced || 0)}
              percentage={stats.totalSent > 0 ? (((stats.totalSent || 0) - (stats.totalBounced || 0)) / stats.totalSent * 100) : 0}
              color="bg-green-500"
            />
            <FunnelStep
              label="Opened"
              value={stats.totalOpened || 0}
              percentage={parseFloat(stats.openRate) || 0}
              color="bg-purple-500"
            />
            <FunnelStep
              label="Clicked"
              value={stats.totalClicked || 0}
              percentage={parseFloat(stats.clickRate) || 0}
              color="bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Campaigns */}
      {topCampaigns.length > 0 && (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Campaigns</CardTitle>
            <CardDescription>Campaigns with highest engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCampaigns.map((campaign, index) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 bg-white/60 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-slate-400' :
                      index === 2 ? 'bg-orange-400' : 'bg-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{campaign.name}</p>
                      <p className="text-sm text-white/90">{campaign.total_sent} recipients</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-white/90">Open Rate</p>
                      <p className="text-lg font-bold text-green-600">{campaign.open_rate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/90">Click Rate</p>
                      <p className="text-lg font-bold text-blue-600">{campaign.click_rate}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Benchmarks */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Industry Benchmarks</CardTitle>
          <CardDescription>Compare your performance to industry averages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BenchmarkCard
              metric="Open Rate"
              yourValue={parseFloat(stats.openRate) || 0}
              benchmark={21.5}
              unit="%"
            />
            <BenchmarkCard
              metric="Click Rate"
              yourValue={parseFloat(stats.clickRate) || 0}
              benchmark={2.3}
              unit="%"
            />
            <BenchmarkCard
              metric="Bounce Rate"
              yourValue={stats.totalSent > 0 ? ((stats.totalBounced || 0) / stats.totalSent * 100) : 0}
              benchmark={0.7}
              unit="%"
              invertComparison
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, color, trend, trendLabel, invertTrend }) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-600',
    green: 'bg-green-500/20 text-green-600',
    purple: 'bg-purple-500/20 text-purple-600',
    orange: 'bg-orange-500/20 text-orange-600'
  };

  const isPositive = invertTrend ? trend < 0 : trend > 0;

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-white/30">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              <span className="font-medium">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <p className="text-sm text-white/90 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {trendLabel && (
          <p className="text-xs text-white/80 mt-1">{trendLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Funnel Step Component
function FunnelStep({ label, value, percentage, color }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm font-medium text-white">{label}</div>
      <div className="flex-1">
        <div className="h-8 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="w-24 text-right">
        <span className="font-bold text-white">{value.toLocaleString()}</span>
        <span className="text-sm text-white/80 ml-1">({percentage.toFixed(1)}%)</span>
      </div>
    </div>
  );
}

// Benchmark Card Component
function BenchmarkCard({ metric, yourValue, benchmark, unit, invertComparison }) {
  const difference = yourValue - benchmark;
  const isAboveBenchmark = invertComparison ? difference < 0 : difference > 0;
  
  return (
    <div className="text-center p-4 bg-white rounded-lg">
      <p className="text-sm text-white/90 mb-2">{metric}</p>
      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span className="text-3xl font-bold text-white">{yourValue.toFixed(1)}</span>
        <span className="text-white/90">{unit}</span>
      </div>
      <div className={`inline-flex items-center gap-1 text-sm ${isAboveBenchmark ? 'text-green-600' : 'text-red-600'}`}>
        {isAboveBenchmark ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{Math.abs(difference).toFixed(1)}{unit} {isAboveBenchmark ? 'above' : 'below'} avg</span>
      </div>
      <p className="text-xs text-white/80 mt-1">Industry avg: {benchmark}{unit}</p>
    </div>
  );
}
