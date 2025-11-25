import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";

export default function BranchChecklistModal({ open, onOpenChange, branch }) {
  const [newItemText, setNewItemText] = useState('');
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['checklistItems', branch?.id],
    queryFn: async () => {
      if (!branch?.id) return [];
      return await base44.entities.ChecklistItem.filter({ branch_id: branch.id }, 'position');
    },
    enabled: !!branch?.id && open
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.ChecklistItem.create({
        branch_id: branch.id,
        text: newItemText,
        completed: false,
        position: items.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklistItems', branch?.id]);
      setNewItemText('');
    }
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      return await base44.entities.ChecklistItem.update(id, { completed: !completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklistItems', branch?.id]);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ChecklistItem.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklistItems', branch?.id]);
    }
  });

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItemText.trim()) {
      addItemMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Branch: {branch?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-slate-500 mb-4">Checklist Items:</p>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No checklist items yet</p>
            )}
            {items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleItemMutation.mutate({ id: item.id, completed: item.completed })}
                />
                <span className={`flex-1 text-sm ${item.completed ? 'line-through text-slate-400' : ''}`}>
                  {item.text}
                </span>
                <button
                  onClick={() => deleteItemMutation.mutate(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddItem} className="mt-4 flex gap-2">
            <Input
              placeholder="+ Add new item..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newItemText.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}