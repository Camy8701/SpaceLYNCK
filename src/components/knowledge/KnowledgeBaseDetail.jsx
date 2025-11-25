import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, File, Search, Trash2, ExternalLink, Upload, Loader2, BookOpen, ChevronDown, ChevronRight, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';

export default function KnowledgeBaseDetail({ kb, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const queryClient = useQueryClient();

  const { data: files = [] } = useQuery({
    queryKey: ['kbFiles', kb.id],
    queryFn: async () => {
      return await base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id }, '-created_date');
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      toast.info('Uploading ' + file.name + '...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const kbFile = await base44.entities.KnowledgeFile.create({
        knowledge_base_id: kb.id,
        filename: file.name,
        file_url,
        file_size: file.size,
        content_text: '',
        extraction_status: 'processing'
      });

      try {
        toast.info('Extracting and organizing content...');
        const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              full_text: { type: "string", description: "Complete text content" }
            }
          }
        });

        if (extraction.status === 'success' && extraction.output?.full_text) {
          const organized = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze and organize this document into logical sections with clear titles. Extract key information.

Document: ${file.name}
Content: ${extraction.output.full_text.substring(0, 8000)}

Return organized sections:`,
            response_json_schema: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Brief 2-3 sentence summary" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      content: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          await base44.entities.KnowledgeFile.update(kbFile.id, {
            content_text: extraction.output.full_text,
            summary: organized.summary,
            sections: organized.sections,
            extraction_status: 'completed'
          });
        } else {
          await base44.entities.KnowledgeFile.update(kbFile.id, { extraction_status: 'failed' });
        }
      } catch (err) {
        console.error('Extraction error:', err);
        await base44.entities.KnowledgeFile.update(kbFile.id, { extraction_status: 'failed' });
      }

      return kbFile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['kbFiles', kb.id]);
      toast.success('File uploaded and processed!');
    },
    onError: (err) => {
      toast.error('Upload failed: ' + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.KnowledgeFile.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['kbFiles', kb.id]);
      setSelectedFile(null);
      toast.success('File deleted');
    }
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const filesContent = files.map(f => `File: ${f.filename}\nContent: ${f.content_text || 'No text content'}`).join('\n\n');
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the following knowledge base content, answer this question: "${searchQuery}"\n\nKnowledge Base Content:\n${filesContent}`,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            relevant_files: { type: "array", items: { type: "string" } }
          }
        }
      });
      setSearchResult(response);
    } catch (error) {
      toast.error('Search failed');
    }
    setIsSearching(false);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(file => uploadMutation.mutate(file));
  }, [uploadMutation]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    selectedFiles.forEach(file => uploadMutation.mutate(file));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getBookEmoji = (color) => {
    const colorMap = {
      '#3b82f6': '📘',
      '#10b981': '📗',
      '#f59e0b': '📙',
      '#ef4444': '📕',
      '#8b5cf6': '📔',
      '#ec4899': '📓'
    };
    return colorMap[color] || '📘';
  };

  const handleFileDoubleClick = (file) => {
    if (file.extraction_status === 'completed') {
      setSelectedFile(file);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="p-6 lg:p-10">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Knowledge Base
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">{getBookEmoji(kb.icon_color)}</span>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              {kb.name}
            </h1>
            <p className="text-white/70 text-sm">{files.length} document{files.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Main Layout - Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Document Library */}
          <div className="lg:col-span-4">
            <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-white/30">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Document Library
                  </h2>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="add-file"
                    accept=".pdf,.docx,.txt,.md"
                  />
                  <Button asChild size="sm" variant="outline" className="h-8 bg-white/50 border-white/40 hover:bg-white/70">
                    <label htmlFor="add-file" className="cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </label>
                  </Button>
                </div>
                
                {/* Compact Search in Sidebar */}
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-white/60 border-white/40 text-slate-800 placeholder:text-slate-400"
                  />
                </form>
              </div>

              {/* Document List */}
              <ScrollArea className="h-[400px]">
                <div className="p-2">
                  {files.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 text-sm">No documents yet</p>
                  ) : (
                    files.map((file) => (
                      <div 
                        key={file.id} 
                        onDoubleClick={() => handleFileDoubleClick(file)}
                        onClick={() => setSelectedFile(file)}
                        className={`p-3 rounded-xl cursor-pointer transition-all mb-2 ${
                          selectedFile?.id === file.id 
                            ? 'bg-blue-100/80 border border-blue-200' 
                            : 'hover:bg-white/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            file.extraction_status === 'completed' 
                              ? 'bg-blue-100' 
                              : file.extraction_status === 'processing' 
                                ? 'bg-amber-100' 
                                : 'bg-slate-100'
                          }`}>
                            {file.extraction_status === 'processing' ? (
                              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                            ) : (
                              <FileText className={`w-5 h-5 ${file.extraction_status === 'completed' ? 'text-blue-600' : 'text-slate-400'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{file.filename}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">{formatFileSize(file.file_size)}</span>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {file.created_date ? format(new Date(file.created_date), 'MMM d') : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Search Bar - Top */}
            <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-5">
              <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search within this knowledge base
              </h2>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Ask a question or search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-white/60 border-white/40 text-slate-800 placeholder:text-slate-400"
                />
                <Button type="submit" disabled={isSearching} className="bg-blue-500 hover:bg-blue-600">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </form>

              {searchResult && (
                <div className="mt-4 p-4 bg-white/70 rounded-xl border border-white/40">
                  <p className="text-slate-700">{searchResult.answer}</p>
                  {searchResult.relevant_files?.length > 0 && (
                    <p className="text-sm text-slate-500 mt-2">
                      Related files: {searchResult.relevant_files.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Upload Area */}
            <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">Upload Documents</h2>
                <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600">
                  <label htmlFor="add-file-main" className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Add File
                  </label>
                </Button>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="add-file-main"
                  accept=".pdf,.docx,.txt,.md"
                />
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 transition-all ${
                  isDragging 
                    ? 'border-blue-400 bg-blue-50/50' 
                    : 'border-slate-200/60 hover:border-slate-300/80'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">Drop files here to upload</span>
                  <span className="text-xs">PDF, DOCX, TXT, MD supported</span>
                </div>
              </div>
            </div>

            {/* Document Viewer */}
            {selectedFile && (
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-white/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-slate-800">{selectedFile.filename}</h3>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(selectedFile.file_size)} • Added {selectedFile.created_date ? format(new Date(selectedFile.created_date), 'PPP') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFile.file_url && (
                      <a 
                        href={selectedFile.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white/60 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button 
                      onClick={() => {
                        if(confirm('Delete this file?')) deleteMutation.mutate(selectedFile.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="p-5">
                    {selectedFile.extraction_status === 'processing' ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <p>Processing document...</p>
                      </div>
                    ) : selectedFile.extraction_status === 'failed' ? (
                      <div className="text-center py-12 text-slate-400">
                        <p>Failed to extract content from this file.</p>
                        <a 
                          href={selectedFile.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline mt-2 inline-block"
                        >
                          Open original file
                        </a>
                      </div>
                    ) : (
                      <>
                        {selectedFile.summary && (
                          <div className="mb-6 p-4 bg-blue-50/80 rounded-xl border border-blue-100/50">
                            <h4 className="font-semibold text-blue-900 mb-2 text-sm">Summary</h4>
                            <p className="text-blue-800 text-sm">{selectedFile.summary}</p>
                          </div>
                        )}

                        {selectedFile.sections?.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-slate-700 text-sm">Document Sections</h4>
                            {selectedFile.sections.map((section, idx) => (
                              <div key={idx} className="border border-slate-200/60 rounded-xl overflow-hidden bg-white/50">
                                <button
                                  onClick={() => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                  className="w-full flex items-center justify-between p-3 hover:bg-white/70 transition-colors"
                                >
                                  <span className="font-medium text-slate-700 text-sm">{section.title || `Section ${idx + 1}`}</span>
                                  {expandedSections[idx] ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                {expandedSections[idx] && (
                                  <div className="p-4 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-200/60 bg-slate-50/50">
                                    {section.content}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : selectedFile.content_text ? (
                          <div>
                            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Full Content</h4>
                            <div className="text-sm text-slate-600 whitespace-pre-wrap bg-white/60 p-4 rounded-xl border border-slate-200/40">
                              {selectedFile.content_text}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-center py-8">No extracted content available</p>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Empty State when no file selected */}
            {!selectedFile && files.length > 0 && (
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-600 font-medium mb-1">Select a document</h3>
                <p className="text-sm text-slate-400">Click or double-click a document from the library to view its contents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}