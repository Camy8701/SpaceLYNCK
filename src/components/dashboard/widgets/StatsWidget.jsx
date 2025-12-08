import React from 'react';
import { Folder, CheckSquare, Clock } from "lucide-react";

// This widget displays placeholder stats - actual data tables not configured
export default function StatsWidget() {
  // Return static placeholder data since project/task/time_entry tables don't exist
  const stats = {
    projects: 0,
    tasks: 0,
    hours: 0
  };
  
  const isLoading = false;

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading...</div>;
  }

  const items = [
    { label: 'Projects', value: stats?.projects || 0, icon: Folder, color: 'bg-blue-400/30 text-blue-600' },
    { label: 'Tasks Due', value: stats?.tasks || 0, icon: CheckSquare, color: 'bg-amber-400/30 text-amber-600' },
    { label: 'Hours Today', value: `${(stats?.hours || 0).toFixed(1)}h`, icon: Clock, color: 'bg-green-400/30 text-green-600' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white/40 rounded-xl p-3 text-center">
          <div className={`w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center ${item.color.split(' ')[0]}`}>
            <item.icon className={`w-4 h-4 ${item.color.split(' ')[1]}`} />
          </div>
          <p className="text-xl font-bold text-slate-800">{item.value}</p>
          <p className="text-slate-500 text-xs">{item.label}</p>
        </div>
      ))}
    </div>
  );
}