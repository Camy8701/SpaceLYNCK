import React from 'react';
import { Clock } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

// This widget displays placeholder - time_entry table not configured
export default function TimeTrackingSummaryWidget() {
  // Generate static placeholder data since time_entry table doesn't exist
  const weekDays = eachDayOfInterval({ 
    start: startOfWeek(new Date()), 
    end: endOfWeek(new Date()) 
  });
  
  const data = {
    todayHours: 0,
    weekHours: 0,
    dailyData: weekDays.map(day => ({ day: format(day, 'EEE'), hours: 0 }))
  };
  
  const isLoading = false;

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
