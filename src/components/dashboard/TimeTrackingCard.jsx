import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Pause, Play } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import CheckoutDialog from './CheckoutDialog';

export default function TimeTrackingCard() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0);
  const [pausedAt, setPausedAt] = useState(null);
  const [todayTotalHours, setTodayTotalHours] = useState(0);

  // Live clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isCheckedIn || !checkInTime) {
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      let elapsed = Math.floor((now - checkInTime) / 1000) - totalPausedSeconds;
      
      // If paused, subtract current pause duration
      if (isPaused && pausedAt) {
        const currentPauseDuration = Math.floor((now - pausedAt) / 1000);
        elapsed -= currentPauseDuration;
      }
      
      setElapsedTime(Math.max(0, elapsed));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime, isPaused, pausedAt, totalPausedSeconds]);

  // Handle Check In - local state only (no Supabase)
  const handleCheckIn = () => {
    const now = new Date();
    setCheckInTime(now);
    setIsCheckedIn(true);
    setIsPaused(false);
    setTotalPausedSeconds(0);
    setPausedAt(null);
    setElapsedTime(0);
    toast.success('Checked in!');
  };

  // Handle Check Out - local state only (no Supabase)
  const handleCheckOut = () => {
    const hoursWorked = elapsedTime / 3600;
    setTodayTotalHours(prev => prev + hoursWorked);
    setIsCheckedIn(false);
    setIsPaused(false);
    setCheckInTime(null);
    setElapsedTime(0);
    setTotalPausedSeconds(0);
    setPausedAt(null);
    toast.success('Checked out!');
  };

  // Handle Take Break - local state only
  const handleTakeBreak = () => {
    if (!isCheckedIn || isPaused) return;
    setIsPaused(true);
    setPausedAt(new Date());
    toast.success('Break started');
  };

  // Handle Resume - local state only
  const handleResume = () => {
    if (!isPaused || !pausedAt) return;
    const now = new Date();
    const pauseDuration = Math.floor((now - pausedAt) / 1000);
    setTotalPausedSeconds(prev => prev + pauseDuration);
    setIsPaused(false);
    setPausedAt(null);
    toast.success('Resumed work');
  };

  const handleCheckoutClick = () => {
    setShowCheckoutDialog(true);
  };

  const handleConfirmCheckout = () => {
    handleCheckOut();
  };

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
          onClick={handleCheckIn}
          className="w-full h-10 bg-rose-500/80 hover:bg-rose-500 backdrop-blur-sm text-white font-semibold mb-3 rounded-lg border border-rose-400/30"
        >
          <LogIn className="w-4 h-4 mr-2" />
          CHECK IN
        </Button>
      ) : (
        <div className="space-y-2 mb-3">
          {/* Break/Resume Button */}
          {isPaused ? (
            <Button
              onClick={handleResume}
              className="w-full h-10 bg-green-500/80 hover:bg-green-600 backdrop-blur-sm text-white font-semibold rounded-lg border border-green-400/30"
            >
              <Play className="w-4 h-4 mr-2" />
              RESUME
            </Button>
          ) : (
            <Button
              onClick={handleTakeBreak}
              className="w-full h-10 bg-yellow-500/80 hover:bg-yellow-600 backdrop-blur-sm text-white font-semibold rounded-lg border border-yellow-400/30"
            >
              <Pause className="w-4 h-4 mr-2" />
              TAKE A BREAK
            </Button>
          )}
          
          {/* Check Out Button */}
          <Button
            onClick={handleCheckoutClick}
            className="w-full h-8 bg-white/10 hover:bg-red-500/50 backdrop-blur-sm text-white text-sm font-medium rounded-lg border border-white/10"
          >
            <LogOut className="w-3 h-3 mr-2" />
            CHECK OUT
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
