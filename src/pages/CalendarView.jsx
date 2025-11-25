import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, RefreshCw, Loader2, Settings, CheckSquare, Flag, Briefcase, Clock, ExternalLink } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import CalendarSyncSettings from '@/components/calendar/CalendarSyncSettings';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const categoryColors = {
  personal: 'bg-blue-500',
  work: 'bg-green-500',
  meeting: 'bg-purple-500',
  deadline: 'bg-red-500',
  task: 'bg-amber-500',
  project: 'bg-indigo-500'
};

const itemTypeIcons = {
  event: CalendarIcon,
  task: CheckSquare,
  project: Briefcase
};

export default function CalendarView({ sidebarCollapsed }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    showEvents: true,
    showTasks: true,
    showDeadlines: true
  });

  // Fetch calendar events
  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.CalendarEvent.filter({ created_by: user.email });
    }
  });

  // Fetch assigned tasks with due dates
  const { data: tasks = [] } = useQuery({
    queryKey: ['calendarTasks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const allTasks = await base44.entities.Task.filter({ assignees: user.id });
      return allTasks.filter(t => t.due_date);
    }
  });

  // Fetch projects with deadlines
  const { data: projects = [] } = useQuery({
    queryKey: ['calendarProjects'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const allProjects = await base44.entities.Project.filter({ created_by: user.email });
      return allProjects.filter(p => p.deadline);
    }
  });

  // Combine all items into unified calendar entries
  const allCalendarItems = useMemo(() => {
    const items = [];
    
    if (filters.showEvents) {
      events.forEach(e => items.push({
        id: e.id,
        type: 'event',
        title: e.title,
        date: new Date(e.start_datetime),
        endDate: e.end_datetime ? new Date(e.end_datetime) : null,
        category: e.category || 'personal',
        description: e.description,
        color: categoryColors[e.category] || 'bg-blue-500',
        source: e.google_event_id ? 'google' : 'local',
        raw: e
      }));
    }
    
    if (filters.showTasks) {
      tasks.forEach(t => items.push({
        id: t.id,
        type: 'task',
        title: t.title,
        date: new Date(t.due_date),
        category: 'task',
        priority: t.priority,
        status: t.status,
        projectId: t.project_id,
        color: t.status === 'completed' ? 'bg-green-500' : 'bg-amber-500',
        raw: t
      }));
    }
    
    if (filters.showDeadlines) {
      projects.forEach(p => items.push({
        id: p.id,
        type: 'project',
        title: `📅 ${p.name} Deadline`,
        date: new Date(p.deadline),
        category: 'project',
        color: 'bg-indigo-500',
        raw: p
      }));
    }
    
    return items.sort((a, b) => a.date - b.date);
  }, [events, tasks, projects, filters]);

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

  const getItemsForDate = (date) => {
    if (!date) return [];
    return allCalendarItems.filter(item => isSameDay(item.date, date));
  };

  const getItemsForHour = (date, hour) => {
    return allCalendarItems.filter(item => {
      return isSameDay(item.date, date) && item.date.getHours() === hour;
    });
  };

  const selectedDateItems = getItemsForDate(selectedDate);

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

        {/* View Mode Tabs & Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
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
          
          <div className="flex items-center gap-4 ml-4 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
              <Checkbox checked={filters.showEvents} onCheckedChange={(c) => setFilters(f => ({...f, showEvents: c}))} />
              <CalendarIcon className="w-3 h-3" /> Events
            </label>
            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
              <Checkbox checked={filters.showTasks} onCheckedChange={(c) => setFilters(f => ({...f, showTasks: c}))} />
              <CheckSquare className="w-3 h-3" /> Tasks
            </label>
            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
              <Checkbox checked={filters.showDeadlines} onCheckedChange={(c) => setFilters(f => ({...f, showDeadlines: c}))} />
              <Flag className="w-3 h-3" /> Deadlines
            </label>
          </div>
          
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
                    if (!day) return <div key={`empty-${idx}`} className="h-20" />;
                    const dayItems = getItemsForDate(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`h-20 p-1 rounded-lg transition-all flex flex-col items-start ${isSelected ? 'bg-white/50 ring-2 ring-blue-500' : 'hover:bg-white/30'} ${isTodayDate ? 'ring-2 ring-blue-400' : ''}`}
                      >
                        <span className={`text-sm font-medium w-full text-center ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                        {dayItems.length > 0 && (
                          <div className="flex flex-col gap-0.5 mt-1 w-full overflow-hidden">
                            {dayItems.slice(0, 2).map((item, i) => (
                              <div key={i} className={`w-full h-1.5 rounded-full ${item.color}`} title={item.title} />
                            ))}
                            {dayItems.length > 2 && (
                              <span className="text-[9px] text-slate-500 text-center">+{dayItems.length - 2}</span>
                            )}
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
                      <p className="text-slate-500 text-xs">{format(day, 'EEE')}</p>
                      <p className="text-slate-800 font-medium">{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 gap-1 border-t border-slate-200/50">
                    <div className="w-16 py-2 text-slate-400 text-xs text-right pr-2">{hour}:00</div>
                    {daysInWeek.map(day => {
                      const hourItems = getItemsForHour(day, hour);
                      return (
                        <div key={day.toISOString()} className="min-h-[40px] p-1 hover:bg-white/30 cursor-pointer" onClick={() => { setSelectedDate(day); setShowCreateModal(true); }}>
                          {hourItems.map(item => (
                            <div key={item.id} className={`text-xs p-1 rounded ${item.color} text-white truncate`}>{item.title}</div>
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
                  const hourItems = getItemsForHour(currentDate, hour);
                  return (
                    <div key={hour} className="flex border-t border-slate-200/50">
                      <div className="w-20 py-3 text-slate-400 text-sm text-right pr-4">{hour}:00</div>
                      <div className="flex-1 min-h-[50px] p-2 hover:bg-white/30 cursor-pointer" onClick={() => setShowCreateModal(true)}>
                        {hourItems.map(item => {
                          const Icon = itemTypeIcons[item.type];
                          return (
                            <div key={item.id} className={`p-2 rounded-lg ${item.color} text-white mb-1 flex items-start gap-2`}>
                              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.title}</p>
                                {item.type === 'event' && item.endDate && (
                                  <p className="text-xs opacity-80">{format(item.date, 'h:mm a')} - {format(item.endDate, 'h:mm a')}</p>
                                )}
                                {item.type === 'task' && (
                                  <p className="text-xs opacity-80">{item.priority} priority • {item.status}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Selected Day Items */}
          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl h-fit">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            
            {selectedDateItems.length === 0 ? (
              <p className="text-slate-500 text-sm">No items scheduled</p>
            ) : (
              <div className="space-y-3">
                {selectedDateItems.map(item => {
                  const Icon = itemTypeIcons[item.type];
                  return (
                    <div 
                      key={`${item.type}-${item.id}`} 
                      className={`p-3 bg-white/40 rounded-xl border-l-4 ${item.color.replace('bg-', 'border-')}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{item.title}</p>
                          
                          {item.type === 'event' && (
                            <>
                              <p className="text-slate-600 text-sm flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(item.date, 'h:mm a')}
                                {item.endDate && ` - ${format(item.endDate, 'h:mm a')}`}
                              </p>
                              {item.source === 'google' && (
                                <Badge variant="outline" className="mt-1 text-[10px] h-5">
                                  <ExternalLink className="w-2 h-2 mr-1" /> Google
                                </Badge>
                              )}
                            </>
                          )}
                          
                          {item.type === 'task' && (
                            <>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={item.status === 'completed' ? 'default' : 'outline'} className="text-[10px] h-5">
                                  {item.status}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] h-5 ${
                                  item.priority === 'High' || item.priority === 'Urgent' ? 'text-red-600 border-red-300' : ''
                                }`}>
                                  {item.priority}
                                </Badge>
                              </div>
                              {item.projectId && (
                                <Link 
                                  to={createPageUrl(`ProjectDetails?id=${item.projectId}`)}
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  View Project →
                                </Link>
                              )}
                            </>
                          )}
                          
                          {item.type === 'project' && (
                            <Link 
                              to={createPageUrl(`ProjectDetails?id=${item.id}`)}
                              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View Project →
                            </Link>
                          )}
                          
                          {item.description && (
                            <p className="text-slate-500 text-sm mt-2 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-200/50">
              <p className="text-xs text-slate-500 mb-2">Legend</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> Events
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-amber-500" /> Tasks
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" /> Deadlines
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> Completed
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
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