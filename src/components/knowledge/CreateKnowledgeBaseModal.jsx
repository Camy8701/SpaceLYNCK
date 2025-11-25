import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, File, X } from "lucide-react";
import { toast } from "sonner";

const ICON_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
];

export default function CreateKnowledgeBaseModal({ open, onOpenChange, onSuccess }) {
  const [name, setName] = useState('');
  const [iconColor, setIconColor] = useState('#3b82f6');
  const [files, setFiles] = useState([]);
  const [pastedContent, setPastedContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      
      // Create knowledge base
      const kb = await base44.entities.KnowledgeBase.create({
        name,
        icon_color: iconColor
      });

      // Upload files
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.KnowledgeFile.create({
          knowledge_base_id: kb.id,
          filename: file.name,
          file_url,
          file_size: file.size,
          content_text: '' // Would need extraction in production
        });
      }

      // If pasted content, create a text file entry
      if (pastedContent.trim()) {
        await base44.entities.KnowledgeFile.create({
          knowledge_base_id: kb.id,
          filename: 'Pasted Content.txt',
          file_url: '',
          file_size: pastedContent.length,
          content_text: pastedContent
        });
      }

      return kb;
    },
    onSuccess: () => {
      setIsUploading(false);
      queryClient.invalidateQueries(['knowledgeBases']);
      toast.success('Knowledge Base created!');
      setName('');
      setIconColor('#3b82f6');
      setFiles([]);
      setPastedContent('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      setIsUploading(false);
      toast.error('Failed to create knowledge base');
    }
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Knowledge Base Name</Label>
            <Input
              placeholder="Enter name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Icon Color</Label>
            <div className="flex gap-2">
              {ICON_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setIconColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    iconColor === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-600 mb-1">Drag files here</p>
            <p className="text-slate-400 text-sm mb-3">or click to select files</p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".pdf,.docx,.txt,.md"
            />
            <Button variant="outline" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Files
              </label>
            </Button>
            <p className="text-xs text-slate-400 mt-3">Supported: PDF, DOCX, TXT, MD</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <File className="w-4 h-4 text-slate-500" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
                  <button onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>OR paste text/content:</Label>
            <Textarea
              placeholder="Paste your content here..."
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || isUploading}
          >
            {isUploading ? 'Creating...' : 'Create Knowledge Base'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}