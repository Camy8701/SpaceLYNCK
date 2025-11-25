import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut } from "lucide-react";
import { format } from 'date-fns';

export default function TimeTrackingCard() {
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(0);
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch active time entry
  const { data: activeEntry } = useQuery({
    queryKey: ['activeTimeEntry'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const entries = await base44.entities.TimeEntry.filter({ 
        status: 'active',
        created_by: user.email 
      }, '-created_date', 1);
      return entries[0] || null;
    }
  });

  // Fetch today's completed entries for total
  const { data: todayEntries } = useQuery({
    queryKey: ['todayTimeEntries', today],
    queryFn: async () => {
      const user = await base44.auth.me();
      const entries = await base44.entities.TimeEntry.filter({ 
        date: today,
        status: 'completed',
        created_by: user.email
      });
      return entries || [];
    }
  });

  // Calculate today's total hours
  const todayTotalHours = todayEntries?.reduce((acc, entry) => acc + (entry.duration_hours || 0), 0) || 0;

  // Check In mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      return await base44.entities.TimeEntry.create({
        check_in_time: now,
        date: today,
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeTimeEntry']);
    }
  });

  // Check Out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry) return;
      const now = new Date();
      const checkInTime = new Date(activeEntry.check_in_time);
      const durationMs = now - checkInTime;
      const durationHours = durationMs / (1000 * 60 * 60);
      
      return await base44.entities.TimeEntry.update(activeEntry.id, {
        check_out_time: now.toISOString(),
        duration_hours: Math.round(durationHours * 100) / 100,
        status: 'completed'
      });
    },
    onSuccess: () => {
      setElapsedTime(0);
      queryClient.invalidateQueries(['activeTimeEntry']);
      queryClient.invalidateQueries(['todayTimeEntries']);
    }
  });

  // Timer effect
  useEffect(() => {
    if (!activeEntry) {
      setElapsedTime(0);
      return;
    }

    const checkInTime = new Date(activeEntry.check_in_time);
    
    const updateTimer = () => {
      const now = new Date();
      const elapsed = Math.floor((now - checkInTime) / 1000);
      setElapsedTime(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format hours for display
  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const isCheckedIn = !!activeEntry;

  return (
    <div className="bg-[#2d3548] rounded-xl p-5 m-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-white/70" />
        <span className="text-white/70 text-sm font-medium uppercase tracking-wide">Time Tracking</span>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-white font-medium">
          {isCheckedIn ? 'CHECKED IN' : 'CHECKED OUT'}
        </span>
      </div>

      {/* Check In/Out Button */}
      {!isCheckedIn ? (
        <Button
          onClick={() => checkInMutation.mutate()}
          disabled={checkInMutation.isPending}
          className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold text-lg mb-4"
        >
          <LogIn className="w-5 h-5 mr-2" />
          {checkInMutation.isPending ? 'Checking In...' : 'CHECK IN'}
        </Button>
      ) : (
        <div className="space-y-3 mb-4">
          <Button
            disabled
            className="w-full h-12 bg-green-500 text-white font-semibold text-lg cursor-default"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
            CHECKED IN
          </Button>
          <Button
            onClick={() => checkOutMutation.mutate()}
            disabled={checkOutMutation.isPending}
            className="w-full h-10 bg-slate-600 hover:bg-slate-700 text-white font-medium"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {checkOutMutation.isPending ? 'Checking Out...' : 'CHECK OUT'}
          </Button>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-3">
        <div className="text-3xl font-mono font-bold text-white tracking-wider">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-white/50 text-xs mt-1">Current Session</div>
      </div>

      {/* Today's Total */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-sm">Today's Total:</span>
          <span className="text-white font-semibold">{formatHours(todayTotalHours + (elapsedTime / 3600))}</span>
        </div>
      </div>
    </div>
  );
}