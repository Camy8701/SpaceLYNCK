import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Pause, Play } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import CheckoutDialog from './CheckoutDialog';

export default function TimeTrackingCard() {
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  // Live clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active or paused time entry
  const { data: activeEntry } = useQuery({
    queryKey: ['activeTimeEntry'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const entries = await base44.entities.TimeEntry.filter({ 
        created_by: user.email 
      }, '-created_date', 10);
      // Find an active or paused entry
      return entries.find(e => e.status === 'active' || e.status === 'paused') || null;
    },
    refetchInterval: 5000
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
        status: 'active',
        total_paused_seconds: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
      toast.success('Checked in!');
    },
    onError: (error) => {
      toast.error('Failed to check in: ' + error.message);
    }
  });

  // Check Out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry) {
        throw new Error('No active entry found');
      }
      
      const now = new Date();
      const checkInTime = new Date(activeEntry.check_in_time);
      const totalPausedSeconds = activeEntry.total_paused_seconds || 0;
      
      // If currently paused, add the current pause duration
      let finalPausedSeconds = totalPausedSeconds;
      if (activeEntry.status === 'paused' && activeEntry.paused_at) {
        const pausedAt = new Date(activeEntry.paused_at);
        finalPausedSeconds += Math.floor((now - pausedAt) / 1000);
      }
      
      const totalSeconds = Math.floor((now - checkInTime) / 1000);
      const workedSeconds = totalSeconds - finalPausedSeconds;
      const durationHours = workedSeconds / 3600;
      
      return await base44.entities.TimeEntry.update(activeEntry.id, {
        check_out_time: now.toISOString(),
        duration_hours: Math.round(durationHours * 100) / 100,
        status: 'completed',
        total_paused_seconds: finalPausedSeconds
      });
    },
    onSuccess: () => {
      setElapsedTime(0);
      queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
      queryClient.invalidateQueries({ queryKey: ['todayTimeEntries'] });
      toast.success('Checked out!');
    },
    onError: (error) => {
      toast.error('Failed to check out: ' + error.message);
    }
  });

  const handleCheckoutClick = () => {
    setShowCheckoutDialog(true);
  };

  const handleConfirmCheckout = async () => {
    await checkOutMutation.mutateAsync();
  };

  // Take Break mutation
  const takeBreakMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry || activeEntry.status !== 'active') {
        throw new Error('No active session to pause');
      }
      
      return await base44.entities.TimeEntry.update(activeEntry.id, {
        status: 'paused',
        paused_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
      toast.success('Break started');
    },
    onError: (error) => {
      toast.error('Failed to start break: ' + error.message);
    }
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry || activeEntry.status !== 'paused') {
        throw new Error('No paused session to resume');
      }
      
      const now = new Date();
      const pausedAt = new Date(activeEntry.paused_at);
      const pauseDuration = Math.floor((now - pausedAt) / 1000);
      const totalPausedSeconds = (activeEntry.total_paused_seconds || 0) + pauseDuration;
      
      return await base44.entities.TimeEntry.update(activeEntry.id, {
        status: 'active',
        paused_at: null,
        total_paused_seconds: totalPausedSeconds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
      toast.success('Resumed work');
    },
    onError: (error) => {
      toast.error('Failed to resume: ' + error.message);
    }
  });

  // Timer effect
  useEffect(() => {
    if (!activeEntry) {
      setElapsedTime(0);
      return;
    }

    const checkInTime = new Date(activeEntry.check_in_time);
    const totalPausedSeconds = activeEntry.total_paused_seconds || 0;
    
    const updateTimer = () => {
      const now = new Date();
      let elapsed = Math.floor((now - checkInTime) / 1000) - totalPausedSeconds;
      
      // If paused, subtract current pause duration
      if (activeEntry.status === 'paused' && activeEntry.paused_at) {
        const pausedAt = new Date(activeEntry.paused_at);
        const currentPauseDuration = Math.floor((now - pausedAt) / 1000);
        elapsed -= currentPauseDuration;
      }
      
      setElapsedTime(Math.max(0, elapsed));
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

  const isCheckedIn = activeEntry && (activeEntry.status === 'active' || activeEntry.status === 'paused');
  const isPaused = activeEntry?.status === 'paused';

  return (
    <>
    <div className="bg-white/50 backdrop-blur-md rounded-xl p-4 mx-3 mt-3 border border-white/40">
      {/* Live Clock Display */}
      <div className="text-center mb-3 pb-3 border-b border-slate-200/50">
        <div className="text-3xl font-mono font-bold text-slate-800 tracking-wider">
          {format(currentTime, 'HH:mm')}
          <span className="text-lg text-slate-500">:{format(currentTime, 'ss')}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {format(currentTime, 'EEEE, MMM d')}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-slate-700" />
        <span className="text-slate-700 text-xs font-medium uppercase tracking-wide">Time Tracking</span>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${
          isPaused ? 'bg-yellow-500' : isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} />
        <span className="text-slate-800 text-sm font-medium">
          {isPaused ? 'ON BREAK' : isCheckedIn ? 'CHECKED IN' : 'CHECKED OUT'}
        </span>
      </div>

      {/* Buttons */}
      {!isCheckedIn ? (
        <Button
          onClick={() => checkInMutation.mutate()}
          disabled={checkInMutation.isPending}
          className="w-full h-10 bg-rose-500/80 hover:bg-rose-500 backdrop-blur-sm text-white font-semibold mb-3 rounded-lg border border-rose-400/30"
        >
          <LogIn className="w-4 h-4 mr-2" />
          {checkInMutation.isPending ? 'Checking In...' : 'CHECK IN'}
        </Button>
      ) : (
        <div className="space-y-2 mb-3">
          {/* Break/Resume Button */}
          {isPaused ? (
            <Button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="w-full h-10 bg-green-500/80 hover:bg-green-600 backdrop-blur-sm text-white font-semibold rounded-lg border border-green-400/30"
            >
              <Play className="w-4 h-4 mr-2" />
              {resumeMutation.isPending ? 'Resuming...' : 'RESUME'}
            </Button>
          ) : (
            <Button
              onClick={() => takeBreakMutation.mutate()}
              disabled={takeBreakMutation.isPending}
              className="w-full h-10 bg-yellow-500/80 hover:bg-yellow-600 backdrop-blur-sm text-white font-semibold rounded-lg border border-yellow-400/30"
            >
              <Pause className="w-4 h-4 mr-2" />
              {takeBreakMutation.isPending ? 'Pausing...' : 'TAKE A BREAK'}
            </Button>
          )}
          
          {/* Check Out Button */}
          <Button
            onClick={handleCheckoutClick}
            disabled={checkOutMutation.isPending}
            className="w-full h-8 bg-white/10 hover:bg-red-500/50 backdrop-blur-sm text-white text-sm font-medium rounded-lg border border-white/10"
          >
            <LogOut className="w-3 h-3 mr-2" />
            {checkOutMutation.isPending ? 'Checking Out...' : 'CHECK OUT'}
          </Button>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-2">
        <div className={`text-2xl font-mono font-bold tracking-wider ${isPaused ? 'text-yellow-600' : 'text-slate-800'}`}>
          {formatTime(elapsedTime)}
        </div>
        <div className="text-slate-500 text-[10px] mt-0.5">
          {isPaused ? 'Paused' : 'Current Session'}
        </div>
      </div>

      {/* Today's Total */}
      <div className="border-t border-slate-300/50 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 text-xs">Today's Total:</span>
          <span className="text-slate-800 text-sm font-semibold">{formatHours(todayTotalHours + (elapsedTime / 3600))}</span>
        </div>
      </div>
    </div>

    <CheckoutDialog 
      open={showCheckoutDialog}
      onOpenChange={setShowCheckoutDialog}
      onConfirmCheckout={handleConfirmCheckout}
    />
    </>
  );
}