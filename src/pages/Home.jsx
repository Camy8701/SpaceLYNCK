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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your time and projects efficiently.</p>
        </div>
      </div>

      {/* Time Tracker Section */}
      <section className="max-w-3xl mx-auto mt-8">
        <div className="mb-6 text-center md:text-left">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 justify-center md:justify-start">
            <Activity className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Active Session
          </h3>
        </div>
        <TimeTracker />
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Card className="bg-white/50 border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50 backdrop-blur-sm transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.totalProjects || 0}</div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/50 border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50 backdrop-blur-sm transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Tasks Pending</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.pendingTasks || 0}</div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                <CheckSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50 backdrop-blur-sm transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.hoursThisWeek || "0.0"}h</div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Projects */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-slate-500 dark:text-slate-500" /> Recent Projects
              </h3>
              <div className="space-y-3">
                  {stats?.recentProjects?.length > 0 ? stats.recentProjects.map(p => (
                      <Link to={createPageUrl(`ProjectDetails?id=${p.id}`)} key={p.id}>
                          <div className="p-4 rounded-xl border flex items-center justify-between group transition-all bg-white border-slate-200 hover:shadow-sm dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-indigo-500/30">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-400">
                                  <Folder className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900 dark:text-slate-200">{p.name}</div>
                                  <div className="text-xs text-slate-500 mt-1">{p.type}</div>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 dark:text-slate-600 dark:group-hover:text-indigo-400 transition-colors" />
                          </div>
                      </Link>
                  )) : (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
                          No projects yet.
                      </div>
                  )}
                  <Link to="/MyTasks">
                      <Button variant="link" className="px-0 text-indigo-600 dark:text-indigo-400 hover:underline">View All Tasks &rarr;</Button>
                  </Link>
              </div>
          </div>

          {/* Tasks Due Soon */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-500" /> Due Soon
              </h3>
              <div className="space-y-3">
                  {stats?.dueSoon?.length > 0 ? stats.dueSoon.map(t => (
                      <div key={t.id} className="p-4 rounded-xl border flex items-center gap-3 transition-colors bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                          <div className={`w-2 h-2 rounded-full ${t.priority === 'Urgent' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                          <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-900 dark:text-slate-200 truncate">{t.title}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {t.due_date && format(new Date(t.due_date), 'MMM d')}
                              </p>
                          </div>
                          <Badge variant="outline" className="text-slate-500 border-slate-200 dark:text-slate-400 dark:border-slate-600 dark:bg-slate-800">{t.priority}</Badge>
                      </div>
                  )) : (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
                          No upcoming deadlines.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}