import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval, format, parseISO } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ProjectAnalytics({ projectId }) {
    
    const { data: stats, isLoading } = useQuery({
        queryKey: ['projectAnalytics', projectId],
        queryFn: async () => {
            const tasks = await base44.entities.Task.filter({ project_id: projectId });
            const branches = await base44.entities.Branch.filter({ project_id: projectId });
            const sessions = await base44.entities.WorkSession.filter({ project_id: projectId });
            const users = await base44.entities.User.list();

            // 1. Time worked this week (by person)
            const now = new Date();
            const weekStart = startOfWeek(now);
            const weekEnd = endOfWeek(now);
            
            const timeByPerson = {};
            sessions.forEach(session => {
                const date = parseISO(session.check_in_time);
                if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
                    const user = users.find(u => u.email === session.created_by);
                    const name = user ? user.full_name : session.created_by;
                    timeByPerson[name] = (timeByPerson[name] || 0) + (session.total_hours_worked || 0);
                }
            });
            const timeData = Object.entries(timeByPerson).map(([name, hours]) => ({
                name,
                hours: parseFloat(hours.toFixed(1))
            }));

            // 2. Tasks completed this week
            const completedThisWeek = tasks.filter(t => 
                t.status === 'completed' && 
                t.completed_at && 
                isWithinInterval(parseISO(t.completed_at), { start: weekStart, end: weekEnd })
            ).length;

            // 3. Tasks by branch
            const branchMap = branches.reduce((acc, b) => ({...acc, [b.id]: b.name}), {});
            const tasksByBranch = {};
            tasks.forEach(t => {
                const branchName = branchMap[t.branch_id] || 'Unknown';
                tasksByBranch[branchName] = (tasksByBranch[branchName] || 0) + 1;
            });
            const branchData = Object.entries(tasksByBranch).map(([name, value]) => ({ name, value }));

            // 4. Completion rate trend (Last 7 days)
            // Simplified: Just showing completion count per day for last 7 days
            const trendData = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayStr = format(d, 'yyyy-MM-dd');
                const completedCount = tasks.filter(t => 
                    t.status === 'completed' && 
                    t.completed_at && 
                    t.completed_at.startsWith(dayStr)
                ).length;
                trendData.push({
                    date: format(d, 'MMM d'),
                    completed: completedCount
                });
            }

            return {
                timeData,
                completedThisWeek,
                branchData,
                trendData,
                totalTasks: tasks.length
            };
        }
    });

    const handleExport = async () => {
        try {
            const { data } = await base44.functions.invoke('exportProjectData', { project_id: projectId });
            
            // Helper to download CSV
            const downloadCSV = (data, filename) => {
                if (!data || !data.length) return;
                const headers = Object.keys(data[0]).join(',');
                const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
                const csvContent = `${headers}\n${rows}`;
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            downloadCSV(data.tasks, 'tasks_export.csv');
            setTimeout(() => downloadCSV(data.sessions, 'time_logs_export.csv'), 500);
            setTimeout(() => downloadCSV(data.clients, 'clients_export.csv'), 1000);

        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export data");
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
                    <p className="text-slate-500">Real-time insights for your project.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => window.open('https://lookerstudio.google.com', '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" /> Open Looker Studio
                    </Button>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Completed This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.completedThisWeek || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Time Worked by Person */}
                <Card>
                    <CardHeader>
                        <CardTitle>Time Worked (This Week)</CardTitle>
                        <CardDescription>Hours logged by team members</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.timeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="hours" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Tasks by Branch */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tasks by Branch</CardTitle>
                        <CardDescription>Distribution of work across departments</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.branchData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {stats?.branchData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Completion Trend */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Completion Trend</CardTitle>
                        <CardDescription>Tasks completed over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="completed" stroke="#82ca9d" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}