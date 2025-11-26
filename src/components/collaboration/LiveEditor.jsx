import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Users } from "lucide-react";
import { format } from "date-fns";

export default function LiveEditor({ projectId }) {
  const [localContent, setLocalContent] = useState('');
  const [status, setStatus] = useState('idle'); // idle, typing, saving, synced
  const [lastSaved, setLastSaved] = useState(null);
  const [editorValue, setEditorValue] = useState('');
  const editorRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  // 1. Fetch the note
  const { data: note, isFetching } = useQuery({
    queryKey: ['projectNote', projectId],
    queryFn: async () => {
      const res = await base44.entities.ProjectNote.filter({ project_id: projectId }, '', 1);
      return res[0] || { content: '' }; // Return stub if new
    },
    refetchInterval: 2000, // Polling for changes
    refetchIntervalInBackground: true,
  });

  // 2. Initialize local content from server ONCE or when not typing
  useEffect(() => {
    if (note && status !== 'typing' && status !== 'saving') {
      // Only update if different to avoid loop
      if (note.content !== editorValue) {
         setEditorValue(note.content || '');
         setLastSaved(note.updated_date);
         setStatus('synced');
      }
    }
  }, [note, status]);

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (content) => {
       if (note?.id) {
         return await base44.entities.ProjectNote.update(note.id, { 
             content,
             // last_editor_id: user.id (handled by backend implicitly in created_by usually, but we added field)
         });
       } else {
         return await base44.entities.ProjectNote.create({ 
             project_id: projectId, 
             content 
         });
       }
    },
    onSuccess: (data) => {
       setStatus('synced');
       setLastSaved(new Date().toISOString());
       queryClient.invalidateQueries(['projectNote', projectId]);
    },
    onError: () => {
       setStatus('error');
    }
  });

  // 4. Handle Change
  const handleChange = (content, delta, source, editor) => {
    if (source === 'user') {
       setEditorValue(content);
       setStatus('typing');
       
       // Debounce save
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => {
          setStatus('saving');
          saveMutation.mutate(content);
       }, 1500); // Auto-save after 1.5s of no typing
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
         <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Shared Notes
         </CardTitle>
         <div className="flex items-center gap-2">
            {status === 'saving' && <Badge variant="outline" className="text-blue-600 border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</Badge>}
            {status === 'synced' && <Badge variant="outline" className="text-green-600 border-green-200"><Save className="w-3 h-3 mr-1" /> Saved</Badge>}
            {status === 'error' && <Badge variant="destructive">Save Failed</Badge>}
            {lastSaved && <span className="text-xs text-slate-400">Last synced: {format(new Date(lastSaved), 'HH:mm:ss')}</span>}
         </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
         <div className="bg-yellow-50 px-4 py-2 text-xs text-yellow-700 border-b border-yellow-100 flex items-center justify-center">
            ⚠️ Live editing enabled. Content updates automatically.
         </div>
         <ReactQuill 
            theme="snow"
            value={editorValue}
            onChange={handleChange}
            className="flex-1 flex flex-col"
            modules={{
                toolbar: [
                  [{ 'header': [1, 2, false] }],
                  ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                  [{'list': 'ordered'}, {'list': 'bullet'}],
                  ['link', 'clean']
                ],
            }}
         />
         {/* Quill CSS Overrides for full height */}
         <style>{`
            .quill { display: flex; flex-direction: column; height: 100%; }
            .ql-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; font-family: inherit; font-size: 0.95rem; }
            .ql-editor { flex: 1; overflow-y: auto; padding: 1.5rem; }
            .ql-toolbar { border-top: none !important; border-left: none !important; border-right: none !important; background: #f8fafc; }
            .ql-container.ql-snow { border: none !important; }
         `}</style>
      </CardContent>
    </Card>
  );
}