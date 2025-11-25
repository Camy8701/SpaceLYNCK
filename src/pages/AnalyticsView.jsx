import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Clock, Folder, BookOpen, TrendingUp } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsView({ sidebarCollapsed }) {
  const [period, setPeriod] = useState('week');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntriesAnalytics'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.TimeEntry.filter({ created_by: user.email }, '-date');
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projectsAnalytics'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Project.filter({ created_by: user.email });
    }
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['coursesAnalytics'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.StudyCourse.filter({ created_by: user.email });
    }
  });

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'today': return { start: now, end: now };
      case 'week': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month': return { start: subDays(now, 30), end: now };
      case '90days': return { start: subDays(now, 90), end: now };
      default: return { start: startOfWeek(now), end: endOfWeek(now) };
    }
  };

  const range = getDateRange();

  // Filter time entries by period
  const filteredEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return isWithinInterval(entryDate, range);
  });

  // Calculate total hours
  const totalHours = filteredEntries.reduce((acc, entry) => acc + (entry.duration_hours || 0), 0);

  // Daily hours chart data
  const days = eachDayOfInterval(range);
  const dailyData = days.slice(-7).map(day => {
    const dayEntries = filteredEntries.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
    const hours = dayEntries.reduce((acc, e) => acc + (e.duration_hours || 0), 0);
    return {
      day: format(day, 'EEE'),
      hours: Math.round(hours * 10) / 10
    };
  });

  // Project stats
  const activeProjects = projects.length;
  const completedProjects = projects.filter(p => p.completed).length;

  // Study progress
  const avgProgress = courses.length > 0 
    ? Math.round(courses.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / courses.length)
    : 0;

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <BarChart3 className="w-6 h-6" /> Analytics
          </h1>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 bg-white/20 border-white/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Hours</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{totalHours.toFixed(1)}h</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 text-sm">Active Projects</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{activeProjects}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                <Folder className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 text-sm">Courses</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{courses.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 text-sm">Avg Study Progress</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{avgProgress}%</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Tracking Chart */}
          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Hours by Day</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" stroke="#fff" opacity={0.6} />
                  <YAxis stroke="#fff" opacity={0.6} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(0,0,0,0.8)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Study Progress */}
          <Card className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Study Progress</h3>
            {courses.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No courses yet
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map(course => (
                  <div key={course.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-800">{course.name}</span>
                      <span className="text-slate-600">{course.progress_percentage || 0}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/20 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${course.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Productivity Insights */}
          <Card className="p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Productivity Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white/30 rounded-xl">
                <p className="text-slate-500 text-sm">Avg. Daily Hours</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {(totalHours / Math.max(days.length, 1)).toFixed(1)}h
                </p>
              </div>
              <div className="text-center p-4 bg-white/30 rounded-xl">
                <p className="text-slate-500 text-sm">Total Sessions</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{filteredEntries.length}</p>
              </div>
              <div className="text-center p-4 bg-white/30 rounded-xl">
                <p className="text-slate-500 text-sm">Project Completion</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {activeProjects > 0 ? Math.round((completedProjects / activeProjects) * 100) : 0}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}