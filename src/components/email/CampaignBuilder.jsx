// ============================================================================
// CAMPAIGN BUILDER - Create, schedule, and manage email campaigns
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  Send,
  Clock,
  Plus,
  FileText,
  Users,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Copy,
  ArrowLeft,
  Mail,
  Sparkles,
  Settings,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { emailService } from '@/services/emailService';
import toast from 'react-hot-toast';

export default function CampaignBuilder({ onCampaignCreated }) {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View states
  const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'preview'
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    from_name: '',
    from_email: '',
    reply_to: '',
    preview_text: '',
    template_id: '',
    html_content: '',
    recipient_type: 'all',
    recipient_list_id: '',
    track_opens: true,
    track_clicks: true,
    scheduled_at: ''
  });
  
  // Step state for wizard
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignsData, templatesData, listsData] = await Promise.all([
        emailService.campaigns.getAll(),
        emailService.templates.getAll(),
        emailService.lists.getAll()
      ]);
      setCampaigns(campaignsData || []);
      setTemplates(templatesData || []);
      setLists(listsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.subject || !formData.from_name || !formData.from_email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const campaign = await emailService.campaigns.create(formData);
      toast.success('Campaign created successfully');
      setView('list');
      resetForm();
      loadData();
      onCampaignCreated?.();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return;

    try {
      await emailService.campaigns.update(selectedCampaign.id, formData);
      toast.success('Campaign updated successfully');
      setView('list');
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleScheduleCampaign = async (campaignId, scheduledAt) => {
    try {
      await emailService.campaigns.schedule(campaignId, scheduledAt);
      toast.success('Campaign scheduled successfully');
      loadData();
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      toast.error('Failed to schedule campaign');
    }
  };

  const handleSendNow = async (campaignId) => {
    if (!confirm('Are you sure you want to send this campaign now?')) return;

    try {
      await emailService.campaigns.sendNow(campaignId);
      toast.success('Campaign is being sent');
      loadData();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign');
    }
  };

  const handlePauseCampaign = async (campaignId) => {
    try {
      await emailService.campaigns.pause(campaignId);
      toast.success('Campaign paused');
      loadData();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    }
  };

  const handleResumeCampaign = async (campaignId) => {
    try {
      await emailService.campaigns.resume(campaignId);
      toast.success('Campaign resumed');
      loadData();
    } catch (error) {
      console.error('Error resuming campaign:', error);
      toast.error('Failed to resume campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await emailService.campaigns.delete(campaignId);
      toast.success('Campaign deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const handleDuplicateCampaign = async (campaignId) => {
    try {
      await emailService.campaigns.duplicate(campaignId);
      toast.success('Campaign duplicated');
      loadData();
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error('Failed to duplicate campaign');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      from_name: '',
      from_email: '',
      reply_to: '',
      preview_text: '',
      template_id: '',
      html_content: '',
      recipient_type: 'all',
      recipient_list_id: '',
      track_opens: true,
      track_clicks: true,
      scheduled_at: ''
    });
    setStep(1);
    setSelectedCampaign(null);
  };

  const openEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name || '',
      subject: campaign.subject || '',
      from_name: campaign.from_name || '',
      from_email: campaign.from_email || '',
      reply_to: campaign.reply_to || '',
      preview_text: campaign.preview_text || '',
      template_id: campaign.template_id || '',
      html_content: campaign.html_content || '',
      recipient_type: campaign.recipient_type || 'all',
      recipient_list_id: campaign.recipient_list_id || '',
      track_opens: campaign.track_opens ?? true,
      track_clicks: campaign.track_clicks ?? true,
      scheduled_at: campaign.scheduled_at || ''
    });
    setView('edit');
  };

  const handleTemplateSelect = (templateId) => {
    if (templateId === 'none') {
      setFormData(prev => ({
        ...prev,
        template_id: '',
        html_content: ''
      }));
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        template_id: templateId,
        html_content: template.html_content,
        subject: prev.subject || template.subject
      }));
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
      paused: Pause,
      cancelled: AlertCircle,
      failed: AlertCircle
    };
    return icons[status] || FileText;
  };

  // Render campaign list view
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Campaigns</h3>
            <p className="text-slate-600">Create and manage your email campaigns</p>
          </div>
          <Button onClick={() => setView('create')}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Campaign List */}
        {campaigns.length > 0 ? (
          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const StatusIcon = getStatusIcon(campaign.status);
              return (
                <Card key={campaign.id} className="bg-white/40 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg ${getStatusColor(campaign.status)} flex items-center justify-center text-white`}>
                          <StatusIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{campaign.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{campaign.subject}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="capitalize">
                              {campaign.status}
                            </Badge>
                            {campaign.scheduled_at && campaign.status === 'scheduled' && (
                              <span className="text-sm text-slate-500 flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(campaign.scheduled_at).toLocaleString()}
                              </span>
                            )}
                            {campaign.total_sent > 0 && (
                              <span className="text-sm text-slate-500">
                                {campaign.total_sent} sent • {campaign.open_rate}% opened
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.status === 'draft' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditCampaign(campaign)}>
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <ScheduleDialog
                              onSchedule={(date) => handleScheduleCampaign(campaign.id, date)}
                              onSendNow={() => handleSendNow(campaign.id)}
                            />
                          </>
                        )}
                        {campaign.status === 'scheduled' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handlePauseCampaign(campaign.id)}>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </Button>
                          </>
                        )}
                        {campaign.status === 'paused' && (
                          <Button size="sm" variant="outline" onClick={() => handleResumeCampaign(campaign.id)}>
                            <Play className="w-4 h-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setView('preview')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign.id)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {campaign.status === 'draft' && (
                              <DropdownMenuItem onClick={() => openEditCampaign(campaign)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardContent className="py-12 text-center">
              <Mail className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns yet</h3>
              <p className="text-slate-600 mb-6">Create your first email campaign to get started</p>
              <Button onClick={() => setView('create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Render create/edit campaign wizard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => { setView('list'); resetForm(); }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {view === 'edit' ? 'Edit Campaign' : 'Create Campaign'}
          </h3>
          <p className="text-slate-600">
            Step {step} of {totalSteps}: {
              step === 1 ? 'Basic Info' :
              step === 2 ? 'Content' :
              step === 3 ? 'Recipients' :
              'Review & Send'
            }
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-blue-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Set up the basic information for your campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., December Newsletter"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject">Email Subject Line *</Label>
              <Input
                id="subject"
                placeholder="e.g., Your Weekly Update is Here!"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="preview_text">Preview Text</Label>
              <Input
                id="preview_text"
                placeholder="Text shown in email preview"
                value={formData.preview_text}
                onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                This appears next to your subject line in the inbox
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from_name">From Name *</Label>
                <Input
                  id="from_name"
                  placeholder="Your Name or Company"
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="from_email">From Email *</Label>
                <Input
                  id="from_email"
                  type="email"
                  placeholder="hello@yourcompany.com"
                  value={formData.from_email}
                  onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reply_to">Reply-To Email</Label>
              <Input
                id="reply_to"
                type="email"
                placeholder="Same as from email if empty"
                value={formData.reply_to}
                onChange={(e) => setFormData({ ...formData, reply_to: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Content */}
      {step === 2 && (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
            <CardDescription>Select a template or paste your HTML</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label>Choose a Template</Label>
              <Select
                value={formData.template_id}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template (custom HTML)</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* HTML Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="html_content">HTML Content</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setView('preview')}
                  disabled={!formData.html_content}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              </div>
              <Textarea
                id="html_content"
                placeholder="Paste your HTML email content here..."
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Tip: Export your Canva design as HTML and paste it here
              </p>
            </div>

            {/* Personalization Help */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Personalization Variables
              </h4>
              <p className="text-sm text-blue-700 mb-2">
                Use these variables in your content to personalize emails:
              </p>
              <div className="flex flex-wrap gap-2">
                {['{{first_name}}', '{{last_name}}', '{{full_name}}', '{{email}}', '{{company}}'].map((variable) => (
                  <code
                    key={variable}
                    className="px-2 py-1 bg-blue-100 rounded text-sm cursor-pointer hover:bg-blue-200"
                    onClick={() => navigator.clipboard.writeText(variable)}
                  >
                    {variable}
                  </code>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Recipients */}
      {step === 3 && (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle>Select Recipients</CardTitle>
            <CardDescription>Choose who will receive this campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Send To</Label>
              <Select
                value={formData.recipient_type}
                onValueChange={(v) => setFormData({ ...formData, recipient_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="list">Specific List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.recipient_type === 'list' && (
              <div>
                <Label>Select List</Label>
                <Select
                  value={formData.recipient_list_id}
                  onValueChange={(v) => setFormData({ ...formData, recipient_list_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a list" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.contact_count} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tracking Options */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-slate-900 mb-4">Tracking Options</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">Track Opens</p>
                    <p className="text-sm text-slate-500">Track when recipients open your email</p>
                  </div>
                  <Switch
                    checked={formData.track_opens}
                    onCheckedChange={(v) => setFormData({ ...formData, track_opens: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">Track Clicks</p>
                    <p className="text-sm text-slate-500">Track when recipients click links</p>
                  </div>
                  <Switch
                    checked={formData.track_clicks}
                    onCheckedChange={(v) => setFormData({ ...formData, track_clicks: v })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardHeader>
            <CardTitle>Review & Send</CardTitle>
            <CardDescription>Review your campaign before sending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Campaign Name</span>
                <span className="font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Subject</span>
                <span className="font-medium">{formData.subject}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">From</span>
                <span className="font-medium">{formData.from_name} &lt;{formData.from_email}&gt;</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Recipients</span>
                <span className="font-medium capitalize">{formData.recipient_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Tracking</span>
                <span className="font-medium">
                  {formData.track_opens && 'Opens'}{formData.track_opens && formData.track_clicks && ', '}
                  {formData.track_clicks && 'Clicks'}
                </span>
              </div>
            </div>

            {/* Schedule Options */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-3">When to Send?</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Schedule Date & Time (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Leave empty to save as draft
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => step > 1 ? setStep(step - 1) : (setView('list'), resetForm())}
        >
          {step > 1 ? 'Previous' : 'Cancel'}
        </Button>
        <div className="flex gap-2">
          {step < totalSteps && (
            <Button onClick={() => setStep(step + 1)}>
              Next
            </Button>
          )}
          {step === totalSteps && (
            <>
              <Button
                variant="outline"
                onClick={view === 'edit' ? handleUpdateCampaign : handleCreateCampaign}
              >
                Save as Draft
              </Button>
              {formData.scheduled_at && (
                <Button
                  onClick={async () => {
                    if (view === 'edit') {
                      await handleUpdateCampaign();
                      await handleScheduleCampaign(selectedCampaign.id, formData.scheduled_at);
                    } else {
                      const campaign = await emailService.campaigns.create(formData);
                      await handleScheduleCampaign(campaign.id, formData.scheduled_at);
                      setView('list');
                      resetForm();
                      loadData();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule Campaign
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Schedule Dialog Component
function ScheduleDialog({ onSchedule, onSendNow }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="w-4 h-4 mr-1" />
        Send
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Campaign</DialogTitle>
          <DialogDescription>Choose when to send your campaign</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Schedule for later</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="outline"
            onClick={() => {
              if (date) {
                onSchedule(date);
                setOpen(false);
              }
            }}
            disabled={!date}
          >
            <Clock className="w-4 h-4 mr-1" />
            Schedule
          </Button>
          <Button
            onClick={() => {
              onSendNow();
              setOpen(false);
            }}
          >
            <Send className="w-4 h-4 mr-1" />
            Send Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
