import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { toast } from "sonner";

export default function ProjectsView() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Project.filter({ created_by: user.email }, '-created_date');
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id) => {
      // Delete all branches first
      const branches = await base44.entities.Branch.filter({ project_id: id });
      for (const branch of branches) {
        // Delete checklist items
        const items = await base44.entities.ChecklistItem.filter({ branch_id: branch.id });
        for (const item of items) {
          await base44.entities.ChecklistItem.delete(item.id);
        }
        await base44.entities.Branch.delete(branch.id);
      }
      return await base44.entities.Project.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project deleted');
    }
  });

  return (
    <div className="min-h-screen bg-slate-100 lg:ml-[280px]">
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No projects yet. Create your first project!</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={(id) => deleteProjectMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}