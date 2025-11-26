import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Folder, CheckSquare, Clock } from "lucide-react";
import { format } from 'date-fns';

export default function StatsWidget() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats', today],
    queryFn: async () => {
      const user = await base44.auth.me();
      const [projects, tasks, entries] = await Promise.all([
        base44.entities.Project.filter({ created_by: user.email }),
        base44.entities.Task.filter({ assigned_to: user.id, status: 'todo' }),
        base44.entities.TimeEntry.filter({ date: today, created_by: user.email })
      ]);

      const todayHours = entries.reduce((acc, e) => {
        if (e.status === 'completed') return acc + (e.duration_hours || 0);
        if (e.status === 'active') {
          const checkIn = new Date(e.check_in_time);
          return acc + (new Date() - checkIn) / (1000 * 60 * 60);
        }
        return acc;
      }, 0);

      return {
        projects: projects.length,
        tasks: tasks.length,
        hours: todayHours
      };
    }
  });

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