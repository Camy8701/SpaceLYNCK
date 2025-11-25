import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2, Lightbulb } from "lucide-react";

export default function AiSuggestionsWidget() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: suggestions, isLoading, refetch } = useQuery({
    queryKey: ['aiSuggestions'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const [tasks, projects] = await Promise.all([
        base44.entities.Task.filter({ assigned_to: user.id, status: 'todo' }, '-created_date', 10),
        base44.entities.Project.filter({ created_by: user.email }, '-created_date', 5)
      ]);

      if (tasks.length === 0 && projects.length === 0) {
        return [
          { text: "Start by creating your first project to organize your work.", type: "tip" },
          { text: "Use the time tracker to monitor your productivity.", type: "tip" }
        ];
      }

      // Generate suggestions based on data
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this user's data, provide 3 brief, actionable productivity suggestions (max 15 words each).
        
Tasks pending: ${tasks.length}
Projects: ${projects.map(p => p.name).join(', ') || 'None'}
Overdue tasks: ${tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}

Return JSON with array of suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return result.suggestions?.slice(0, 3).map(s => ({ text: s, type: 'ai' })) || [];
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions?.map((suggestion, idx) => (
        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-purple-50/50">
          <Lightbulb className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
          <p className="text-slate-700 text-sm">{suggestion.text}</p>
        </div>
      ))}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
      >
        {isRefreshing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        Refresh Suggestions
      </Button>
    </div>
  );
}