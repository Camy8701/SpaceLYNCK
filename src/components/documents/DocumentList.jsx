import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Trash2, UploadCloud, Eye } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DocumentList({ projectId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      return await base44.entities.ProjectDocument.filter({ project_id: projectId }, '-uploaded_at');
    }
  });

  // Process/Upload Mutation
  const processDocumentMutation = useMutation({
    mutationFn: async (file) => {
      // 1. Upload File
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // 2. Process & Extract (Backend Function)
      const res = await base44.functions.invoke('processDocument', {
        file_url,
        project_id: projectId,
        filename: file.name,
        file_size: file.size,
        file_type: file.type
      });
      
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Document uploaded & processed");
      queryClient.invalidateQueries(['documents']);
      setUploading(false);
    },
    onError: (e) => {
      toast.error("Upload failed: " + e.message);
      setUploading(false);
    }
  });

  const processFiles = async (files) => {
    setUploading(true);
    setUploadProgress(10);

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (>50MB)`);
        continue;
      }
      // Basic type check (optional, backend handles details)
      const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validTypes.includes(ext) && file.type !== 'text/plain' && !file.type.includes('pdf') && !file.type.includes('word')) {
         // Just a warning, let backend try or fail
         console.warn("File type might not be supported for extraction");
      }

      try {
        setUploadProgress(30);
        await processDocumentMutation.mutateAsync(file);
        setUploadProgress(100);
      } catch (e) {
        console.error(e);
      }
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure?")) {
      await base44.entities.ProjectDocument.delete(id);
      queryClient.invalidateQueries(['documents']);
      toast.success("Document deleted");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept=".pdf,.doc,.docx,.txt,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect} 
          className="hidden" 
        />
        
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="p-3 bg-white rounded-full shadow-sm">
            <UploadCloud className="w-6 h-6 text-indigo-600" />
          </div>
          {uploading ? (
            <div className="w-full max-w-xs space-y-2">
               <p className="text-sm font-medium text-indigo-600">Processing file...</p>
               <Progress value={uploadProgress} className="h-2" />
            </div>
          ) : (
            <>
              <p className="font-medium text-slate-700">Click to upload or drag and drop</p>
              <p className="text-xs">PDF, DOC, DOCX, TXT (Max 50MB)</p>
            </>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white border rounded-lg divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading documents...</div>
        ) : documents?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No documents uploaded yet.</div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 rounded text-slate-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-md">{doc.filename}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* View Content Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>{doc.filename}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] mt-4 bg-slate-50 p-4 rounded border">
                       <pre className="whitespace-pre-wrap text-xs text-slate-700 font-sans">
                         {doc.extracted_text || "(No extracted text available)"}
                       </pre>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" size="sm" onClick={() => window.open(doc.file_url, '_blank')}>
                  <UploadCloud className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}