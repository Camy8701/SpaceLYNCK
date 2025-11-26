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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
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
      setUploadProgress(0);
      setCurrentFileIndex(0);
      
      const totalSteps = files.length + (pastedContent.trim() ? 1 : 0) + 1; // +1 for KB creation
      let completedSteps = 0;
      
      // Create knowledge base
      const kb = await base44.entities.KnowledgeBase.create({
        name,
        icon_color: iconColor
      });
      completedSteps++;
      setUploadProgress(Math.round((completedSteps / totalSteps) * 100));

      // Upload files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.KnowledgeFile.create({
          knowledge_base_id: kb.id,
          filename: file.name,
          file_url,
          file_size: file.size,
          content_text: '' // Would need extraction in production
        });
        completedSteps++;
        setUploadProgress(Math.round((completedSteps / totalSteps) * 100));
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
        completedSteps++;
        setUploadProgress(100);
      }

      return kb;
    },
    onSuccess: () => {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentFileIndex(0);
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
      setUploadProgress(0);
      setCurrentFileIndex(0);
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
      <DialogContent className="sm:max-w-[500px] bg-black/90 backdrop-blur-xl border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Create Knowledge Base</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="text-white/80 text-sm">Knowledge Base Name</Label>
            <Input
              placeholder="Enter name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80 text-sm">Icon Color</Label>
            <div className="flex gap-3">
              {ICON_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setIconColor(c)}
                  className={`w-9 h-9 rounded-full transition-all hover:scale-110 ${
                    iconColor === c ? 'ring-2 ring-offset-2 ring-offset-black/90 ring-white scale-110' : ''
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
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/30 hover:border-white/50'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-white/50" />
            <p className="text-white/80 mb-1">Drag files here</p>
            <p className="text-white/40 text-sm mb-3">or click to select files</p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".pdf,.docx,.txt,.md"
            />
            <Button variant="outline" asChild className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Files
              </label>
            </Button>
            <p className="text-xs text-white/40 mt-3">Supported: PDF, DOCX, TXT, MD</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/10">
                  <File className="w-4 h-4 text-white/60" />
                  <span className="flex-1 text-sm truncate text-white/90">{file.name}</span>
                  <span className="text-xs text-white/50">{formatFileSize(file.size)}</span>
                  <button onClick={() => removeFile(index)} className="text-white/40 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">
                  {currentFileIndex > 0 ? `Uploading file ${currentFileIndex} of ${files.length}...` : 'Creating knowledge base...'}
                </span>
                <span className="text-emerald-400 font-semibold">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-white/80 text-sm">OR paste text/content:</Label>
            <Textarea
              placeholder="Paste your content here..."
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              rows={4}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || isUploading}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/20"
          >
            {isUploading ? `Creating... ${uploadProgress}%` : 'Create Knowledge Base'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}