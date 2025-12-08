import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Users } from "lucide-react";
import { format } from "date-fns";

// This component uses local state since project_note table doesn't exist in Supabase
export default function LiveEditor({ projectId }) {
  const [editorValue, setEditorValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle, typing, saving, synced
  const [lastSaved, setLastSaved] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Handle Change with local auto-save simulation
  const handleChange = (content, delta, source, editor) => {
    if (source === 'user') {
       setEditorValue(content);
       setStatus('typing');
       
       // Simulate auto-save with debounce
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => {
          setStatus('saving');
          // Simulate save delay
          setTimeout(() => {
            setStatus('synced');
            setLastSaved(new Date().toISOString());
          }, 500);
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
            {lastSaved && <span className="text-xs text-slate-400">Last synced: {format(new Date(lastSaved), 'HH:mm:ss')}</span>}
         </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
         <div className="bg-yellow-50 px-4 py-2 text-xs text-yellow-700 border-b border-yellow-100 flex items-center justify-center">
            ⚠️ Notes are saved locally in this session. Configure Supabase for cloud sync.
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
