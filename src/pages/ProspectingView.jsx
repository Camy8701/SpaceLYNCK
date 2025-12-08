// ============================================================================
// PROSPECTING VIEW - Manage prospect accounts
// ============================================================================
import React, { useState, useEffect } from 'react';
import { Target, Plus, Search, Filter, MoreVertical, CheckCircle2, Circle, Mail, Phone, Globe, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';

export default function ProspectingView({ sidebarCollapsed, onBackToMarketing }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    won: 0,
    avgConversion: 0
  });

  useEffect(() => {
    loadProspects();
  }, [searchQuery, filterStatus]);

  const loadProspects = async () => {
    try {
      setLoading(true);
      
      // Try to fetch prospects from Supabase
      let query = supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,business_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      
      if (error && error.code !== 'PGRST116') {
        console.log('Prospects fetch info:', error);
      }
      
      const prospectData = data || [];
      setProspects(prospectData);
      
      // Calculate stats
      const active = prospectData.filter(p => p.status === 'active').length;
      const won = prospectData.filter(p => p.status === 'won').length;
      const avgConversion = prospectData.length > 0 
        ? Math.round(prospectData.reduce((acc, p) => acc + (p.conversion_rate || 0), 0) / prospectData.length)
        : 0;
      
      setStats({
        total: prospectData.length,
        active,
        won,
        avgConversion
      });
      
    } catch (err) {
      console.error('Error loading prospects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConversionBadge = (rate) => {
    if (rate >= 60) return { label: 'High', color: 'bg-green-500' };
    if (rate >= 40) return { label: 'Moderate', color: 'bg-orange-500' };
    return { label: 'Low', color: 'bg-red-500' };
  };

  return (
    <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
      {/* Header */}
      <div className="mb-8">
        {/* Back Button */}
        {onBackToMarketing && (
          <Button
            variant="ghost"
            onClick={onBackToMarketing}
            className="mb-4 hover:bg-white/30"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketing Hub
          </Button>
        )}

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Prospect Accounts</h1>
                <p className="text-slate-600">Manage all your prospect accounts seamlessly</p>
              </div>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search prospects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/40 backdrop-blur-sm border-white/30"
          />
        </div>
        <Button variant="outline" className="bg-white/40 backdrop-blur-sm border-white/30">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button variant="outline" className="bg-white/40 backdrop-blur-sm border-white/30" onClick={loadProspects}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Total Prospects</p>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Won</p>
            <p className="text-3xl font-bold text-blue-600">{stats.won}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Avg. Conversion</p>
            <p className="text-3xl font-bold text-orange-600">{stats.avgConversion}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-12 pb-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading prospects...</p>
          </CardContent>
        </Card>
      )}

      {/* Prospects List */}
      {!loading && prospects.length > 0 && (
        <div className="space-y-4">
          {prospects.map((prospect) => {
            const conversionBadge = getConversionBadge(prospect.conversion_rate || 0);
            return (
              <Card
                key={prospect.id}
                className="bg-white/40 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all cursor-pointer"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    {/* Left: Business Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                          {(prospect.name || 'P').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{prospect.name || 'Unnamed Prospect'}</h3>
                          <p className="text-sm text-slate-600">{prospect.business_name || ''}</p>
                        </div>
                        <Badge className="ml-2">
                          {prospect.category || prospect.status || 'New'}
                        </Badge>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        {prospect.email && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <Mail className="w-4 h-4" />
                            <span>{prospect.email}</span>
                          </div>
                        )}
                        {prospect.phone && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="w-4 h-4" />
                            <span>{prospect.phone}</span>
                          </div>
                        )}
                        {prospect.website && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <Globe className="w-4 h-4" />
                            <span>{prospect.website}</span>
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      {prospect.location && (
                        <p className="text-sm text-slate-600 mt-2">{prospect.location}</p>
                      )}
                    </div>

                    {/* Right: Conversion & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      {/* Conversion Rate */}
                      <div className="text-right">
                        <p className="text-sm text-slate-600 mb-1">Conversion Rate</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${conversionBadge.color}`}></div>
                          <span className="text-lg font-bold text-slate-900">{prospect.conversion_rate || 0}%</span>
                          <Badge variant="outline" className="text-xs">
                            {conversionBadge.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="bg-white/60">
                          View Report
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur-sm">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                            <DropdownMenuItem>Send Email</DropdownMenuItem>
                            <DropdownMenuItem>Mark as Won</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Last Activity */}
                      {prospect.last_activity && (
                        <p className="text-xs text-slate-500">Last activity: {prospect.last_activity}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State (when no prospects) */}
      {!loading && prospects.length === 0 && (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-12 pb-12 text-center">
            <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No prospects yet</h3>
            <p className="text-slate-600 mb-6">Start by adding your first prospect account</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Prospect
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
