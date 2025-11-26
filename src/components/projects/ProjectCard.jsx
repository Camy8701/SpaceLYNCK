import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, List, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BranchChecklistModal from './BranchChecklistModal';
import { toast } from "sonner";

export default function ProjectCard({ project, onDelete }) {
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editBranchName, setEditBranchName] = useState('');
  const [checklistBranch, setChecklistBranch] = useState(null);
  const queryClient = useQueryClient();

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', project.id],
    queryFn: async () => {
      return await base44.entities.Branch.filter({ project_id: project.id }, 'order_index');
    }
  });

  const addBranchMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.Branch.create({
        project_id: project.id,
        name: newBranchName,
        order_index: branches.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches', project.id]);
      setNewBranchName('');
      setIsAddingBranch(false);
    }
  });

  const toggleBranchMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      return await base44.entities.Branch.update(id, { completed: !completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches', project.id]);
    }
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      return await base44.entities.Branch.update(id, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches', project.id]);
      setEditingBranchId(null);
    }
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Branch.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches', project.id]);
      toast.success('Branch deleted');
    }
  });

  const handleAddBranch = (e) => {
    e.preventDefault();
    if (newBranchName.trim()) {
      addBranchMutation.mutate();
    }
  };

  const handleEditBranch = (branch) => {
    setEditingBranchId(branch.id);
    setEditBranchName(branch.name);
  };

  const handleSaveEdit = (id) => {
    if (editBranchName.trim()) {
      updateBranchMutation.mutate({ id, name: editBranchName });
    }
  };

  // Generate lighter shade for branches
  const getLighterColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  return (
    <>
      <div 
        className="w-[300px] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
        style={{ backgroundColor: project.color || '#3b82f6' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border-2 border-white/50"
              style={{ backgroundColor: project.color || '#3b82f6' }}
            />
            <h3 className="text-lg font-bold text-white truncate max-w-[200px]">
              {project.name}
            </h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-white/70 hover:text-white">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => onDelete(project.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Branches */}
        <div className="space-y-2 mb-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-xl p-3 flex items-center gap-3 group"
              style={{ backgroundColor: getLighterColor(project.color || '#3b82f6') }}
            >
              <Checkbox
                checked={branch.completed}
                onCheckedChange={() => toggleBranchMutation.mutate({ id: branch.id, completed: branch.completed })}
                className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-green-600"
              />
              
              {editingBranchId === branch.id ? (
                <Input
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  onBlur={() => handleSaveEdit(branch.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(branch.id);
                    if (e.key === 'Escape') setEditingBranchId(null);
                  }}
                  className="flex-1 h-7 bg-white/20 border-none text-white placeholder:text-white/50"
                  autoFocus
                />
              ) : (
                <span 
                  onClick={() => handleEditBranch(branch)}
                  className={`flex-1 text-sm text-white cursor-pointer ${branch.completed ? 'line-through opacity-60' : ''}`}
                >
                  {branch.name}
                </span>
              )}

              <button
                onClick={() => setChecklistBranch(branch)}
                className="text-white/50 hover:text-white"
              >
                <List className="w-4 h-4" />
              </button>

              <button
                onClick={() => deleteBranchMutation.mutate(branch.id)}
                className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-300 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Branch */}
        {isAddingBranch ? (
          <form onSubmit={handleAddBranch} className="flex gap-2">
            <Input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Branch name..."
              className="flex-1 h-9 bg-white/20 border-dashed border-white/30 text-white placeholder:text-white/50"
              autoFocus
              onBlur={() => {
                if (!newBranchName.trim()) setIsAddingBranch(false);
              }}
            />
          </form>
        ) : (
          <button
            onClick={() => setIsAddingBranch(true)}
            className="w-full py-2 border-2 border-dashed border-white/30 rounded-xl text-white/70 hover:text-white hover:border-white/50 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        )}
      </div>

      <BranchChecklistModal
        open={!!checklistBranch}
        onOpenChange={(open) => !open && setChecklistBranch(null)}
        branch={checklistBranch}
      />
    </>
  );
}