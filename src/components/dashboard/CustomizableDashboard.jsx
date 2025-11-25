import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, Plus, Search, Folder, Calendar, Activity, 
  Sparkles, Clock, Zap, BarChart3, X 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import WidgetContainer from './widgets/WidgetContainer';
import TopProjectsWidget from './widgets/TopProjectsWidget';
import UpcomingDeadlinesWidget from './widgets/UpcomingDeadlinesWidget';
import RecentActivityWidget from './widgets/RecentActivityWidget';
import AiSuggestionsWidget from './widgets/AiSuggestionsWidget';
import TimeTrackingSummaryWidget from './widgets/TimeTrackingSummaryWidget';
import QuickActionsWidget from './widgets/QuickActionsWidget';
import StatsWidget from './widgets/StatsWidget';

const WIDGET_DEFINITIONS = {
  stats: { id: 'stats', title: 'Overview', icon: BarChart3, component: StatsWidget },
  quickActions: { id: 'quickActions', title: 'Quick Actions', icon: Zap, component: QuickActionsWidget },
  topProjects: { id: 'topProjects', title: 'My Top Projects', icon: Folder, component: TopProjectsWidget },
  deadlines: { id: 'deadlines', title: 'Upcoming Deadlines', icon: Calendar, component: UpcomingDeadlinesWidget },
  activity: { id: 'activity', title: 'Recent Activity', icon: Activity, component: RecentActivityWidget },
  aiSuggestions: { id: 'aiSuggestions', title: 'AI Suggestions', icon: Sparkles, component: AiSuggestionsWidget },
  timeTracking: { id: 'timeTracking', title: 'Time Tracking', icon: Clock, component: TimeTrackingSummaryWidget },
};

const DEFAULT_WIDGETS = ['stats', 'quickActions', 'topProjects', 'deadlines', 'timeTracking', 'aiSuggestions'];

export default function CustomizableDashboard({ onCreateProject }) {
  const [activeWidgets, setActiveWidgets] = useState(DEFAULT_WIDGETS);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Load user preferences
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Load saved widget layout
  useEffect(() => {
    if (user?.dashboard_widgets) {
      setActiveWidgets(user.dashboard_widgets);
    }
  }, [user]);

  // Save widget layout
  const saveMutation = useMutation({
    mutationFn: async (widgets) => {
      await base44.auth.updateMe({ dashboard_widgets: widgets });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(activeWidgets);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    setActiveWidgets(items);
    saveMutation.mutate(items);
  };

  const addWidget = (widgetId) => {
    if (!activeWidgets.includes(widgetId)) {
      const newWidgets = [...activeWidgets, widgetId];
      setActiveWidgets(newWidgets);
      saveMutation.mutate(newWidgets);
      toast.success('Widget added');
    }
    setShowAddWidget(false);
  };

  const removeWidget = (widgetId) => {
    const newWidgets = activeWidgets.filter(id => id !== widgetId);
    setActiveWidgets(newWidgets);
    saveMutation.mutate(newWidgets);
    toast.success('Widget removed');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const availableWidgets = Object.keys(WIDGET_DEFINITIONS).filter(id => !activeWidgets.includes(id));

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-white/80">Here's what's happening with your workspace today.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAddWidget(true)}
          className="bg-white/30 border-white/40 text-slate-700 hover:bg-white/50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Widget
        </Button>
      </div>

      {/* Search */}
      <form className="mb-8" onSubmit={(e) => { e.preventDefault(); toast.info('Search coming soon!'); }}>
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, files, tasks..."
            className="w-full h-12 pl-12 pr-4 bg-white/50 backdrop-blur-md border-white/40 text-slate-800 placeholder:text-slate-400 rounded-xl"
          />
        </div>
      </form>

      {/* Widgets Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {activeWidgets.map((widgetId, index) => {
                const widget = WIDGET_DEFINITIONS[widgetId];
                if (!widget) return null;

                const WidgetComponent = widget.component;

                return (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={widgetId === 'stats' ? 'md:col-span-2 lg:col-span-3' : ''}
                      >
                        <WidgetContainer
                          title={widget.title}
                          icon={widget.icon}
                          onRemove={() => removeWidget(widgetId)}
                          isDragging={snapshot.isDragging}
                          dragHandleProps={provided.dragHandleProps}
                        >
                          <WidgetComponent onCreateProject={onCreateProject} />
                        </WidgetContainer>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Widget Dialog */}
      <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
        <DialogContent className="bg-white/90 backdrop-blur-xl border-white/40">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {availableWidgets.length === 0 ? (
              <p className="text-slate-500 text-center py-4">All widgets are already added!</p>
            ) : (
              availableWidgets.map(widgetId => {
                const widget = WIDGET_DEFINITIONS[widgetId];
                return (
                  <Button
                    key={widgetId}
                    variant="outline"
                    onClick={() => addWidget(widgetId)}
                    className="w-full justify-start h-12 bg-white/50 hover:bg-white/80"
                  >
                    <widget.icon className="w-5 h-5 mr-3 text-slate-600" />
                    {widget.title}
                  </Button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}