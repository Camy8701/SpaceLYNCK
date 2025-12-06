import React from 'react';
import { ArrowLeft, FileBarChart, Download, Share2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AuditReportView({ onBack, sidebarCollapsed }) {
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
            <Button variant="outline" className="bg-white/40 backdrop-blur-sm">
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
              <p className="text-5xl font-bold text-slate-900">65%</p>
            </div>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              65%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { name: 'Business Details', score: 0, color: 'red' },
          { name: 'Techno Stack', score: 80, color: 'green' },
          { name: 'Google Business Profile', score: 100, color: 'green' },
          { name: 'Listings', score: 14, color: 'red' },
          { name: 'Online Reputation', score: 73, color: 'green' },
          { name: 'Website Performance', score: 90, color: 'green' },
          { name: 'SEO Analysis', score: 100, color: 'green' },
        ].map((category, index) => (
          <Card key={index} className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardContent className="pt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">{category.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-slate-900">{category.score}%</span>
                <Badge
                  variant="outline"
                  className={`${
                    category.color === 'green'
                      ? 'bg-green-500/20 text-green-700 border-green-300'
                      : category.color === 'orange'
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

      {/* Detailed Sections */}
      <div className="space-y-6">
        {/* Business Details Section */}
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Business Details</span>
              <Badge variant="outline" className="bg-red-500/20 text-red-700 border-red-300">
                0%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 mb-4">
              Evaluate critical business contact details that customers use to find and connect with your business.
              Accurate and consistent information across all touchpoints builds trust and improves customer accessibility.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-300">
                <h4 className="font-semibold text-slate-900 mb-2">❌ Chat Widget on Website</h4>
                <p className="text-sm text-slate-700">
                  We detected that your Business website does not have an active Chat Widget enabled.
                </p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-300">
                <h4 className="font-semibold text-slate-900 mb-2">❌ Website Hosting</h4>
                <p className="text-sm text-slate-700">
                  We couldn't detect your website hosted on any major providers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Techno Stack Section */}
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Techno Stack Analysis</span>
              <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-300">
                80%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 mb-4">
              Evaluate the foundational tools driving your online marketing efforts. A robust digital marketing infrastructure
              is crucial for measuring performance, understanding your audience, and maximizing ROI.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-300">
                <h4 className="font-semibold text-slate-900 mb-2">✅ Google Tag Manager</h4>
                <p className="text-sm text-slate-700">
                  Great job implementing Google Tag Manager! Efficient tag management.
                </p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-300">
                <h4 className="font-semibold text-slate-900 mb-2">✅ Google Analytics Pixel</h4>
                <p className="text-sm text-slate-700">
                  We've detected Google Analytics on your site. Data-driven decisions.
                </p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-300">
                <h4 className="font-semibold text-slate-900 mb-2">❌ Facebook Pixel</h4>
                <p className="text-sm text-slate-700">
                  The Facebook Pixel is not detected on your site. Missing optimization opportunities.
                </p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-300">
                <h4 className="font-semibold text-slate-900 mb-2">✅ Google Ads Pixel</h4>
                <p className="text-sm text-slate-700">
                  The Google Ads conversion tracking pixel is present on your site.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Sections */}
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300">
          <CardContent className="pt-6 text-center">
            <FileBarChart className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">More Sections Coming Soon!</h3>
            <p className="text-slate-700">
              Additional audit sections for Google Business Profile, Listings, Online Reputation,
              Website Performance, and SEO Analysis will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
