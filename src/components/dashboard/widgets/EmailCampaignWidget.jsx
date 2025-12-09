// ============================================================================
// EMAIL CAMPAIGN WIDGET - Quick actions for email marketing
// ============================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Plus, 
  FileText, 
  PlayCircle, 
  BarChart3,
  Send,
  Clock,
  Users,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { emailService } from '@/services/emailService';
import { createPageUrl } from '@/utils';

export default function EmailCampaignWidget({ onNavigate }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    drafts: 0,
    scheduled: 0,
    sent: 0,
    totalSent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const campaigns = await emailService.campaigns.getAll();
      
      const drafts = campaigns?.filter(c => c.status === 'draft').length || 0;
      const scheduled = campaigns?.filter(c => c.status === 'scheduled').length || 0;
      const sent = campaigns?.filter(c => c.status === 'sent').length || 0;
      const totalSent = campaigns?.reduce((acc, c) => acc + (c.total_sent || 0), 0) || 0;
      
      setStats({ drafts, scheduled, sent, totalSent });
    } catch (error) {
      console.error('Error loading email stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'new-campaign',
      label: 'New Campaign',
      icon: Plus,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
      description: 'Create a new email campaign'
    },
    {
      id: 'drafts',
      label: 'Drafts',
      icon: FileText,
      color: 'bg-slate-500 hover:bg-slate-600',
      textColor: 'text-slate-600',
      bgLight: 'bg-slate-50',
      count: stats.drafts,
      description: 'Continue editing'
    },
    {
      id: 'ongoing',
      label: 'Scheduled',
      icon: Clock,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
      count: stats.scheduled,
      description: 'Upcoming campaigns'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      color: 'bg-purple-500 hover:bg-purple-600',
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
      description: 'View performance'
    }
  ];

  const handleAction = (actionId) => {
    // Navigate to marketing tools with email campaign section
    if (onNavigate) {
      onNavigate('marketing-tools');
    } else {
      // Fallback: navigate to Dashboard and set state
      navigate(createPageUrl('Dashboard'), { 
        state: { 
          activeSection: 'marketing-tools',
          emailTab: actionId === 'new-campaign' ? 'campaigns' : 
                   actionId === 'drafts' ? 'drafts' :
                   actionId === 'ongoing' ? 'campaigns' :
                   'analytics'
        } 
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-slate-700">Email Campaigns</span>
        </div>
        {stats.totalSent > 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <TrendingUp className="w-3 h-3 mr-1" />
            {stats.totalSent.toLocaleString()} sent
          </Badge>
        )}
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`relative p-4 rounded-xl ${action.bgLight} border border-transparent hover:border-${action.textColor.split('-')[1]}-200 transition-all hover:shadow-md group text-left`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center text-white shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
                {action.count !== undefined && action.count > 0 && (
                  <Badge className="bg-white/80 text-slate-700 shadow-sm">
                    {action.count}
                  </Badge>
                )}
              </div>
              <div className="mt-3">
                <p className={`font-semibold ${action.textColor}`}>{action.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
              </div>
              <ArrowRight className={`absolute bottom-3 right-3 w-4 h-4 ${action.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </button>
          );
        })}
      </div>

      {/* Quick Stats Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Send className="w-3 h-3 text-green-500" />
            {stats.sent} sent campaigns
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-500" />
            {stats.scheduled} scheduled
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
          onClick={() => handleAction('analytics')}
        >
          View All
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
