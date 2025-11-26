import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle, FolderPlus, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

export default function RecentActivityWidget() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const user = await base44.auth.me();
      
      // Fetch recent tasks, projects, and time entries
      const [tasks, projects, timeEntries] = await Promise.all([
        base44.entities.Task.filter({ created_by: user.email }, '-created_date', 5),
        base44.entities.Project.filter({ created_by: user.email }, '-created_date', 3),
        base44.entities.TimeEntry.filter({ created_by: user.email }, '-created_date', 3)
      ]);

      // Combine and sort by date
      const combined = [
        ...tasks.map(t => ({ type: 'task', item: t, date: t.created_date })),
        ...projects.map(p => ({ type: 'project', item: p, date: p.created_date })),
        ...timeEntries.map(e => ({ type: 'time', item: e, date: e.created_date }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      return combined;
    }
  });

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4">
        <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">No recent activity</p>
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
            <p className="text-slate-400 text-xs">
              {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}