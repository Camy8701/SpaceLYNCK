import React, { useState } from 'react';
import { Target, Plus, Search, Filter, MoreVertical, CheckCircle2, Circle, Mail, Phone, Globe, ArrowLeft } from 'lucide-react';
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

export default function ProspectingView({ sidebarCollapsed, onBackToMarketing }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data - will be replaced with real Base44 data
  const prospects = [
    {
      id: 1,
      name: 'DJ-Technik.de',
      businessName: 'DJ-Technik.de (Lighthouse e. K.)',
      email: 'info@dj-technik.de',
      phone: '+49661380980',
      website: 'dj-technik.de',
      location: 'Petersberg, Hessen, 36100',
      status: 'active',
      conversionRate: 65,
      category: 'Prospecting Open',
      lastActivity: '2 days ago'
    },
    {
      id: 2,
      name: 'ACTIV Lichtwerbung',
      businessName: 'ACTIV Lichtwerbung - Leuchtreklame & Werbetec...',
      email: 'info@activ-lichtwerbung.de',
      phone: '+497151276558',
      website: 'activ-lichtwerbung.de',
      location: 'Kernen im Remstal, Baden-Württemberg, 71394',
      status: 'active',
      conversionRate: 45,
      category: 'Prospecting Open',
      lastActivity: '5 days ago'
    }
  ];

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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Total Prospects</p>
            <p className="text-3xl font-bold text-slate-900">{prospects.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600">{prospects.filter(p => p.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Won</p>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </CardContent>
        </Card>
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Avg. Conversion</p>
            <p className="text-3xl font-bold text-orange-600">55%</p>
          </CardContent>
        </Card>
      </div>

      {/* Prospects List */}
      <div className="space-y-4">
        {prospects.map((prospect) => {
          const conversionBadge = getConversionBadge(prospect.conversionRate);
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
                        {prospect.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{prospect.name}</h3>
                        <p className="text-sm text-slate-600">{prospect.businessName}</p>
                      </div>
                      <Badge className="ml-2">
                        {prospect.category}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Mail className="w-4 h-4" />
                        <span>{prospect.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-4 h-4" />
                        <span>{prospect.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Globe className="w-4 h-4" />
                        <span>{prospect.website}</span>
                      </div>
                    </div>

                    {/* Location */}
                    <p className="text-sm text-slate-600 mt-2">{prospect.location}</p>
                  </div>

                  {/* Right: Conversion & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Conversion Rate */}
                    <div className="text-right">
                      <p className="text-sm text-slate-600 mb-1">Conversion Rate</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${conversionBadge.color}`}></div>
                        <span className="text-lg font-bold text-slate-900">{prospect.conversionRate}%</span>
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
                    <p className="text-xs text-slate-500">Last activity: {prospect.lastActivity}</p>
                  </div>
                </div>

                {/* Getting Started Checklist (for new prospects) */}
                {prospect.id === 1 && (
                  <div className="mt-4 pt-4 border-t border-white/30">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Getting Started (2/5)</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Prospect Account Generated</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Download/Share your first report</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Circle className="w-4 h-4" />
                        <span>Start sending prospect to CRM</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Circle className="w-4 h-4" />
                        <span>Capture leads from your site</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Circle className="w-4 h-4" />
                        <span>Auto-discover leads with AI</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State (when no prospects) */}
      {prospects.length === 0 && (
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
