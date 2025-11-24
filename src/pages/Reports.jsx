import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, BarChart3, PieChart as PieIcon } from "lucide-react";
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from 'date-fns';

export default function Reports() {
  
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return null;

      // Fetch all sessions and projects
      const [sessions, projects] = await Promise.all([
        base44.entities.WorkSession.filter({ created_by: user.email }, '-created_date', 500),
        base44.entities.Project.filter({ created_by: user.email })
      ]);

      const projectMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      // 1. Time per Project (All Time / Recent 500)
      const timePerProject = {};
      sessions.forEach(s => {
        const pName = projectMap[s.project_id] || 'Unassigned';
        timePerProject[pName] = (timePerProject[pName] || 0) + (s.total_hours_worked || 0);
      });

      const pieData = Object.entries(timePerProject).map(([name, value]) => ({ name, value }));

      // 2. Time this week (Daily)
      const weekData = {};
      // Initialize week days
      for(let i=0; i<7; i++) {
         const day = new Date(weekStart);
         day.setDate(day.getDate() + i);
         weekData[format(day, 'EEE')] = 0;
      }

      sessions.forEach(s => {
        if (!s.check_in_time) return;
        const date = parseISO(s.check_in_time);
        if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
          const dayName = format(date, 'EEE');
          weekData[dayName] = (weekData[dayName] || 0) + (s.total_hours_worked || 0);
        }
      });

      const barData = Object.entries(weekData).map(([name, hours]) => ({ name, hours }));

      return { pieData, barData };
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData?.barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-600" />
              Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData?.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reportData?.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(1)}h`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}