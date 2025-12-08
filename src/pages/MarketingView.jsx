import React from 'react';
import { FileBarChart, Target, Mail, ArrowRight, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MarketingView({ sidebarCollapsed, onNavigate }) {
  const marketingTools = [
    {
      id: 'audit-report',
      title: 'Audit Report',
      description: 'Generate professional marketing audit reports for clients',
      icon: FileBarChart,
      color: 'from-blue-500 to-purple-600',
      bgGradient: 'from-blue-50 to-purple-50',
      borderColor: 'border-blue-300',
      hoverBorder: 'hover:border-blue-500',
      features: [
        'Overall Score Dashboard',
        'SEO & Performance Analysis',
        'Google Business Profile Audit',
        'Online Reputation Tracking',
        'Export to PDF',
        'Share via Email'
      ]
    },
    {
      id: 'prospecting',
      title: 'Prospecting',
      description: 'Manage leads and prospect accounts with AI-powered insights',
      icon: Target,
      color: 'from-green-500 to-teal-600',
      bgGradient: 'from-green-50 to-teal-50',
      borderColor: 'border-green-300',
      hoverBorder: 'hover:border-green-500',
      features: [
        'Lead Management Dashboard',
        'AI-Powered Insights',
        'Conversion Tracking',
        'Business Intelligence',
        'CRM Integration',
        'Automated Follow-ups'
      ]
    },
    {
      id: 'marketing-tools',
      title: 'Marketing Tools',
      description: 'Social media, email campaigns, and ad management',
      icon: Mail,
      color: 'from-orange-500 to-red-600',
      bgGradient: 'from-orange-50 to-red-50',
      borderColor: 'border-orange-300',
      hoverBorder: 'hover:border-orange-500',
      features: [
        'Social Media Planner',
        'Email Marketing Campaigns',
        'Ad Manager (Google/Facebook)',
        'Template Library',
        'Analytics & Reporting',
        'Automation Workflows'
      ]
    }
  ];

  // Navigate to dedicated page when card or dropdown is clicked
  const handleToolClick = (toolId) => {
    if (onNavigate) {
      onNavigate(toolId);
    }
  };

  const handleDropdownSelect = (value) => {
    if (value && value !== 'hub') {
      handleToolClick(value);
    }
  };

  return (
    <div className={`min-h-screen ${sidebarCollapsed ? '' : ''}`}>
      {/* Header with Dropdown Menu */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Marketing Hub</h1>
              <p className="text-slate-600">Choose your marketing tool to get started</p>
            </div>
          </div>

          {/* Dropdown Menu for Quick Navigation */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:inline">Quick Access:</span>
            <Select onValueChange={handleDropdownSelect}>
              <SelectTrigger className="w-[200px] bg-white/60 backdrop-blur-sm border-white/30">
                <SelectValue placeholder="Select a tool" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-white/30">
                <SelectItem value="audit-report">
                  <div className="flex items-center gap-2">
                    <FileBarChart className="w-4 h-4 text-blue-600" />
                    <span>Audit Report</span>
                  </div>
                </SelectItem>
                <SelectItem value="prospecting">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <span>Prospecting</span>
                  </div>
                </SelectItem>
                <SelectItem value="marketing-tools">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span>Marketing Tools</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Marketing Tools Cards - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {marketingTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.id}
              className={`
                relative overflow-hidden cursor-pointer
                transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                bg-gradient-to-br ${tool.bgGradient}
                border-2 ${tool.borderColor}
                ${tool.hoverBorder}
              `}
              onClick={() => handleToolClick(tool.id)}
            >
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${tool.color} blur-3xl`}></div>
              </div>

              <CardHeader className="relative">
                {/* Icon */}
                <div className={`
                  w-16 h-16 rounded-2xl mb-4
                  bg-gradient-to-br ${tool.color}
                  flex items-center justify-center
                  shadow-lg
                `}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                <CardTitle className="text-2xl font-bold text-slate-900">
                  {tool.title}
                </CardTitle>
                <CardDescription className="text-slate-700 font-medium">
                  {tool.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative">
                {/* Features List */}
                <ul className="space-y-2 mb-6">
                  {tool.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-slate-700">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <Button
                  className={`
                    w-full bg-gradient-to-r ${tool.color}
                    hover:opacity-90 text-white font-semibold
                    shadow-md hover:shadow-lg
                    transition-all
                  `}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FileBarChart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">0</p>
                <p className="text-sm text-slate-600">Audit Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">0</p>
                <p className="text-sm text-slate-600">Active Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">0</p>
                <p className="text-sm text-slate-600">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
