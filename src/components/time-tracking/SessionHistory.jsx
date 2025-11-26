import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, Plus, History } from "lucide-react";
import { toast } from "sonner";

export default function SessionHistory() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const queryClient = useQueryClient();

  // Fetch Sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['workSessions'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      // Fetch last 50 sessions
      return await base44.entities.WorkSession.filter({ created_by: user.email }, '-created_date', 50);
    },
    enabled: isOpen
  });

  // Fetch Projects (for edit)
  const { data: projects } = useQuery({
    queryKey: ['projects-simple'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Project.filter({ created_by: user.email }, 'name');
    },
    enabled: isEditOpen
  });

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.WorkSession.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workSessions']);
      setIsEditOpen(false);
      toast.success("Session updated");
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data) => base44.entities.WorkSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workSessions']);
      setIsEditOpen(false);
      toast.success("Session created");
    }
  });

  const handleSave = () => {
    if (!editingSession.check_in_time) return;
    
    const data = {
      check_in_time: new Date(editingSession.check_in_time).toISOString(),
      check_out_time: editingSession.check_out_time ? new Date(editingSession.check_out_time).toISOString() : null,
      project_id: editingSession.project_id,
      // Recalculate hours roughly if changed manually
      total_hours_worked: editingSession.total_hours_worked ? parseFloat(editingSession.total_hours_worked) : 0,
      status: 'completed'
    };

    if (editingSession.id) {
      updateSessionMutation.mutate({ id: editingSession.id, data });
    } else {
      createSessionMutation.mutate({ ...data, status: 'completed' });
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="text-slate-500">
        <History className="w-4 h-4 mr-2" /> History
      </Button>

      {/* History List Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-center pr-8">
              <DialogTitle>Work History</DialogTitle>
              <Button size="sm" onClick={() => {
                setEditingSession({ check_in_time: '', check_out_time: '', total_hours_worked: 0 });
                setIsEditOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" /> Add Entry
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-2">
            {isLoading ? <div>Loading...</div> : sessions?.map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <div>
                  <div className="font-medium">
                    {format(new Date(session.check_in_time), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(session.check_in_time), 'HH:mm')} - {session.check_out_time ? format(new Date(session.check_out_time), 'HH:mm') : 'Active'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-slate-700">{session.total_hours_worked?.toFixed(2)}h</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingSession(session);
                    setIsEditOpen(true);
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSession?.id ? 'Edit Session' : 'Add Manual Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Start Time</Label>
                 <Input 
                    type="datetime-local" 
                    value={editingSession?.check_in_time ? format(new Date(editingSession.check_in_time), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={e => setEditingSession({...editingSession, check_in_time: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <Label>End Time</Label>
                 <Input 
                    type="datetime-local" 
                    value={editingSession?.check_out_time ? format(new Date(editingSession.check_out_time), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={e => setEditingSession({...editingSession, check_out_time: e.target.value})}
                 />
               </div>
             </div>
             <div className="space-y-2">
               <Label>Project</Label>
               <Select 
                  value={editingSession?.project_id || "none"} 
                  onValueChange={v => setEditingSession({...editingSession, project_id: v === "none" ? null : v})}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select Project" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="none">No Project</SelectItem>
                   {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Hours Worked (Manual Override)</Label>
               <Input 
                  type="number" 
                  step="0.1"
                  value={editingSession?.total_hours_worked || 0}
                  onChange={e => setEditingSession({...editingSession, total_hours_worked: e.target.value})}
               />
             </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}