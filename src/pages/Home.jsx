import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import TimeTracker from '@/components/time-tracking/TimeTracker';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle2, Folder, ArrowRight, Calendar, CheckSquare, Briefcase, Clock } from "lucide-react";
import { createPageUrl } from '@/utils';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isToday } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export default function Home() {
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Dashboard</h2>
          <p className="text-zinc-400 mt-1">Manage your time and projects efficiently.</p>
        </div>
      </div>

      {/* Time Tracker Section */}
      <section className="max-w-3xl mx-auto mt-8">
        <div className="mb-6 text-center md:text-left">
          <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2 justify-center md:justify-start">
            <Activity className="w-5 h-5 text-indigo-400" />
            Active Session
          </h3>
        </div>
        <TimeTracker />
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-3xl font-bold text-zinc-100">{stats?.totalProjects || 0}</div>
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-indigo-400">
                <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Tasks Pending</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-3xl font-bold text-zinc-100">{stats?.pendingTasks || 0}</div>
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-orange-400">
                <CheckSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-3xl font-bold text-zinc-100">{stats?.hoursThisWeek || "0.0"}h</div>
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-emerald-400">
                <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Projects */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-zinc-500" /> Recent Projects
              </h3>
              <div className="space-y-3">
                  {stats?.recentProjects?.length > 0 ? stats.recentProjects.map(p => (
                      <Link to={createPageUrl(`ProjectDetails?id=${p.id}`)} key={p.id}>
                          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors">
                                  <Folder className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-medium text-zinc-200">{p.name}</div>
                                  <div className="text-xs text-zinc-500 mt-1">{p.type}</div>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                          </div>
                      </Link>
                  )) : (
                      <div className="text-center py-8 text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
                          No projects yet.
                      </div>
                  )}
                  <Link to="/projects">
                      <Button variant="link" className="px-0 text-indigo-400 hover:text-indigo-300">View All Projects &rarr;</Button>
                  </Link>
              </div>
          </div>

          {/* Tasks Due Soon */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-zinc-500" /> Due Soon
              </h3>
              <div className="space-y-3">
                  {stats?.dueSoon?.length > 0 ? stats.dueSoon.map(t => (
                      <div key={t.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-3 hover:border-zinc-700 transition-colors">
                          <div className={`w-2 h-2 rounded-full ${t.priority === 'Urgent' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                          <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-zinc-200 truncate">{t.title}</h4>
                              <p className="text-xs text-zinc-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {t.due_date && format(new Date(t.due_date), 'MMM d')}
                              </p>
                          </div>
                          <Badge variant="outline" className="text-zinc-400 border-zinc-700 bg-zinc-800/50">{t.priority}</Badge>
                      </div>
                  )) : (
                      <div className="text-center py-8 text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
                          No upcoming deadlines.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}