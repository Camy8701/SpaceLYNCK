import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Trash2, UploadCloud, Eye, Search, Bot, ArrowRight, Clock, Users, CheckSquare } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

export default function DocumentList({ projectId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      return await base44.entities.ProjectDocument.filter({ project_id: projectId }, '-uploaded_at');
    }
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await base44.functions.invoke('searchDocuments', { project_id: projectId, query: searchQuery });
      if (res.data.error) throw new Error(res.data.error);
      setSearchResults(res.data);
    } catch (err) {
      toast.error("Search failed: " + err.message);
    } finally {
      setIsSearching(false);
    }
  };

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
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Ask a question or search across all documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isSearching || !searchQuery.trim()} className="bg-indigo-600">
            {isSearching ? <Bot className="w-4 h-4 animate-pulse" /> : "Search"}
          </Button>
        </form>

        {searchResults && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-indigo-50 rounded-lg p-4 text-sm text-indigo-900">
               <div className="flex items-center gap-2 mb-2 font-semibold text-indigo-700">
                 <Bot className="w-4 h-4" />
                 AI Answer
               </div>
               {searchResults.synthesis}
            </div>
            
            {searchResults.matches && searchResults.matches.length > 0 && (
               <div>
                 <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Relevant Sources</h4>
                 <div className="grid gap-2">
                   {searchResults.matches.map((match, i) => (
                     <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
                        <div className="font-medium text-slate-700 mb-1 flex justify-between">
                          {match.filename}
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            {match.relevance_score}% Match
                          </span>
                        </div>
                        <p className="text-slate-500 line-clamp-2 text-xs italic">"...{match.excerpt}..."</p>
                     </div>
                   ))}
                 </div>
               </div>
            )}
          </div>
        )}
      </div>

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
                  <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{doc.filename}</DialogTitle>
                    </DialogHeader>
                    
                    <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="summary">Summary & Insights</TabsTrigger>
                            <TabsTrigger value="text">Full Text</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="summary" className="flex-1 overflow-auto p-1">
                             <div className="space-y-6">
                                <div className="bg-slate-50 p-4 rounded-lg border">
                                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-indigo-600" /> AI Summary
                                    </h4>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        {doc.summary || "Processing summary..."}
                                    </p>
                                </div>

                                {doc.key_info && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card>
                                            <CardContent className="p-4">
                                                <h5 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-600">
                                                    <Clock className="w-4 h-4" /> Deadlines
                                                </h5>
                                                <ul className="space-y-2">
                                                    {doc.key_info.deadlines?.length > 0 ? doc.key_info.deadlines.map((d, i) => (
                                                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                                            <span className="mt-1 w-1 h-1 rounded-full bg-red-400" /> {d}
                                                        </li>
                                                    )) : <span className="text-xs text-slate-400">None detected</span>}
                                                </ul>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <h5 className="font-semibold text-sm mb-3 flex items-center gap-2 text-orange-600">
                                                    <CheckSquare className="w-4 h-4" /> Action Items
                                                </h5>
                                                <ul className="space-y-2">
                                                    {doc.key_info.action_items?.length > 0 ? doc.key_info.action_items.map((d, i) => (
                                                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                                             <span className="mt-1 w-1 h-1 rounded-full bg-orange-400" /> {d}
                                                        </li>
                                                    )) : <span className="text-xs text-slate-400">None detected</span>}
                                                </ul>
                                            </CardContent>
                                        </Card>

                                         <Card className="md:col-span-2">
                                            <CardContent className="p-4">
                                                <h5 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-600">
                                                    <Users className="w-4 h-4" /> Stakeholders
                                                </h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {doc.key_info.stakeholders?.length > 0 ? doc.key_info.stakeholders.map((d, i) => (
                                                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
                                                            {d}
                                                        </span>
                                                    )) : <span className="text-xs text-slate-400">None detected</span>}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                             </div>
                        </TabsContent>

                        <TabsContent value="text" className="flex-1 overflow-hidden">
                            <ScrollArea className="h-[50vh] bg-slate-50 p-4 rounded border">
                                <pre className="whitespace-pre-wrap text-xs text-slate-700 font-sans">
                                    {doc.extracted_text || "(No extracted text available)"}
                                </pre>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
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