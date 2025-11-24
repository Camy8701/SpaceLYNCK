import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Briefcase, FolderOpen, Calendar } from "lucide-react";
import ProjectWizard from '@/components/projects/ProjectWizard';
import { format } from 'date-fns';

export default function Projects() {
  const [showWizard, setShowWizard] = useState(false);

  // Fetch Projects
  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      return await base44.entities.Project.list('-created_date');
    }
  });

  if (showWizard) {
    return (
      <ProjectWizard 
        onComplete={() => {
          setShowWizard(false);
          refetch();
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
        <Button onClick={() => setShowWizard(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Create New
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow group">
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
              <span>0 Tasks</span>
              <span>0h Tracked</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}