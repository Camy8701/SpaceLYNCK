import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, File, Search, Trash2, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeBaseDetail({ kb, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const { data: files = [] } = useQuery({
    queryKey: ['kbFiles', kb.id],
    queryFn: async () => {
      return await base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return await base44.entities.KnowledgeFile.create({
        knowledge_base_id: kb.id,
        filename: file.name,
        file_url,
        file_size: file.size,
        content_text: ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['kbFiles', kb.id]);
      toast.success('File uploaded!');
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
                  className={`flex items-center gap-3 p-3 rounded-lg ${index % 2 === 0 ? 'bg-slate-50' : ''}`}
                >
                  <File className="w-5 h-5 text-slate-500" />
                  <span className="flex-1 text-sm font-medium truncate">{file.filename}</span>
                  <span className="text-sm text-slate-400">{formatFileSize(file.file_size)}</span>
                  {file.file_url && (
                    <a 
                      href={file.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
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
    </div>
  );
}