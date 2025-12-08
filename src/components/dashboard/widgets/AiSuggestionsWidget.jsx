import React from 'react';
import { Lightbulb, Sparkles } from "lucide-react";

// This widget displays static suggestions - task/project tables not configured
export default function AiSuggestionsWidget() {
  // Return static suggestions since Task/Project tables don't exist
  const suggestions = [
    { text: "Start by creating your first project to organize your work.", type: "tip" },
    { text: "Use the time tracker to monitor your productivity.", type: "tip" },
    { text: "Check out the Email Marketing tools for campaigns.", type: "tip" }
  ];

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, idx) => (
        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-purple-50/50">
          <Lightbulb className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
          <p className="text-slate-700 text-sm">{suggestion.text}</p>
        </div>
      ))}
      <div className="flex items-center justify-center text-xs text-slate-400 pt-2">
        <Sparkles className="w-3 h-3 mr-1" />
        AI suggestions coming soon
      </div>
    </div>
  );
}
