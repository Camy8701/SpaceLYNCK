import React from 'react';
import { Folder } from "lucide-react";

// This widget displays placeholder - project table not configured
export default function TopProjectsWidget() {
  // Return empty state since project table doesn't exist
  return (
    <div className="text-center py-4">
      <Folder className="w-8 h-8 mx-auto text-slate-300 mb-2" />
      <p className="text-slate-500 text-sm">No projects yet</p>
      <p className="text-slate-400 text-xs mt-1">Projects feature coming soon</p>
    </div>
  );
}