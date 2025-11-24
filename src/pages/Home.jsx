import React from 'react';
import TimeTracker from '@/components/time-tracking/TimeTracker';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, Activity, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage your time and projects efficiently.</p>
        </div>
        <div className="flex gap-2">
          {/* Future global actions */}
        </div>
      </div>

      {/* Time Tracker Section - Priority #1 */}
      <section className="max-w-3xl mx-auto mt-8">
        <div className="mb-6 text-center md:text-left">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 justify-center md:justify-start">
            <Activity className="w-5 h-5 text-indigo-500" />
            Active Session
          </h3>
        </div>
        <TimeTracker />
      </section>

      {/* Placeholder for future features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 opacity-50 grayscale-[0.5] pointer-events-none select-none">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Tasks Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.0</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center text-sm text-slate-400 mt-8">
        Complete features coming soon: Projects, Tasks, AI Assistant
      </div>
    </div>
  );
}