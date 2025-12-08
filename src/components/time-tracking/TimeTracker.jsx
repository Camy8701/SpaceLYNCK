import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SessionHistory from './SessionHistory';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Coffee, Play, LogOut, BellRing } from "lucide-react";
import { differenceInSeconds, format, addHours, addMinutes } from 'date-fns';
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EndOfDayReview from './EndOfDayReview';

// Sound effect for notifications
const ALARM_SOUND = "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3";

export default function TimeTracker() {
  const queryClient = useQueryClient();
  const audioRef = useRef(new Audio(ALARM_SOUND));
  const [now, setNow] = useState(new Date());
  
  // UI States
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showBreakReminderModal, setShowBreakReminderModal] = useState(false);
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);
  
  // Form States
  const [scheduleBreak, setScheduleBreak] = useState(true);
  const [breakInHours, setBreakInHours] = useState("4");
  const [breakDuration, setBreakDuration] = useState("30");
  const [selectedProjectId, setSelectedProjectId] = useState("none");

  // --- Data Fetching ---
  
  // Fetch Projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects-dropdown'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      return await base44.entities.Project.filter({ created_by: user.email }, 'name');
    },
    staleTime: 1000 * 60 * 5
  });
  
  // Fetch the current active session (if any)
  const { data: activeSession, isLoading } = useQuery({
    queryKey: ['activeSession'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return null;

      // We look for sessions that are NOT completed (either active or on_break)
      const sessions = await base44.entities.WorkSession.filter({
         created_by: user.email
      }, '-created_date', 1);
      
      const latest = sessions[0];
      if (latest && latest.status !== 'completed') {
        return latest;
      }
      return null;
    },
    refetchInterval: 1000 * 60,
  });

  // Portal active status to mobile header
  useEffect(() => {
      const el = document.getElementById('mobile-header-status');
      if (el && activeSession) {
          el.innerHTML = `<div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>`;
      } else if (el) {
          el.innerHTML = `<div class="w-3 h-3 rounded-full bg-slate-300"></div>`;
      }
  }, [activeSession]);

  // --- Mutations ---

  const checkInMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.WorkSession.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeSession']);
      setShowCheckInModal(false);
      toast.success("Checked in successfully! Have a great day.");
      requestNotificationPermission();
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.WorkSession.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeSession']);
    }
  });

  // --- Logic & Effects ---

  // Clock Ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Break Watcher
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active' || !activeSession.break_scheduled_time) return;

    const scheduledTime = new Date(activeSession.break_scheduled_time);
    const diff = differenceInSeconds(scheduledTime, now);

    // Trigger if we are within 1 second of the break time
    if (diff <= 0 && diff > -5) {
      triggerBreakNotification();
    }
  }, [now, activeSession]);

  const triggerBreakNotification = async () => {
    // 1. Play Sound
    audioRef.current.play().catch(e => console.log("Audio play failed", e));
    
    // 2. Browser Notification
    if (Notification.permission === "granted") {
      new Notification("ProjectFlow: Break Time! 🧘‍♀️", {
        body: `It's time for your ${activeSession.break_duration_minutes} minute break.`,
        icon: "/favicon.ico"
      });
    }

    // 3. App Notification (Persist)
    try {
        const user = await base44.auth.me();
        await base44.entities.Notification.create({
            user_id: user.id,
            type: 'break_time',
            title: 'Break Time! 🧘‍♀️',
            message: `It's time for your ${activeSession.break_duration_minutes} minute break.`,
            action_url: '/'
        });
    } catch (e) {
        console.error("Failed to create notification", e);
    }

    // 4. Show Modal
    setShowBreakReminderModal(true);
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };

  // --- Handlers ---

  const handleCheckInSubmit = () => {
    const checkInTime = new Date();
    let sessionData = {
      check_in_time: checkInTime.toISOString(),
      status: 'active',
      total_hours_worked: 0,
      project_id: selectedProjectId !== "none" ? selectedProjectId : null
    };

    if (scheduleBreak) {
      const breakTime = addHours(checkInTime, parseInt(breakInHours));
      sessionData.break_scheduled_time = breakTime.toISOString();
      sessionData.break_duration_minutes = parseInt(breakDuration);
    }

    checkInMutation.mutate(sessionData);
  };

  const handleCheckOutClick = () => {
    setShowEndOfDayModal(true);
  };

  const performCheckOut = () => {
    if (!activeSession) return;

    const checkOutTime = new Date();
    const checkInTime = new Date(activeSession.check_in_time);
    
    // Calculate total hours logic
    let totalSeconds = differenceInSeconds(checkOutTime, checkInTime);
    
    if (activeSession.status === 'on_break' && activeSession.break_start_time) {
       const breakStart = new Date(activeSession.break_start_time);
       totalSeconds = differenceInSeconds(breakStart, checkInTime);
    } else if (activeSession.break_start_time && activeSession.break_end_time) {
       const breakDurationSeconds = differenceInSeconds(new Date(activeSession.break_end_time), new Date(activeSession.break_start_time));
       totalSeconds -= breakDurationSeconds;
    }

    const hoursWorked = Math.max(0, totalSeconds / 3600);

    updateSessionMutation.mutate({
      id: activeSession.id,
      data: {
        check_out_time: checkOutTime.toISOString(),
        total_hours_worked: hoursWorked,
        status: 'completed',
        ...(activeSession.status === 'on_break' ? { break_end_time: checkOutTime.toISOString() } : {})
      }
    }, {
      onSuccess: () => {
        toast.success(`Checked out! Total worked: ${hoursWorked.toFixed(2)} hours`);
        setShowEndOfDayModal(false);
      }
    });
  };

  const handleStartBreak = () => {
    setShowBreakReminderModal(false);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    updateSessionMutation.mutate({
      id: activeSession.id,
      data: {
        break_start_time: new Date().toISOString(),
        status: 'on_break'
      }
    });
  };

  const handleSnoozeBreak = () => {
    setShowBreakReminderModal(false);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    
    // Add 15 mins to scheduled time
    const newTime = addMinutes(new Date(), 15);
    updateSessionMutation.mutate({
      id: activeSession.id,
      data: {
        break_scheduled_time: newTime.toISOString()
      }
    });
    toast.info("Break snoozed for 15 minutes");
  };

  const handleEndBreak = () => {
    updateSessionMutation.mutate({
      id: activeSession.id,
      data: {
        break_end_time: new Date().toISOString(),
        status: 'active'
      }
    }, {
      onSuccess: () => {
        if (Notification.permission === "granted") {
          new Notification("ProjectFlow: Welcome Back! 🚀");
        }
      }
    });
  };

  // --- Render Helpers ---

  const getTimerDisplay = () => {
    if (!activeSession) return "00:00:00";

    if (activeSession.status === 'on_break') {
      // Countdown: Scheduled End Time - Now
      // Scheduled End Time = Break Start + Duration
      if (!activeSession.break_start_time) return "00:00";
      
      const breakStart = new Date(activeSession.break_start_time);
      const breakDurationSecs = (activeSession.break_duration_minutes || 0) * 60;
      const breakEndTarget = new Date(breakStart.getTime() + breakDurationSecs * 1000);
      
      const secondsLeft = differenceInSeconds(breakEndTarget, now);
      
      if (secondsLeft < 0) return "Overtime " + formatTimer(Math.abs(secondsLeft));
      return formatTimer(secondsLeft);
    } else {
      // Active Work Timer
      // If a break happened previously, subtract it
      let secondsWorked = differenceInSeconds(now, new Date(activeSession.check_in_time));
      
      if (activeSession.break_start_time && activeSession.break_end_time) {
         const breakSecs = differenceInSeconds(new Date(activeSession.break_end_time), new Date(activeSession.break_start_time));
         secondsWorked -= breakSecs;
      }
      
      return formatTimer(Math.max(0, secondsWorked));
    }
  };

  const formatTimer = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Main Render ---

  if (isLoading) return <div className="animate-pulse h-48 bg-slate-100 rounded-xl" />;

  const isCheckedIn = !!activeSession;
  const isOnBreak = activeSession?.status === 'on_break';

  return (
    <div className="w-full max-w-2xl mx-auto">
    <div className="flex justify-end mb-4">
    <SessionHistory />
    </div>
    <Card className={`border-0 shadow-xl overflow-hidden transition-colors duration-500 bg-white/90 backdrop-blur-md`}>
        <CardContent className="p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-8">
          
          {/* Status Badge */}
          <div className="flex flex-col items-center gap-2">
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase ${
             !isCheckedIn ? 'bg-slate-200/80 text-slate-600' :
             isOnBreak ? 'bg-amber-200 text-amber-800 animate-pulse' : 'bg-emerald-200 text-emerald-800'
          }`}>
            {!isCheckedIn ? 'Ready to Start' : isOnBreak ? 'On Break' : 'Currently Working'}
          </div>
          {isCheckedIn && activeSession?.project_id && (
            <div className="text-sm font-medium text-slate-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              {projects?.find(p => p.id === activeSession.project_id)?.name || 'Unknown Project'}
            </div>
          )}
          </div>

          {/* Main Timer Display */}
          <div className="font-mono text-6xl md:text-7xl font-bold tracking-tight text-slate-800 tabular-nums">
            {getTimerDisplay()}
          </div>

          {/* Main Action Button */}
          <div className="w-full max-w-md">
            {!isCheckedIn ? (
              <Button 
                size="lg" 
                className="w-full h-24 md:h-20 text-3xl md:text-2xl font-bold bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setShowCheckInModal(true)}
              >
                <Play className="mr-3 w-8 h-8 fill-current" />
                CHECK IN
              </Button>
            ) : isOnBreak ? (
              <div className="space-y-4">
                 <div className="text-amber-700 font-medium">
                   Break ends at {activeSession.break_start_time && format(addMinutes(new Date(activeSession.break_start_time), activeSession.break_duration_minutes), 'h:mm a')}
                 </div>
                 <Button 
                  size="lg" 
                  className="w-full h-20 text-2xl font-bold bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 rounded-2xl"
                  onClick={handleEndBreak}
                >
                  <Coffee className="mr-3 w-8 h-8" />
                  END BREAK
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline"
                    className="h-20 md:h-16 text-xl md:text-lg border-slate-300 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                    onClick={handleStartBreak}
                  >
                    <Coffee className="mr-2 w-6 h-6 md:w-5 md:h-5" />
                    Take Break
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-20 md:h-16 text-xl md:text-lg border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                    onClick={handleCheckOutClick}
                  >
                    <LogOut className="mr-2 w-6 h-6 md:w-5 md:h-5" />
                    Check Out
                  </Button>
                </div>
                {activeSession.break_scheduled_time && (
                  <div className="text-sm text-slate-500 flex items-center justify-center gap-2">
                    <BellRing className="w-4 h-4" />
                    Next break scheduled for {format(new Date(activeSession.break_scheduled_time), 'h:mm a')}
                  </div>
                )}
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Check In Modal */}
      <Dialog open={showCheckInModal} onOpenChange={setShowCheckInModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Good Morning! ☀️</DialogTitle>
            <DialogDescription>
              Let's set up your session. Scheduling breaks helps maintain productivity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Project (Optional)</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-white/50 border-white/40 text-slate-800">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40">
                  <SelectItem value="none" className="focus:bg-slate-100">No Project</SelectItem>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id} className="focus:bg-slate-100">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="schedule-break" className="flex flex-col space-y-1 text-slate-700">
                <span>Schedule a break?</span>
                <span className="font-normal text-xs text-slate-500">We'll remind you when it's time.</span>
              </Label>
              <Switch 
                id="schedule-break" 
                checked={scheduleBreak} 
                onCheckedChange={setScheduleBreak} 
              />
            </div>

            {scheduleBreak && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">Break in...</Label>
                  <Select value={breakInHours} onValueChange={setBreakInHours}>
                    <SelectTrigger className="bg-white/50 border-white/40 text-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                        <SelectItem key={h} value={h.toString()} className="focus:bg-slate-100">{h} hour{h > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Duration</Label>
                  <Select value={breakDuration} onValueChange={setBreakDuration}>
                    <SelectTrigger className="bg-white/50 border-white/40 text-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40">
                      <SelectItem value="15" className="focus:bg-slate-100">15 minutes</SelectItem>
                      <SelectItem value="30" className="focus:bg-slate-100">30 minutes</SelectItem>
                      <SelectItem value="45" className="focus:bg-slate-100">45 minutes</SelectItem>
                      <SelectItem value="60" className="focus:bg-slate-100">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInModal(false)} className="border-slate-300 text-slate-700 hover:bg-white/50">Cancel</Button>
            <Button onClick={handleCheckInSubmit} className="bg-rose-500 hover:bg-rose-600 text-white">
              Start Working
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End of Day Review Modal */}
      {activeSession && (
        <EndOfDayReview 
          open={showEndOfDayModal}
          onOpenChange={setShowEndOfDayModal}
          session={{
             ...activeSession,
             // Pass current estimated hours for the review summary
             total_hours_worked: (() => {
                const now = new Date();
                const checkIn = new Date(activeSession.check_in_time);
                let sec = differenceInSeconds(now, checkIn);
                if(activeSession.break_start_time && activeSession.break_end_time) {
                   sec -= differenceInSeconds(new Date(activeSession.break_end_time), new Date(activeSession.break_start_time));
                }
                return Math.max(0, sec / 3600);
             })()
          }}
          onCheckOutComplete={performCheckOut}
        />
      )}

      {/* Break Reminder Modal */}
      <Dialog open={showBreakReminderModal} onOpenChange={setShowBreakReminderModal}>
        <DialogContent className="sm:max-w-md border-l-4 border-l-amber-500">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Coffee className="w-6 h-6" />
              <span className="font-bold uppercase tracking-wide text-sm">Break Time</span>
            </div>
            <DialogTitle className="text-2xl">Time for your break! 🧘‍♀️</DialogTitle>
            <DialogDescription>
              You've been working for {activeSession && activeSession.check_in_time ? differenceInSeconds(now, new Date(activeSession.check_in_time)) > 3600 ? Math.floor(differenceInSeconds(now, new Date(activeSession.check_in_time))/3600) + " hours" : "a while" : ""}. 
              Taking a break improves focus and prevents burnout.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 py-4">
            <Button size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={handleStartBreak}>
              Start {activeSession?.break_duration_minutes}m Break Now
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleSnoozeBreak} className="border-slate-300 text-slate-700 hover:bg-white/50">
                Snooze 15m
              </Button>
              <Button variant="ghost" className="text-slate-600 hover:text-slate-800 hover:bg-white/50" onClick={() => {
                setShowBreakReminderModal(false);
                audioRef.current.pause();
              }}>
                Skip Break
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}