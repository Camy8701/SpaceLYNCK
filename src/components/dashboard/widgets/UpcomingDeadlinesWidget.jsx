import React from 'react';
import { Calendar } from "lucide-react";

// This widget displays placeholder - task table not configured
export default function UpcomingDeadlinesWidget() {
  // Return empty state since task table doesn't exist
  return (
    <div className="text-center py-4">
      <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
      <p className="text-slate-500 text-sm">No upcoming deadlines</p>
      <p className="text-slate-400 text-xs mt-1">Task tracking coming soon</p>
    </div>
  );
}