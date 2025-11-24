import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Calendar, 
  Building2, 
  Settings, 
  GitBranch, 
  Users,
  Clock,
  CheckCircle2,
  MessageSquare
} from "lucide-react";
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamList from "@/components/chat/TeamList";
import DocumentList from "@/components/documents/DocumentList";
import ClientList from "@/components/clients/ClientList";
import ProjectHealth from "@/components/ai/ProjectHealth";

export default function ProjectDetails() {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get('id');

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const projects = await base44.entities.Project.filter({ id: projectId }, '', 1);
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return await base44.entities.Branch.filter({ project_id: projectId }, 'order_index');
    },
    enabled: !!projectId
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['projectStats', projectId],
    queryFn: async () => {
      if (!projectId) return { hoursToday: 0, activeTasks: 0 };
      
      const user = await base44.auth.me();
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      // Fetch sessions for this project today
      // Note: Filter might not support complex date logic directly, so we fetch recent and filter in JS for MVP
      const sessions = await base44.entities.WorkSession.filter({ 
        project_id: projectId,
        created_by: user.email 
      }, '-created_date', 50); // Fetch last 50 sessions

      const todaySessions = sessions.filter(s => s.check_in_time >= startOfDay);
      const hoursToday = todaySessions.reduce((acc, s) => acc + (s.total_hours_worked || 0), 0);
      
      // Active Tasks
      const tasks = await base44.entities.Task.filter({ 
        project_id: projectId,
        status: 'todo'
      });

      return {
        hoursToday: hoursToday.toFixed(1),
        activeTasks: tasks.length
      };
    },
    enabled: !!projectId
  });

  if (!projectId) return <div className="p-8">Invalid Project ID</div>;
  if (projectLoading) return <div className="p-12 text-center animate-pulse">Loading project details...</div>;
  if (!project) return <div className="p-8">Project not found</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('Projects'))} className="text-slate-500">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Projects
          </Button>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                {project.type}
              </Badge>
            </div>
            <p className="text-slate-500 max-w-2xl">{project.description || "No description provided."}</p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        </div>

        <div className="flex gap-6 text-sm text-slate-500 border-b pb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Started {format(new Date(project.start_date), 'MMMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {branches?.length || 0} Departments
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="team">Team & Chat</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Branches / Departments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-slate-400" />
                    Project Branches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {branchesLoading ? (
                    <div className="space-y-2">
                       {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-md" />)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {branches?.map((branch) => (
                        <div 
                          key={branch.id} 
                          className="p-4 border rounded-lg bg-slate-50 hover:bg-white hover:shadow-sm hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between"
                          onClick={() => navigate(createPageUrl(`BranchDetails?id=${branch.id}`))}
                        >
                          <div>
                            <h3 className="font-medium text-slate-900">{branch.name}</h3>
                            <p className="text-xs text-slate-400 mt-1">Manage tasks &rarr;</p>
                          </div>
                          <Button size="sm" variant="outline" className="mt-4 w-full">Open Branch</Button>
                        </div>
                      ))}
                      <Button variant="outline" className="h-auto border-dashed py-4 flex flex-col gap-1 text-slate-400 hover:text-indigo-600 hover:border-indigo-300">
                        <Plus className="w-5 h-5" />
                        <span>Add Branch</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Future Task Area Placeholder */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                <p className="text-slate-400">Tasks & Kanban Board coming soon...</p>
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
               <Card className="bg-white border-slate-200 shadow-sm">
                 <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Hours Today</p>
                        <h4 className="text-2xl font-bold text-slate-900">{stats?.hoursToday || 0}h</h4>
                      </div>
                      <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                       <div>
                        <p className="text-sm font-medium text-slate-500">Active Tasks</p>
                        <h4 className="text-2xl font-bold text-slate-900">{stats?.activeTasks || 0}</h4>
                      </div>
                      <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                     <div className="flex items-center justify-between border-t pt-4">
                       <div>
                        <p className="text-sm font-medium text-slate-500">Team</p>
                        <h4 className="text-2xl font-bold text-slate-900">1</h4>
                      </div>
                      <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                 </CardContent>
               </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="max-w-3xl mx-auto">
            <TeamList projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="documents">
           <div className="max-w-4xl mx-auto">
             <DocumentList projectId={projectId} />
           </div>
        </TabsContent>

        <TabsContent value="clients">
           <ClientList projectId={projectId} />
        </TabsContent>

        <TabsContent value="insights">
            <ProjectHealth projectId={projectId} />
        </TabsContent>
           </Tabs>
    </div>
  );
}