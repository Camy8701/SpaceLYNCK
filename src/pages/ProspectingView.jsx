// ============================================================================
// PROSPECTING VIEW - Find and manage business prospects
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Search,
  Filter,
  MapPin,
  Globe,
  Mail,
  Phone,
  Building2,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ArrowLeft,
  Loader2,
  FileText,
  UserPlus,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ProspectDetailPage from './ProspectDetailPage';

export default function ProspectingView({ sidebarCollapsed, onBackToMarketing }) {
  const [activeView, setActiveView] = useState('search'); // 'search', 'list', 'detail'
  const [selectedProspect, setSelectedProspect] = useState(null);

  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    niche1: '',
    niche2: '',
    niche3: '',
    country: '',
    city: '',
    area: '',
    name: '',
    website: ''
  });

  // Prospects state
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    won: 0
  });

  useEffect(() => {
    loadProspects();
    loadStats();
  }, []);

  const loadProspects = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProspects(data || []);
    } catch (error) {
      console.error('Error loading prospects:', error);
      toast.error('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('prospects')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const statusCounts = (data || []).reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      setStats({
        total: data?.length || 0,
        new: statusCounts.new || 0,
        contacted: statusCounts.contacted || 0,
        won: statusCounts.won || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = async () => {
    // For now, this filters existing prospects
    // In the future, this will call a web scraping API
    try {
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('prospects')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (searchFilters.name) {
        query = query.or(`business_name.ilike.%${searchFilters.name}%,contact_name.ilike.%${searchFilters.name}%`);
      }
      if (searchFilters.website) {
        query = query.ilike('website', `%${searchFilters.website}%`);
      }
      if (searchFilters.country) {
        query = query.ilike('country', `%${searchFilters.country}%`);
      }
      if (searchFilters.city) {
        query = query.ilike('city', `%${searchFilters.city}%`);
      }
      if (searchFilters.area) {
        query = query.ilike('state', `%${searchFilters.area}%`);
      }

      // Niche filtering (any of the 3 niches)
      const niches = [searchFilters.niche1, searchFilters.niche2, searchFilters.niche3].filter(n => n);
      if (niches.length > 0) {
        // Search in niche array
        const nicheConditions = niches.map(n => `niche.cs.{${n}}`).join(',');
        query = query.or(nicheConditions);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setProspects(data || []);
      toast.success(`Found ${data?.length || 0} prospects`);
    } catch (error) {
      console.error('Error searching prospects:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleAddToList = async (prospect) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a "General" list if it doesn't exist
      let { data: generalList, error: listError } = await supabase
        .from('prospect_lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'General')
        .single();

      if (listError || !generalList) {
        const { data: newList, error: createError } = await supabase
          .from('prospect_lists')
          .insert({
            user_id: user.id,
            name: 'General',
            description: 'Default list for all prospects',
            color: '#3b82f6'
          })
          .select()
          .single();

        if (createError) throw createError;
        generalList = newList;
      }

      // Add prospect to the list
      const { error: memberError } = await supabase
        .from('prospect_list_members')
        .insert({
          list_id: generalList.id,
          prospect_id: prospect.id
        });

      if (memberError) {
        if (memberError.code === '23505') {
          toast.info('Prospect already in General list');
        } else {
          throw memberError;
        }
      } else {
        toast.success('Added to General list');
      }
    } catch (error) {
      console.error('Error adding to list:', error);
      toast.error('Failed to add to list');
    }
  };

  const handleGenerateAudit = async (prospect) => {
    try {
      toast.info('Generating audit report...');

      // Navigate to prospect detail page which will trigger audit generation
      setSelectedProspect(prospect);
      setActiveView('detail');
    } catch (error) {
      console.error('Error generating audit:', error);
      toast.error('Failed to generate audit');
    }
  };

  const handleAuditLater = async (prospect) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add activity
      await supabase
        .from('prospect_activities')
        .insert({
          prospect_id: prospect.id,
          user_id: user.id,
          activity_type: 'note_added',
          description: 'Marked for audit later'
        });

      toast.success('Marked for audit later');
    } catch (error) {
      console.error('Error marking audit later:', error);
      toast.error('Failed to save');
    }
  };

  const clearFilters = () => {
    setSearchFilters({
      niche1: '',
      niche2: '',
      niche3: '',
      country: '',
      city: '',
      area: '',
      name: '',
      website: ''
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { label: 'New', color: 'bg-blue-500' },
      contacted: { label: 'Contacted', color: 'bg-yellow-500' },
      qualified: { label: 'Qualified', color: 'bg-purple-500' },
      proposal: { label: 'Proposal', color: 'bg-orange-500' },
      won: { label: 'Won', color: 'bg-green-500' },
      lost: { label: 'Lost', color: 'bg-red-500' }
    };
    return badges[status] || badges.new;
  };

  if (activeView === 'detail' && selectedProspect) {
    return (
      <ProspectDetailPage
        prospect={selectedProspect}
        onBack={() => {
          setActiveView('search');
          setSelectedProspect(null);
          loadProspects();
          loadStats();
        }}
        sidebarCollapsed={sidebarCollapsed}
      />
    );
  }

  return (
    <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
      {/* Header */}
      <div className="mb-8">
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Prospect Accounts</h1>
              <p className="text-white/90">Find and manage your business prospects</p>
            </div>
          </div>
        </div>
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
            <p className="text-sm text-slate-600 mb-1">New</p>
            <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Contacted</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.contacted}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Won</p>
            <p className="text-3xl font-bold text-green-600">{stats.won}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Filters */}
      <Card className="bg-white/40 backdrop-blur-sm border-white/30 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Find Prospects
              </CardTitle>
              <CardDescription>Search by niche, location, name, or website</CardDescription>
            </div>
            {Object.values(searchFilters).some(v => v) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Niche 1
              </label>
              <Input
                placeholder="e.g., restaurant, plumber, dentist"
                value={searchFilters.niche1}
                onChange={(e) => setSearchFilters({ ...searchFilters, niche1: e.target.value })}
                className="bg-white/60"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Niche 2
              </label>
              <Input
                placeholder="e.g., italian food, lawyer"
                value={searchFilters.niche2}
                onChange={(e) => setSearchFilters({ ...searchFilters, niche2: e.target.value })}
                className="bg-white/60"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Niche 3
              </label>
              <Input
                placeholder="e.g., coffee shop, salon"
                value={searchFilters.niche3}
                onChange={(e) => setSearchFilters({ ...searchFilters, niche3: e.target.value })}
                className="bg-white/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Country
              </label>
              <Input
                placeholder="e.g., USA, Germany"
                value={searchFilters.country}
                onChange={(e) => setSearchFilters({ ...searchFilters, country: e.target.value })}
                className="bg-white/60"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                City
              </label>
              <Input
                placeholder="e.g., New York, Berlin"
                value={searchFilters.city}
                onChange={(e) => setSearchFilters({ ...searchFilters, city: e.target.value })}
                className="bg-white/60"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                State/Area
              </label>
              <Input
                placeholder="e.g., California, Bavaria"
                value={searchFilters.area}
                onChange={(e) => setSearchFilters({ ...searchFilters, area: e.target.value })}
                className="bg-white/60"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Business Name
              </label>
              <Input
                placeholder="Search by name"
                value={searchFilters.name}
                onChange={(e) => setSearchFilters({ ...searchFilters, name: e.target.value })}
                className="bg-white/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Website
              </label>
              <Input
                placeholder="e.g., example.com"
                value={searchFilters.website}
                onChange={(e) => setSearchFilters({ ...searchFilters, website: e.target.value })}
                className="bg-white/60"
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            disabled={searching}
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Prospects
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Prospects List */}
      {loading ? (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading prospects...</p>
          </CardContent>
        </Card>
      ) : prospects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prospects.map((prospect) => {
            const statusBadge = getStatusBadge(prospect.status);
            return (
              <Card
                key={prospect.id}
                className="bg-white/40 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedProspect(prospect);
                  setActiveView('detail');
                }}
              >
                <CardContent className="pt-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {prospect.business_name}
                      </h3>
                      {prospect.contact_name && (
                        <p className="text-sm text-slate-600">{prospect.contact_name}</p>
                      )}
                    </div>
                    <Badge className={`${statusBadge.color} text-white`}>
                      {statusBadge.label}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    {prospect.website && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <span className="truncate">{prospect.website}</span>
                      </div>
                    )}
                    {prospect.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="truncate">{prospect.email}</span>
                      </div>
                    )}
                    {prospect.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span>{prospect.phone}</span>
                      </div>
                    )}
                    {(prospect.city || prospect.country) && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>
                          {[prospect.city, prospect.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Niches */}
                  {prospect.niche && prospect.niche.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {prospect.niche.slice(0, 3).map((n, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-white/60 hover:bg-white/80"
                      onClick={() => handleAddToList(prospect)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add to List
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={() => handleGenerateAudit(prospect)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Generate Audit
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuditLater(prospect);
                    }}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Audit Later
                  </Button>

                  {/* Audit Status */}
                  {prospect.audit_generated && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Audit Score</span>
                        <span className="font-bold text-green-600">{prospect.audit_score}/100</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-12 pb-12 text-center">
            <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No prospects found</h3>
            <p className="text-slate-600 mb-6">
              Use the search filters above to find prospects or add them manually
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Prospect Manually
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
