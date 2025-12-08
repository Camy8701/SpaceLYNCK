import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Folder, 
  CheckSquare, 
  Clock, 
  Plus, 
  Sparkles,
  ArrowRight,
  Search
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';

export default function DashboardMain({ sidebarCollapsed, onCreateProject }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Return empty arrays since these tables don't exist
  // This prevents 404 errors from Supabase
  const projects = [];
  const pendingTasks = [];
  const todayEntries = [];

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

  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      navigate(createPageUrl('Projects'));
    }
  };

  const handleAddTask = () => {
    setShowTaskDialog(true);
  };

  const handleAskJarvis = () => {
    navigate(createPageUrl('JarvisView'));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`, {
        description: "Search feature coming soon!"
      });
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-white/80">
            Here's what's happening with your workspace today.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, files, tasks..."
              className="w-full h-12 pl-12 pr-4 bg-white/50 backdrop-blur-md border-white/40 text-slate-800 placeholder:text-slate-400 rounded-xl focus:ring-white/50 focus:border-white/50"
            />
          </div>
        </form>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-700 text-sm font-medium mb-1">Projects</p>
                <p className="text-4xl font-bold text-slate-800">{projects?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-400/30 rounded-xl flex items-center justify-center">
                <Folder className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-700 text-sm font-medium mb-1">Tasks Due</p>
                <p className="text-4xl font-bold text-slate-800">{pendingTasks?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-400/30 rounded-xl flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-700 text-sm font-medium mb-1">Hours Today</p>
                <p className="text-4xl font-bold text-slate-800">{todayHours.toFixed(1)}h</p>
              </div>
              <div className="w-12 h-12 bg-green-400/30 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button
              onClick={handleCreateProject}
              variant="outline"
              className="w-full justify-between h-14 bg-white/50 backdrop-blur-md border-white/40 hover:bg-white/60 text-left rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-400/30 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-slate-800">Create New Project</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500" />
            </Button>

            <Button
              onClick={handleAddTask}
              variant="outline"
              className="w-full justify-between h-14 bg-white/50 backdrop-blur-md border-white/40 hover:bg-white/60 text-left rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400/30 rounded-lg flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-slate-800">Add Quick Task</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500" />
            </Button>

            <Button
              onClick={handleAskJarvis}
              variant="outline"
              className="w-full justify-between h-14 bg-white/50 backdrop-blur-md border-white/40 hover:bg-white/60 text-left rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-400/30 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-slate-800">Ask Jarvis</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Task Dialog */}
        <CreateTaskDialog 
          open={showTaskDialog} 
          onOpenChange={setShowTaskDialog}
          branchId={null}
          projectId={null}
          onTaskCreated={() => {
            toast.success('Task created successfully!');
          }}
        />

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <Card className="p-8 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <div className="text-center text-slate-600">
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