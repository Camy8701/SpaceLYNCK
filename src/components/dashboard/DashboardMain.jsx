import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Folder, 
  CheckSquare, 
  Clock, 
  Plus, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function DashboardMain() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch projects count
  const { data: projects } = useQuery({
    queryKey: ['projectsCount'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Project.filter({ created_by: user.email });
    }
  });

  // Fetch pending tasks count
  const { data: pendingTasks } = useQuery({
    queryKey: ['pendingTasksCount'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Task.filter({ 
        assigned_to: user.id, 
        status: 'todo' 
      });
    }
  });

  // Fetch today's time entries
  const { data: todayEntries } = useQuery({
    queryKey: ['todayHours', today],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.TimeEntry.filter({ 
        date: today,
        created_by: user.email
      });
    }
  });

  // Calculate today's hours
  const todayHours = todayEntries?.reduce((acc, entry) => {
    if (entry.status === 'completed') {
      return acc + (entry.duration_hours || 0);
    }
    // For active entry, calculate current duration
    if (entry.status === 'active') {
      const checkIn = new Date(entry.check_in_time);
      const now = new Date();
      const hours = (now - checkIn) / (1000 * 60 * 60);
      return acc + hours;
    }
    return acc;
  }, 0) || 0;

  const handleComingSoon = (feature) => {
    toast.info(`${feature} - Coming soon!`, {
      description: "This feature will be available in a future update."
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-slate-100 lg:ml-[280px]">
      <div className="p-6 lg:p-10 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-slate-600">
            Here's what's happening with your workspace today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Projects</p>
                <p className="text-4xl font-bold text-slate-900">{projects?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Folder className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Tasks Due</p>
                <p className="text-4xl font-bold text-slate-900">{pendingTasks?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Hours Today</p>
                <p className="text-4xl font-bold text-slate-900">{todayHours.toFixed(1)}h</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button
              onClick={() => handleComingSoon('Create New Project')}
              variant="outline"
              className="w-full justify-between h-14 bg-white border-slate-200 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-slate-700">Create New Project</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </Button>

            <Button
              onClick={() => handleComingSoon('Add Quick Task')}
              variant="outline"
              className="w-full justify-between h-14 bg-white border-slate-200 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-amber-600" />
                </div>
                <span className="font-medium text-slate-700">Add Quick Task</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </Button>

            <Button
              onClick={() => handleComingSoon('Ask Jarvis')}
              variant="outline"
              className="w-full justify-between h-14 bg-white border-slate-200 hover:bg-slate-50 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-slate-700">Ask Jarvis</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <Card className="p-8 bg-white border-0 shadow-sm">
            <div className="text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No recent activity</p>
              <p className="text-sm mt-1">Your activity will appear here as you work</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}