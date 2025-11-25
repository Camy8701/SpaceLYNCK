import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, RefreshCw, Loader2, Settings } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, eachHourOfInterval, setHours } from 'date-fns';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import CalendarSyncSettings from '@/components/calendar/CalendarSyncSettings';
import { toast } from "sonner";

const categoryColors = {
  personal: 'bg-blue-500',
  work: 'bg-green-500',
  meeting: 'bg-purple-500',
  deadline: 'bg-red-500'
};

export default function CalendarView({ sidebarCollapsed }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.CalendarEvent.filter({ created_by: user.email });
    }
  });

  const syncGoogleCalendar = async () => {
    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke('syncGoogleCalendar', { action: 'sync' });
      queryClient.invalidateQueries(['calendarEvents']);
      toast.success(response.data.message || 'Calendar synced!');
    } catch (error) {
      toast.error('Failed to sync Google Calendar');
    }
    setIsSyncing(false);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Week view dates
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Pad start of month to align with weekday
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(daysInMonth);

  // Hours for day/week view
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 10 PM

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => 
      isSameDay(new Date(event.start_datetime), date)
    );
  };

  const getEventsForHour = (date, hour) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return isSameDay(eventDate, date) && eventDate.getHours() === hour;
    });
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <CalendarIcon className="w-6 h-6" /> Calendar
          </h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowSyncSettings(true)}
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              onClick={syncGoogleCalendar} 
              disabled={isSyncing}
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sync
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-6">
          {['month', 'week', 'day'].map(mode => (
            <Button
              key={mode}
              onClick={() => setViewMode(mode)}
              variant={viewMode === mode ? 'default' : 'outline'}
              className={viewMode === mode ? 'bg-white/30 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/20'}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
          <Button onClick={goToToday} variant="outline" className="ml-auto bg-white/10 border-white/30 text-white hover:bg-white/20">
            Today
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2 p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" onClick={navigatePrev} className="text-white hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold text-slate-800">
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                {viewMode === 'week' && `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
                {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <Button variant="ghost" onClick={navigateNext} className="text-white hover:bg-white/20">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Month View */}
            {viewMode === 'month' && (
              <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-slate-600 text-sm font-medium py-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {paddedDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-16" />;
                    const dayEvents = getEventsForDate(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`h-16 p-1 rounded-lg transition-all flex flex-col items-center ${isSelected ? 'bg-white/50 ring-2 ring-blue-500' : 'hover:bg-white/30'} ${isTodayDate ? 'ring-2 ring-blue-400' : ''}`}
                      >
                        <span className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${categoryColors[event.category]}`} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Week View */}
            {viewMode === 'week' && (
              <div className="overflow-auto max-h-[60vh]">
                <div className="grid grid-cols-8 gap-1">
                  <div className="w-16" />
                  {daysInWeek.map(day => (
                    <div key={day.toISOString()} className={`text-center py-2 ${isToday(day) ? 'bg-blue-500/30 rounded-lg' : ''}`}>
                      <p className="text-white/60 text-xs">{format(day, 'EEE')}</p>
                      <p className="text-white font-medium">{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 gap-1 border-t border-white/10">
                    <div className="w-16 py-2 text-white/50 text-xs text-right pr-2">{hour}:00</div>
                    {daysInWeek.map(day => {
                      const hourEvents = getEventsForHour(day, hour);
                      return (
                        <div key={day.toISOString()} className="min-h-[40px] p-1 hover:bg-white/10 cursor-pointer" onClick={() => { setSelectedDate(day); setShowCreateModal(true); }}>
                          {hourEvents.map(event => (
                            <div key={event.id} className={`text-xs p-1 rounded ${categoryColors[event.category]} text-white truncate`}>{event.title}</div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Day View */}
            {viewMode === 'day' && (
              <div className="overflow-auto max-h-[60vh]">
                {hours.map(hour => {
                  const hourEvents = getEventsForHour(currentDate, hour);
                  return (
                    <div key={hour} className="flex border-t border-white/10">
                      <div className="w-20 py-3 text-white/50 text-sm text-right pr-4">{hour}:00</div>
                      <div className="flex-1 min-h-[50px] p-2 hover:bg-white/10 cursor-pointer" onClick={() => setShowCreateModal(true)}>
                        {hourEvents.map(event => (
                          <div key={event.id} className={`p-2 rounded-lg ${categoryColors[event.category]} text-white mb-1`}>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs opacity-80">{format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Selected Day Events */}
          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            
            {selectedDateEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">No events scheduled</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="p-3 bg-white/30 rounded-lg border-l-4" style={{ borderColor: categoryColors[event.category]?.replace('bg-', '#') || '#3b82f6' }}>
                    <p className="font-medium text-slate-800">{event.title}</p>
                    <p className="text-slate-600 text-sm">
                      {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
                    </p>
                    {event.description && (
                      <p className="text-slate-500 text-sm mt-1">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={() => setShowCreateModal(true)} 
              variant="outline" 
              className="w-full mt-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Event
            </Button>
          </Card>
        </div>
      </div>

      <CreateEventModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        defaultDate={selectedDate}
      />

      <CalendarSyncSettings
        open={showSyncSettings}
        onOpenChange={setShowSyncSettings}
      />
    </div>
  );
}