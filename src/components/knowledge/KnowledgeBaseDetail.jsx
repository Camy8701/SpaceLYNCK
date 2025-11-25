import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, File, Search, Trash2, ExternalLink, Upload, Loader2, BookOpen, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      return await base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      toast.info('Uploading ' + file.name + '...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create file record first
      const kbFile = await base44.entities.KnowledgeFile.create({
        knowledge_base_id: kb.id,
        filename: file.name,
        file_url,
        file_size: file.size,
        content_text: '',
        extraction_status: 'processing'
      });

      // Extract and organize content
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
          // Use AI to organize content into sections
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

  return (
    <div className="min-h-screen bg-slate-100 lg:ml-[280px]">
      <div className="p-6 lg:p-10">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Knowledge Base
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">{getBookEmoji(kb.icon_color)}</span>
          <h1 className="text-2xl font-bold text-slate-900">{kb.name}</h1>
        </div>

        {/* Files Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Files in this knowledge base</h2>
            <div>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="add-file"
                accept=".pdf,.docx,.txt,.md"
              />
              <Button asChild size="sm">
                <label htmlFor="add-file" className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Add File
                </label>
              </Button>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 mb-4 transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Drop files here to upload</span>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-2">
            {files.length === 0 ? (
              <p className="text-center text-slate-400 py-4">No files yet</p>
            ) : (
              files.map((file, index) => (
                <div 
                  key={file.id} 
                  className={`p-3 rounded-lg ${index % 2 === 0 ? 'bg-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-slate-500" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{file.filename}</span>
                      {file.summary && (
                        <p className="text-xs text-slate-500 truncate">{file.summary}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{formatFileSize(file.file_size)}</span>
                    {file.extraction_status === 'processing' && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {file.extraction_status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(file)}
                        className="text-blue-500 hover:text-blue-700 h-8"
                      >
                        <BookOpen className="w-4 h-4 mr-1" /> View
                      </Button>
                    )}
                    {file.file_url && (
                      <a 
                        href={file.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-500"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button 
                      onClick={() => deleteMutation.mutate(file.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search within this knowledge base
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Ask a question or search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {searchResult && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-700">{searchResult.answer}</p>
              {searchResult.relevant_files?.length > 0 && (
                <p className="text-sm text-slate-500 mt-2">
                  Related files: {searchResult.relevant_files.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedFile?.filename}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            {selectedFile?.summary && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                <p className="text-blue-800 text-sm">{selectedFile.summary}</p>
              </div>
            )}

            {selectedFile?.sections?.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Document Sections</h3>
                {selectedFile.sections.map((section, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <span className="font-medium text-slate-800">{section.title || `Section ${idx + 1}`}</span>
                      {expandedSections[idx] ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    {expandedSections[idx] && (
                      <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap border-t border-slate-200">
                        {section.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedFile?.content_text ? (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Full Content</h3>
                <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                  {selectedFile.content_text}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No extracted content available</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}