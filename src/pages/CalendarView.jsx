import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { toast } from "sonner";

const categoryColors = {
  personal: 'bg-blue-500',
  work: 'bg-green-500',
  meeting: 'bg-purple-500',
  deadline: 'bg-red-500'
};

export default function CalendarView({ sidebarCollapsed }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.CalendarEvent.filter({ created_by: user.email });
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with weekday
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(daysInMonth);

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => 
      isSameDay(new Date(event.start_datetime), date)
    );
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <CalendarIcon className="w-6 h-6" /> Calendar
          </h1>
          <Button onClick={() => setShowCreateModal(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2 p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-white hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-white hover:bg-white/20">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-white/60 text-sm font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
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
                    className={`h-16 p-1 rounded-lg transition-all flex flex-col items-center ${
                      isSelected ? 'bg-white/30 ring-2 ring-white' : 'hover:bg-white/10'
                    } ${isTodayDate ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/80'}`}>
                      {format(day, 'd')}
                    </span>
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
          </Card>

          {/* Selected Day Events */}
          <Card className="p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            
            {selectedDateEvents.length === 0 ? (
              <p className="text-white/60 text-sm">No events scheduled</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="p-3 bg-white/10 rounded-lg border-l-4" style={{ borderColor: categoryColors[event.category]?.replace('bg-', '#') || '#3b82f6' }}>
                    <p className="font-medium text-white">{event.title}</p>
                    <p className="text-white/60 text-sm">
                      {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
                    </p>
                    {event.description && (
                      <p className="text-white/50 text-sm mt-1">{event.description}</p>
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
    </div>
  );
}