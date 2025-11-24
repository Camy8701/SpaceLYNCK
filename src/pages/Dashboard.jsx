import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import TimeTracker from '@/components/time-tracking/TimeTracker';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Folder, ArrowRight, Calendar, CheckSquare, Briefcase, Clock, Settings, LayoutDashboard } from "lucide-react";
import { createPageUrl } from '@/utils';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return null;
      const projects = await base44.entities.Project.filter({ created_by: user.email }, '-created_date', 5);
      const tasks = await base44.entities.Task.filter({ assigned_to: user.id, status: 'todo' });
      const sessions = await base44.entities.WorkSession.filter({ created_by: user.email }, '-created_date', 50);

      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      
      const hoursThisWeek = sessions.reduce((acc, s) => {
        const checkIn = parseISO(s.check_in_time);
        if (isWithinInterval(checkIn, { start: weekStart, end: weekEnd })) {
           return acc + (s.total_hours_worked || 0);
        }
        return acc;
      }, 0);

      return {
        projectCount: projects.length, 
        totalProjects: (await base44.entities.Project.list()).length, 
        pendingTasks: tasks.length,
        hoursThisWeek: hoursThisWeek.toFixed(1),
        recentProjects: projects,
        dueSoon: tasks.filter(t => t.due_date).sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5)
      };
    }
  });

  return (
    <div className="space-y-12 pb-20">
      
      <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/20"></div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase opacity-80">My Workspace</h2>
          <div className="h-px flex-1 bg-white/20"></div>
      </div>

      {/* Time Tracker Section - Glass */}
      <section className="max-w-3xl mx-auto">
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl transition-transform hover:scale-[1.01]">
            <div className="mb-6 text-center md:text-left">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 justify-center md:justify-start">
                <Activity className="w-5 h-5 text-white" />
                Active Session
            </h3>
            </div>
            <TimeTracker />
        </div>
      </section>

      {/* Stats Grid - Transparent/Glass */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-black/20 border-white/10 shadow-xl backdrop-blur-md text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-4xl font-bold">{stats?.totalProjects || 0}</div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 text-white backdrop-blur-sm">
                <Briefcase className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/20 border-white/10 shadow-xl backdrop-blur-md text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Tasks Pending</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-4xl font-bold">{stats?.pendingTasks || 0}</div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 text-white backdrop-blur-sm">
                <CheckSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10 shadow-xl backdrop-blur-md text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-4xl font-bold">{stats?.hoursThisWeek || "0.0"}h</div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 text-white backdrop-blur-sm">
                <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Projects */}
          <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Folder className="w-6 h-6" /> Recent Projects
              </h3>
              <div className="space-y-3">
                  {stats?.recentProjects?.length > 0 ? stats.recentProjects.map(p => (
                      <Link to={createPageUrl(`ProjectDetails?id=${p.id}`)} key={p.id}>
                          <div className="p-5 rounded-2xl border flex items-center justify-between group transition-all bg-white/10 border-white/10 hover:bg-white/20 backdrop-blur-md shadow-lg">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 text-white">
                                  <Folder className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="font-bold text-lg text-white">{p.name}</div>
                                  <div className="text-sm text-white/70 mt-1">{p.type}</div>
                                </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                          </div>
                      </Link>
                  )) : (
                      <div className="text-center py-12 text-white/60 bg-black/10 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                          No projects yet.
                      </div>
                  )}
                  <Link to="/MyTasks">
                      <Button variant="link" className="px-0 text-white hover:text-blue-200 hover:underline text-base">View All Tasks &rarr;</Button>
                  </Link>
              </div>
          </div>

          {/* Tasks Due Soon */}
          <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6" /> Due Soon
              </h3>
              <div className="space-y-3">
                  {stats?.dueSoon?.length > 0 ? stats.dueSoon.map(t => (
                      <div key={t.id} className="p-5 rounded-2xl border flex items-center gap-4 transition-colors bg-white/10 border-white/10 backdrop-blur-md shadow-lg">
                          <div className={`w-3 h-3 rounded-full shadow-lg ${t.priority === 'Urgent' ? 'bg-red-400 shadow-red-500/50' : 'bg-blue-400 shadow-blue-500/50'}`} />
                          <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white truncate">{t.title}</h4>
                              <p className="text-sm text-white/70 flex items-center gap-1 mt-1">
                                <Calendar className="w-4 h-4" />
                                {t.due_date && format(new Date(t.due_date), 'MMM d')}
                              </p>
                          </div>
                          <Badge variant="outline" className="text-white border-white/30 bg-white/10 backdrop-blur-sm">{t.priority}</Badge>
                      </div>
                  )) : (
                      <div className="text-center py-12 text-white/60 bg-black/10 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                          No upcoming deadlines.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}