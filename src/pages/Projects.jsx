import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Briefcase, FolderOpen, Calendar, RefreshCw } from "lucide-react";
import ProjectWizard from '@/components/projects/ProjectWizard';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function Projects() {
  const [showWizard, setShowWizard] = useState(false);
  const navigate = useNavigate();

  // Fetch Projects
  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      return await base44.entities.Project.filter({ created_by: user.email }, '-created_date');
    }
  });

  if (showWizard) {
    return (
      <ProjectWizard 
        onComplete={(newProjectId) => {
          setShowWizard(false);
          if (newProjectId) {
             // Navigate to the new project details page
             navigate(createPageUrl(`ProjectDetails?id=${newProjectId}`));
          } else {
             refetch();
          }
        }} 
        onCancel={() => setShowWizard(false)} 
      />
    );
  }

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading projects...</div>;

  // Empty State
  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
          <Briefcase className="w-10 h-10 text-indigo-600" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">Create Your First Project</h2>
          <p className="text-slate-500">
            Projects help you organize tasks, track time, and manage your business efficiently. 
            Start by creating one now.
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={() => setShowWizard(true)}
          className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5 mr-2" /> Create Project
        </Button>
      </div>
    );
  }

  // List State
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Your Projects</h2>
          <p className="text-slate-500 mt-1">Manage and track all your ongoing work.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white/50 border-white/40 text-slate-700 hover:bg-white/60" onClick={async () => {
            try {
              toast.info("Syncing deadlines to Google Calendar...");
              const { data } = await base44.functions.invoke('syncCalendar');

              if(data.error) {
                console.error("Sync error:", data.error);
                if(data.error.includes('not connected')) {
                  toast.error("Please connect Google Calendar in Settings first");
                  navigate('/Settings');
                } else {
                  toast.error("Sync failed: " + data.error);
                }
              } else {
                if (data.synced === 0 && data.total === 0) {
                  toast.info("No tasks with future deadlines to sync");
                } else {
                  toast.success(`Synced ${data.synced} tasks to calendar`);
                }
              }
            } catch(e) {
              console.error("Sync exception:", e);
              toast.error("Sync failed. Check console for details.");
            }
          }}>
             <RefreshCw className="w-4 h-4 mr-2" /> Sync Calendar
          </Button>
          <Button onClick={() => setShowWizard(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Create New
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
        {projects.map((project) => (
          <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)} key={project.id} className="block h-full">
            <Card className="hover:shadow-md transition-shadow group h-full cursor-pointer border-slate-200 hover:border-indigo-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className={`px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 mb-2 inline-block`}>
                    {project.type}
                  </div>
                </div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  {project.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                  {project.description || "No description provided."}
                </p>
                
                <div className="mt-4 flex items-center text-xs text-slate-400 gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Started {format(new Date(project.start_date), 'MMM d, yyyy')}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between text-sm text-slate-500">
                {/* Placeholder for stats */}
                <span>View Details</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}