import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import TimeTracker from '@/components/time-tracking/TimeTracker';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, Activity, CheckCircle2, Folder, ArrowRight, Calendar } from "lucide-react";
import { createPageUrl } from '@/utils';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

export default function Home() {
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const user = await base44.auth.me();
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
        projectCount: projects.length, // Note: this is just recent 5 count if user has many, but good enough for "Active"
        totalProjects: (await base44.entities.Project.list()).length, // Real total
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage your time and projects efficiently.</p>
        </div>
      </div>

      {/* Time Tracker Section */}
      <section className="max-w-3xl mx-auto mt-8">
        <div className="mb-6 text-center md:text-left">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 justify-center md:justify-start">
            <Activity className="w-5 h-5 text-indigo-500" />
            Active Session
          </h3>
        </div>
        <TimeTracker />
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Card className="bg-indigo-50 border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats?.totalProjects || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Tasks Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats?.pendingTasks || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats?.hoursThisWeek || "0.0"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Projects */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-slate-500" /> Recent Projects
              </h3>
              <div className="space-y-3">
                  {stats?.recentProjects?.length > 0 ? stats.recentProjects.map(p => (
                      <Link to={createPageUrl(`ProjectDetails?id=${p.id}`)} key={p.id}>
                          <div className="bg-white p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between group mb-3">
                              <div>
                                  <div className="font-medium text-slate-900">{p.name}</div>
                                  <div className="text-xs text-slate-500 mt-1">{p.type}</div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                      </Link>
                  )) : (
                      <div className="text-slate-400 text-sm italic">No projects yet.</div>
                  )}
                  <Link to="/projects">
                      <Button variant="link" className="px-0 text-indigo-600">View All Projects &rarr;</Button>
                  </Link>
              </div>
          </div>

          {/* Tasks Due Soon */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500" /> Due Soon
              </h3>
              <div className="space-y-3">
                  {stats?.dueSoon?.length > 0 ? stats.dueSoon.map(t => (
                      <div key={t.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${t.priority === 'Urgent' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                              <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{t.title}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                              {t.due_date && format(new Date(t.due_date), 'MMM d')}
                          </div>
                      </div>
                  )) : (
                      <div className="text-slate-400 text-sm italic">No upcoming deadlines.</div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}