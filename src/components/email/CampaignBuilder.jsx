// ============================================================================
// CAMPAIGN BUILDER - Create, schedule, and manage email campaigns
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  X,
  FilePenLine,
  Upload,
  FileCode,
  File,
  UserPlus,
  XCircle
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

// PDF.js - load dynamically for PDF extraction
let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  const pdfjs = await import('pdfjs-dist');
  pdfjsLib = pdfjs;
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  return pdfjsLib;
}

export default function CampaignBuilder({ onCampaignCreated, filterStatus = null, showDraftsOnly = false }) {
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
  
  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [draftId, setDraftId] = useState(null);
  
  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const fileInputRef = useRef(null);
  
  // Manual recipients state
  const [manualRecipients, setManualRecipients] = useState([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  
  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Sending state
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterStatus, showDraftsOnly]);

  // Auto-save effect - save draft after 30 seconds of inactivity when in create/edit mode
  useEffect(() => {
    if ((view === 'create' || view === 'edit') && autoSaveEnabled) {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // Set new timer for auto-save
      const timer = setTimeout(async () => {
        if (formData.name && (formData.subject || formData.html_content)) {
          await autoSaveDraft();
        }
      }, 30000); // Auto-save after 30 seconds of inactivity

      setAutoSaveTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [formData, view, autoSaveEnabled]);

  const autoSaveDraft = async () => {
    try {
      if (draftId) {
        // Update existing draft
        await emailService.campaigns.update(draftId, {
          ...formData,
          status: 'draft'
        });
      } else {
        // Create new draft
        const draft = await emailService.campaigns.create({
          ...formData,
          name: formData.name || 'Untitled Draft',
          status: 'draft'
        });
        setDraftId(draft.id);
      }
      setLastAutoSave(new Date());
      // Don't show toast for auto-save to avoid interruption
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // File drag & drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file) => {
    const fileName = file.name.toLowerCase();
    const isHTML = fileName.endsWith('.html') || fileName.endsWith('.htm');
    const isPDF = fileName.endsWith('.pdf');

    if (!isHTML && !isPDF) {
      toast.error('Please upload an HTML or PDF file');
      return;
    }

    setProcessingFile(true);

    try {
      if (isHTML) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({
            ...prev,
            html_content: event.target.result,
            template_id: ''
          }));
          toast.success('HTML file loaded successfully');
          setProcessingFile(false);
        };
        reader.onerror = () => {
          toast.error('Failed to read HTML file');
          setProcessingFile(false);
        };
        reader.readAsText(file);
      } else if (isPDF) {
        await processPDFFile(file);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
      setProcessingFile(false);
    }
  };

  const processPDFFile = async (file) => {
    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${file.name.replace('.pdf', '')}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
    .page { margin-bottom: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    h1, h2, h3 { color: #333; }
    p { color: #666; margin: 10px 0; }
  </style>
</head>
<body>`;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        
        htmlContent += `\n  <div class="page">\n    <p>${pageText.replace(/\n/g, '</p>\n    <p>')}</p>\n  </div>`;
      }
      
      htmlContent += '\n</body>\n</html>';
      
      setFormData(prev => ({
        ...prev,
        html_content: htmlContent,
        template_id: ''
      }));
      
      toast.success(`PDF processed successfully (${pdf.numPages} pages)`);
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Failed to process PDF file');
    } finally {
      setProcessingFile(false);
    }
  };

  // Manual recipient handlers
  const addManualRecipient = () => {
    if (!newRecipientEmail) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Check for duplicates
    if (manualRecipients.some(r => r.email.toLowerCase() === newRecipientEmail.toLowerCase())) {
      toast.error('This email is already added');
      return;
    }
    
    setManualRecipients(prev => [...prev, { email: newRecipientEmail, id: Date.now() }]);
    setNewRecipientEmail('');
  };

  const removeManualRecipient = (id) => {
    setManualRecipients(prev => prev.filter(r => r.id !== id));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignsData, templatesData, listsData] = await Promise.all([
        filterStatus 
          ? emailService.campaigns.getAll(filterStatus)
          : emailService.campaigns.getAll(),
        emailService.templates.getAll(),
        emailService.lists.getAll()
      ]);
      // Filter to drafts only if showDraftsOnly is true
      let filteredCampaigns = campaignsData || [];
      if (showDraftsOnly) {
        filteredCampaigns = filteredCampaigns.filter(c => c.status === 'draft');
      }
      setCampaigns(filteredCampaigns);
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
    setDraftId(null);
    setLastAutoSave(null);
    setManualRecipients([]);
  };

  // Send campaign immediately from review step
  const handleSendImmediately = async () => {
    if (!formData.name || !formData.subject || !formData.from_name || !formData.from_email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!confirm('Are you sure you want to send this campaign now? This action cannot be undone.')) {
      return;
    }

    setIsSending(true);
    try {
      // Create the campaign first if not editing
      let campaignId;
      if (view === 'edit' && selectedCampaign) {
        await emailService.campaigns.update(selectedCampaign.id, formData);
        campaignId = selectedCampaign.id;
      } else {
        const campaign = await emailService.campaigns.create(formData);
        campaignId = campaign.id;
      }
      
      // Send immediately
      await emailService.campaigns.sendNow(campaignId);
      toast.success('Campaign is being sent!');
      setView('list');
      resetForm();
      loadData();
      onCampaignCreated?.();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSending(false);
    }
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
            <h3 className="text-xl font-bold text-white">
              {showDraftsOnly ? 'Draft Campaigns' : 'Campaigns'}
            </h3>
            <p className="text-white/90">
              {showDraftsOnly 
                ? 'Your incomplete campaigns are auto-saved here'
                : 'Create and manage your email campaigns'
              }
            </p>
          </div>
          <Button onClick={() => setView('create')}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Draft Auto-save Info */}
        {showDraftsOnly && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <FilePenLine className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Auto-Save Enabled</p>
                  <p className="text-xs text-blue-700">
                    Incomplete campaigns are automatically saved as drafts after 30 seconds of inactivity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                          <h4 className="font-semibold text-white">{campaign.name}</h4>
                          <p className="text-sm text-white/90 mt-1">{campaign.subject}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="capitalize">
                              {campaign.status}
                            </Badge>
                            {campaign.scheduled_at && campaign.status === 'scheduled' && (
                              <span className="text-sm text-white/80 flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(campaign.scheduled_at).toLocaleString()}
                              </span>
                            )}
                            {campaign.total_sent > 0 && (
                              <span className="text-sm text-white/80">
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
              {showDraftsOnly ? (
                <>
                  <FilePenLine className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No draft campaigns</h3>
                  <p className="text-slate-600 mb-6">Incomplete campaigns will appear here automatically</p>
                  <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Campaign
                  </Button>
                </>
              ) : (
                <>
                  <Mail className="w-12 h-12 text-white/90 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No campaigns yet</h3>
                  <p className="text-white/90 mb-6">Create your first email campaign to get started</p>
                  <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </>
              )}
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
          <h3 className="text-xl font-bold text-white">
            {view === 'edit' ? 'Edit Campaign' : 'Create Campaign'}
          </h3>
          <p className="text-white/90">
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

      {/* Auto-save indicator */}
      {autoSaveEnabled && (view === 'create' || view === 'edit') && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoSaveEnabled}
              onCheckedChange={setAutoSaveEnabled}
              className="scale-75"
            />
            <span className="text-slate-600">Auto-save</span>
          </div>
          {lastAutoSave && (
            <span className="text-slate-500">
              Last saved: {lastAutoSave.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

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
              <p className="text-xs text-white/80 mt-1">
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
            <CardDescription>Select a template, upload a file, or paste your HTML</CardDescription>
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

            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {processingFile ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-700">Processing file...</p>
                </div>
              ) : formData.html_content ? (
                <div className="space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-green-700 font-medium">Content loaded!</p>
                  <p className="text-sm text-slate-500">Drop a new file to replace</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-4">
                    <FileCode className="w-10 h-10 text-blue-400" />
                    <File className="w-10 h-10 text-red-400" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-medium">Drop your HTML or PDF file here</p>
                    <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-300">HTML</Badge>
                    <Badge variant="outline" className="text-red-600 border-red-300">PDF</Badge>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* HTML Content Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="html_content">HTML Content</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPreviewModal(true)}
                  disabled={!formData.html_content}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              </div>
              <Textarea
                id="html_content"
                placeholder="Paste your HTML email content here or drop a file above..."
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Live Preview */}
            {formData.html_content && (
              <div>
                <Label className="mb-2 block">Live Preview</Label>
                <div className="border rounded-xl overflow-hidden bg-white" style={{ height: '300px' }}>
                  <iframe
                    srcDoc={formData.html_content}
                    title="Email Preview"
                    className="w-full h-full"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}

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
                    onClick={() => {
                      navigator.clipboard.writeText(variable);
                      toast.success(`Copied ${variable}`);
                    }}
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
                  <SelectItem value="manual">Manual Selection</SelectItem>
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
                        {list.name} ({list.email_list_contacts?.[0]?.count || 0} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manual Recipients */}
            {formData.recipient_type === 'manual' && (
              <div className="space-y-4">
                <div>
                  <Label>Add Recipients Manually</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addManualRecipient()}
                      className="flex-1"
                    />
                    <Button onClick={addManualRecipient} type="button">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Press Enter or click Add to add each email
                  </p>
                </div>

                {/* Manual Recipients List */}
                {manualRecipients.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Added Recipients ({manualRecipients.length})</Label>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setManualRecipients([])}
                      >
                        Clear All
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-lg p-2 bg-slate-50">
                      <div className="space-y-1">
                        {manualRecipients.map((recipient) => (
                          <div
                            key={recipient.id}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border"
                          >
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-700">{recipient.email}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              onClick={() => removeManualRecipient(recipient.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {manualRecipients.length === 0 && (
                  <div className="text-center py-8 border rounded-lg bg-slate-50">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No recipients added yet</p>
                    <p className="text-xs text-slate-400">Add email addresses above</p>
                  </div>
                )}
              </div>
            )}

            {/* Tracking Options */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-slate-800 mb-4">Tracking Options</h4>
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
        <Card className="bg-white/40 backdrop-blur-sm border-white/30 relative">
          {/* Edit Button - Top Right */}
          <Button
            size="sm"
            variant="outline"
            className="absolute top-4 right-4 border-slate-300"
            onClick={() => setStep(1)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit Campaign
          </Button>
          
          <CardHeader>
            <CardTitle>Review & Send</CardTitle>
            <CardDescription>Review your campaign before sending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4 bg-white/60 rounded-lg p-4">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Campaign Name</span>
                <span className="font-medium text-slate-900">{formData.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Subject</span>
                <span className="font-medium text-slate-900">{formData.subject || 'Not set'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">From</span>
                <span className="font-medium text-slate-900">
                  {formData.from_name && formData.from_email 
                    ? `${formData.from_name} <${formData.from_email}>`
                    : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Recipients</span>
                <span className="font-medium text-slate-900 capitalize">
                  {formData.recipient_type === 'manual' 
                    ? `${manualRecipients.length} manual recipient(s)` 
                    : formData.recipient_type}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Content</span>
                <span className="font-medium text-slate-900">
                  {formData.html_content ? 'HTML content loaded' : 'No content'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Tracking</span>
                <span className="font-medium text-slate-900">
                  {formData.track_opens && 'Opens'}{formData.track_opens && formData.track_clicks && ', '}
                  {formData.track_clicks && 'Clicks'}
                  {!formData.track_opens && !formData.track_clicks && 'Disabled'}
                </span>
              </div>
            </div>

            {/* Email Preview */}
            {formData.html_content && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Email Preview</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPreviewModal(true)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Full Preview
                  </Button>
                </div>
                <div className="border rounded-xl overflow-hidden bg-white" style={{ height: '200px' }}>
                  <iframe
                    srcDoc={formData.html_content}
                    title="Email Preview"
                    className="w-full h-full"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}

            {/* Schedule Options */}
            <div className="bg-slate-100 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-3">Schedule (Optional)</h4>
              <div>
                <Label className="text-slate-700">Schedule Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="mt-1 bg-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave empty to send immediately or save as draft
                </p>
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
              <Button
                onClick={handleSendImmediately}
                disabled={isSending || !formData.name || !formData.subject || !formData.from_email || !formData.html_content}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Now
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Full Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              This is how your email will look to recipients
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '60vh' }}>
            <iframe
              srcDoc={formData.html_content}
              title="Full Email Preview"
              className="w-full h-full"
              sandbox="allow-same-origin"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
