import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle } from "lucide-react";
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';

export default function UpcomingDeadlinesWidget() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['upcomingDeadlines'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const allTasks = await base44.entities.Task.filter({ 
        assigned_to: user.id,
        status: 'todo'
      });
      // Filter tasks with due dates in the next 7 days
      const now = new Date();
      const nextWeek = addDays(now, 7);
      return allTasks
        .filter(t => t.due_date && new Date(t.due_date) <= nextWeek)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);
    }
  });

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-4">
        <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">No upcoming deadlines</p>
      </div>
    );
  }

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return { label: 'Overdue', color: 'text-red-600 bg-red-100' };
    if (isToday(date)) return { label: 'Today', color: 'text-amber-600 bg-amber-100' };
    if (isTomorrow(date)) return { label: 'Tomorrow', color: 'text-orange-600 bg-orange-100' };
    return { label: format(date, 'MMM d'), color: 'text-slate-600 bg-slate-100' };
  };

  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const { label, color } = getDateLabel(task.due_date);
        return (
          <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-white/30">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <p className="text-slate-800 text-sm truncate">{task.title}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}