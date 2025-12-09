// ============================================================================
// TEMPLATE MANAGER - Upload and manage Canva HTML templates
// ============================================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Code,
  Image,
  Copy,
  Download,
  Search,
  Grid,
  List,
  X,
  Check,
  Sparkles,
  Palette
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    html_content: '',
    category: 'general',
    source: 'canva'
  });
  
  // Upload state
  const [uploadMethod, setUploadMethod] = useState('paste'); // 'paste', 'file', 'url'
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await emailService.templates.getAll(
        categoryFilter !== 'all' ? categoryFilter : null
      );
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.html_content) {
      toast.error('Please fill in name and HTML content');
      return;
    }

    try {
      await emailService.templates.create(formData);
      toast.success('Template created successfully');
      setShowUploadModal(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await emailService.templates.update(selectedTemplate.id, formData);
      toast.success('Template updated successfully');
      setShowEditModal(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await emailService.templates.delete(id);
      toast.success('Template deleted');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      await emailService.templates.create({
        ...template,
        name: `${template.name} (Copy)`,
        id: undefined,
        created_at: undefined,
        updated_at: undefined
      });
      toast.success('Template duplicated');
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      toast.error('Please upload an HTML file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        html_content: event.target.result,
        name: prev.name || file.name.replace(/\.(html|htm)$/, '')
      }));
      toast.success('HTML file loaded');
    };
    reader.readAsText(file);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subject: '',
      html_content: '',
      category: 'general',
      source: 'canva'
    });
    setSelectedTemplate(null);
    setUploadMethod('paste');
  };

  const openEditModal = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      subject: template.subject || '',
      html_content: template.html_content,
      category: template.category || 'general',
      source: template.source || 'custom'
    });
    setShowEditModal(true);
  };

  const openPreviewModal = (template) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const getCategoryBadge = (category) => {
    const badges = {
      newsletter: { label: 'Newsletter', color: 'bg-blue-500' },
      promotional: { label: 'Promotional', color: 'bg-green-500' },
      transactional: { label: 'Transactional', color: 'bg-purple-500' },
      general: { label: 'General', color: 'bg-slate-500' }
    };
    return badges[category] || badges.general;
  };

  const filteredTemplates = templates.filter(template => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return template.name.toLowerCase().includes(query) ||
             template.description?.toLowerCase().includes(query);
    }
    return true;
  });

  // Predefined template examples
  const sampleTemplates = [
    {
      id: 'sample-1',
      name: 'Simple Newsletter',
      description: 'Clean and simple newsletter template',
      category: 'newsletter',
      preview: '📰'
    },
    {
      id: 'sample-2',
      name: 'Product Announcement',
      description: 'Announce new products or features',
      category: 'promotional',
      preview: '🚀'
    },
    {
      id: 'sample-3',
      name: 'Welcome Email',
      description: 'Welcome new subscribers',
      category: 'transactional',
      preview: '👋'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Email Templates</h3>
          <p className="text-white/90">Upload and manage your Canva HTML templates</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/40 backdrop-blur-sm border-white/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/90" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/60"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-white/60">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                className="rounded-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className="rounded-none"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid/List */}
      {filteredTemplates.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const categoryBadge = getCategoryBadge(template.category);
              return (
                <Card
                  key={template.id}
                  className="bg-white/40 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all overflow-hidden group"
                >
                  {/* Preview Area */}
                  <div
                    className="h-40 bg-slate-100 relative cursor-pointer"
                    onClick={() => openPreviewModal(template)}
                  >
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-white/90 mx-auto mb-2" />
                          <p className="text-sm text-white/80">Click to preview</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </div>
                  
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-white">{template.name}</h4>
                        <p className="text-sm text-white/90 mt-1 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openPreviewModal(template)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(template)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge className={`${categoryBadge.color} text-white text-xs`}>
                        {categoryBadge.label}
                      </Badge>
                      {template.source === 'canva' && (
                        <Badge variant="outline" className="text-xs">
                          <Palette className="w-3 h-3 mr-1" />
                          Canva
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white/40 backdrop-blur-sm border-white/30">
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredTemplates.map((template) => {
                  const categoryBadge = getCategoryBadge(template.category);
                  return (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 hover:bg-white/40 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white/90" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{template.name}</h4>
                          <p className="text-sm text-white/90">
                            {template.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={`${categoryBadge.color} text-white`}>
                          {categoryBadge.label}
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openPreviewModal(template)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(template)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="bg-white/40 backdrop-blur-sm border-white/30">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates yet</h3>
            <p className="text-slate-600 mb-6">Upload your first email template to get started</p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Canva Integration Guide */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Palette className="w-5 h-5 text-purple-600" />
            How to Export from Canva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-purple-900">
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Open your email design in Canva</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Click <strong>Share</strong> → <strong>More</strong> → <strong>HTML embed</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Copy the HTML code or download the HTML file</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>Paste it here or upload the file</span>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-white/60 rounded-lg">
            <p className="text-sm text-purple-800">
              <Sparkles className="w-4 h-4 inline mr-1" />
              <strong>Tip:</strong> Use {"{{first_name}}"} and other variables in your Canva design for personalization!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Template Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Email Template</DialogTitle>
            <DialogDescription>
              Upload your Canva HTML template or paste the code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Monthly Newsletter"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the template"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="subject">Default Subject Line</Label>
              <Input
                id="subject"
                placeholder="e.g., Your Weekly Update"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            {/* Upload Method Tabs */}
            <Tabs value={uploadMethod} onValueChange={setUploadMethod}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="paste">
                  <Code className="w-4 h-4 mr-2" />
                  Paste HTML
                </TabsTrigger>
                <TabsTrigger value="file">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="mt-4">
                <div>
                  <Label htmlFor="html_content">HTML Content *</Label>
                  <Textarea
                    id="html_content"
                    placeholder="Paste your HTML email code here..."
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="file" className="mt-4">
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-white/90 mx-auto mb-4" />
                  <p className="text-white/90 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-white/80">HTML file exported from Canva</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                {formData.html_content && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800">HTML content loaded</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Preview */}
            {formData.html_content && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Preview</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedTemplate({ html_content: formData.html_content, name: formData.name });
                      setShowPreviewModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Full Preview
                  </Button>
                </div>
                <div className="border rounded-lg h-40 overflow-hidden bg-white">
                  <iframe
                    srcDoc={formData.html_content}
                    title="Template Preview"
                    className="w-full h-full"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!formData.name || !formData.html_content}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update your email template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Template Name *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Input
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_subject">Default Subject Line</Label>
              <Input
                id="edit_subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_html_content">HTML Content *</Label>
              <Textarea
                id="edit_html_content"
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name || 'Template Preview'}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '60vh' }}>
            <iframe
              srcDoc={selectedTemplate?.html_content}
              title="Template Preview"
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
