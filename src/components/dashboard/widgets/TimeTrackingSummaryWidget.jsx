import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export default function TimeTrackingSummaryWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['timeTrackingSummary'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const entries = await base44.entities.TimeEntry.filter({ created_by: user.email }, '-date', 30);
      
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

      // Calculate today's hours
      const todayHours = entries
        .filter(e => e.date === todayStr)
        .reduce((acc, e) => acc + (e.duration_hours || 0), 0);

      // Calculate week's hours
      const weekHours = entries
        .filter(e => {
          const d = new Date(e.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((acc, e) => acc + (e.duration_hours || 0), 0);

      // Daily breakdown for the week
      const dailyData = weekDays.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const hours = entries
          .filter(e => e.date === dayStr)
          .reduce((acc, e) => acc + (e.duration_hours || 0), 0);
        return { day: format(day, 'EEE'), hours };
      });

      return { todayHours, weekHours, dailyData };
    }
  });

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading...</div>;
  }

  const maxHours = Math.max(...(data?.dailyData?.map(d => d.hours) || [1]), 8);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/40 rounded-xl p-3 text-center">
          <p className="text-slate-500 text-xs">Today</p>
          <p className="text-2xl font-bold text-slate-800">{data?.todayHours?.toFixed(1) || 0}h</p>
        </div>
        <div className="bg-white/40 rounded-xl p-3 text-center">
          <p className="text-slate-500 text-xs">This Week</p>
          <p className="text-2xl font-bold text-slate-800">{data?.weekHours?.toFixed(1) || 0}h</p>
        </div>
      </div>

      {/* Mini chart */}
      <div className="flex items-end justify-between gap-1 h-16">
        {data?.dailyData?.map((day, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-green-400/60 rounded-t"
              style={{ height: `${(day.hours / maxHours) * 100}%`, minHeight: day.hours > 0 ? '4px' : '0' }}
            />
            <span className="text-[10px] text-slate-500">{day.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}