import React from 'react';
import { Activity, CheckCircle, FolderPlus, Clock } from "lucide-react";

// This widget uses placeholder data since task, project, time_entry tables don't exist in Supabase
export default function RecentActivityWidget() {
  // Return placeholder - no API calls to prevent 404 errors
  const activities = [];
  const isLoading = false;

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4">
        <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">No recent activity</p>
        <p className="text-slate-400 text-xs mt-1">Your activity will appear here</p>
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case 'task': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'project': return <FolderPlus className="w-4 h-4 text-blue-500" />;
      case 'time': return <Clock className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getLabel = (activity) => {
    switch (activity.type) {
      case 'task': return `Created task: ${activity.item.title}`;
      case 'project': return `Created project: ${activity.item.name}`;
      case 'time': return `Time entry: ${activity.item.duration_hours?.toFixed(1) || '0'}h`;
      default: return 'Activity';
    }
  };

  return (
    <div className="space-y-2">
      {activities.map((activity, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg">
          {getIcon(activity.type)}
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 text-sm truncate">{getLabel(activity)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
