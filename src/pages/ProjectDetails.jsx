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
  Users 
} from "lucide-react";
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';

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

      {/* Dashboard Grid */}
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
                      className="p-4 border rounded-lg bg-slate-50 hover:bg-white hover:shadow-sm hover:border-indigo-200 transition-all cursor-pointer"
                    >
                      <h3 className="font-medium text-slate-900">{branch.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">0 active tasks</p>
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
           <Card className="bg-slate-50/50 border-slate-200">
             <CardHeader>
               <CardTitle className="text-sm font-medium text-slate-500">Team Members</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="flex items-center gap-2 text-sm text-slate-400 italic">
                 <Users className="w-4 h-4" />
                 No members invited yet
               </div>
               <Button variant="link" className="px-0 text-indigo-600 mt-2 h-auto">
                 + Invite Member
               </Button>
             </CardContent>
           </Card>

           <Card className="bg-slate-50/50 border-slate-200">
             <CardHeader>
               <CardTitle className="text-sm font-medium text-slate-500">Time Tracked</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-slate-800">0.0h</div>
               <p className="text-xs text-slate-400 mt-1">Total project hours</p>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}