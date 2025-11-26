import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Sparkles, Check, Loader2, ListTodo, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { format, addDays } from 'date-fns';

export default function TaskAnalysis({ task, onUpdate }) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Extract URL from description (basic regex)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = task.description?.match(urlRegex);
  const campaignUrl = urls ? urls[0] : null;

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('analyzeCampaign', {
        url: campaignUrl,
        task_context: task.description
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data.analysis;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success("Analysis complete!");
    },
    onError: (e) => {
      toast.error("Analysis failed: " + e.message);
    }
  });

  const saveToNotesMutation = useMutation({
    mutationFn: async () => {
      const newDesc = (task.description || "") + "\n\n## 🤖 AI Analysis\n" + analysis;
      await base44.entities.Task.update(task.id, { description: newDesc });
    },
    onSuccess: () => {
      toast.success("Saved to task description");
      queryClient.invalidateQueries(['tasks']);
      if(onUpdate) onUpdate();
    }
  });

  const createTasksMutation = useMutation({
    mutationFn: async () => {
      // Parse recommendations (simple split by number or newline for MVP)
      const recommendations = analysis.split('RECOMMENDATIONS:')[1]?.split('\n').filter(l => /^\d+\./.test(l.trim())) || [];
      
      const promises = recommendations.map(rec => {
        const title = rec.replace(/^\d+\.\s*/, '').trim();
        if (!title) return null;
        return base44.entities.Task.create({
          title: `[AI Rec] ${title}`,
          project_id: task.project_id,
          branch_id: task.branch_id,
          priority: 'Normal',
          status: 'todo',
          description: `Generated from AI Analysis of ${campaignUrl}`,
          due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd')
        });
      }).filter(Boolean);

      await Promise.all(promises);
      return recommendations.length;
    },
    onSuccess: (count) => {
      toast.success(`Created ${count} new tasks!`);
      queryClient.invalidateQueries(['tasks']);
    }
  });

  if (!campaignUrl) return null;

  return (
    <div className="mt-4 border-t pt-4">
      {!analysis ? (
        <Button 
          onClick={() => { setAnalyzing(true); analyzeMutation.mutate(); }} 
          disabled={analyzing}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {analyzing ? "AI analyzing campaign..." : "Analyze Campaign with AI"}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h4 className="font-semibold flex items-center gap-2 text-indigo-700">
               <Bot className="w-5 h-5" /> AI Analysis Result
             </h4>
             <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)}>Reset</Button>
          </div>
          
          <ScrollArea className="h-64 rounded-md border bg-slate-50 p-4">
            <ReactMarkdown className="prose prose-sm max-w-none text-slate-700">
              {analysis}
            </ReactMarkdown>
          </ScrollArea>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => saveToNotesMutation.mutate()}
              disabled={saveToNotesMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" /> Save to Notes
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700" 
              onClick={() => createTasksMutation.mutate()}
              disabled={createTasksMutation.isPending}
            >
              <ListTodo className="w-4 h-4 mr-2" /> Create Tasks
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}