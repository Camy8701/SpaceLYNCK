import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Calendar, Plus, CheckCircle2, Circle } from "lucide-react";
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import TaskItem from '@/components/tasks/TaskItem';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import { toast } from "sonner";

export default function BranchDetails() {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const branchId = queryParams.get('id');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const branches = await base44.entities.Branch.filter({ id: branchId }, '', 1);
      return branches[0];
    },
    enabled: !!branchId
  });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', branch?.project_id],
    queryFn: async () => {
      if (!branch?.project_id) return null;
      const projects = await base44.entities.Project.filter({ id: branch.project_id }, '', 1);
      return projects[0];
    },
    enabled: !!branch?.project_id
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      return await base44.entities.Task.filter({ branch_id: branchId }, '-created_date');
    },
    enabled: !!branchId
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (task) => {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      return await base44.entities.Task.update(task.id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', branchId]);
      toast.success("Task updated");
    }
  });

  if (!branchId) return <div className="p-8">Invalid Branch ID</div>;
  if (branchLoading) return <div className="p-12 text-center animate-pulse">Loading...</div>;
  if (!branch) return <div className="p-8">Branch not found</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(createPageUrl(`ProjectDetails?id=${branch.project_id}`))} 
            className="text-slate-500"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Project
          </Button>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{branch.name}</h1>
              {project && <Badge variant="secondary">{project.name}</Badge>}
            </div>
            <p className="text-slate-500 mt-1">Manage tasks and workflows for this department.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* Task List */}
      <Card className="min-h-[400px] bg-slate-50/50">
        <CardContent className="p-6">
          {tasksLoading ? (
             <div className="space-y-3">
               {[1,2,3].map(i => <div key={i} className="h-16 bg-white animate-pulse rounded-lg" />)}
             </div>
          ) : tasks?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No tasks yet</h3>
              <p className="text-slate-500 max-w-sm mt-1 mb-4">
                Get started by adding tasks to track progress in this branch.
              </p>
              <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                Create First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggleComplete={(t) => toggleTaskMutation.mutate(t)} 
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTaskDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        branchId={branchId}
        projectId={branch.project_id}
        onTaskCreated={() => queryClient.invalidateQueries(['tasks', branchId])}
      />
    </div>
  );
}