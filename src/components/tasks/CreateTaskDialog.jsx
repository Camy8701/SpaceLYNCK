import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export default function CreateTaskDialog({ open, onOpenChange, branchId, projectId, onTaskCreated }) {
  const [title, setTitle] = useState("");
  
  // Fetch Projects for Global Create mode (where projectId is null)
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => await base44.entities.Project.list(),
    enabled: !projectId // Only fetch if we don't have a pre-selected project
  });
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || (projects?.[0]?.id || ""));

  // Fetch branches for the selected project to ensure we have a branch_id
  const { data: branches } = useQuery({
     queryKey: ['branches', selectedProjectId],
     queryFn: async () => {
        if(!selectedProjectId) return [];
        return await base44.entities.Branch.filter({ project_id: selectedProjectId }, 'order_index');
     },
     enabled: !!selectedProjectId
  });

  const [selectedBranchId, setSelectedBranchId] = useState(branchId || "");

  // Effect to update selected project if projects load and we didn't have one
  React.useEffect(() => {
      if (!projectId && projects?.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projects[0].id);
      }
  }, [projects, projectId]);

  // Auto-select first branch if not provided
  React.useEffect(() => {
     if (branchId) {
         setSelectedBranchId(branchId);
     } else if (branches?.length > 0) {
         setSelectedBranchId(branches[0].id);
     }
  }, [branches, branchId]);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [dueDate, setDueDate] = useState();
  const [assignee, setAssignee] = useState("");
  const [clientId, setClientId] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Users for assignment
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => await base44.entities.User.list()
  });

  // Fetch Clients
  const { data: clients } = useQuery({
    queryKey: ['clients', projectId],
    queryFn: async () => await base44.entities.Client.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const handleSubmit = async () => {
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        description,
        priority,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        branch_id: branchId || selectedBranchId,
        // Use selectedProjectId if projectId prop is null (Global Create mode)
        project_id: projectId || selectedProjectId,
        status: 'todo',
        assigned_to: assignee || undefined,
        client_id: clientId === 'none' ? undefined : clientId
      };

      const newTask = await base44.entities.Task.create(payload);
      
      // Notification for assignment
      if (assignee) {
         const currentUser = await base44.auth.me();
         if (currentUser.id !== assignee) {
             await base44.entities.Notification.create({
                 user_id: assignee,
                 type: 'task_assigned',
                 title: 'New Task Assigned',
                 message: `${currentUser.full_name} assigned you task: ${title}`,
                 action_url: `/ProjectDetails?id=${projectId}`,
                 related_entity_id: newTask.id
             });
         }
      }

      // Sync to Calendar
      if (dueDate) {
         base44.functions.invoke('manageCalendarEvent', { 
           action: 'create', 
           task: newTask 
         }).catch(err => console.error("Sync failed", err));
      }
      
      toast.success("Task created!");
      onTaskCreated();
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setPriority("Normal");
      setDueDate(undefined);
    } catch (error) {
      toast.error("Failed to create task");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full sm:h-auto sm:max-w-[425px] p-6 rounded-none sm:rounded-xl overflow-y-auto flex flex-col gap-0" style={{maxHeight: '100dvh'}}>
        <DialogHeader className="mb-4 flex-shrink-0">
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
        <div className="grid gap-4 py-4">
          {/* Project Selector for Global Create */}
          {!projectId && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                       <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                       <SelectContent>
                          {projects?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                </div>
                {/* Branch Selector (Optional but useful if user wants to target specific department) */}
                <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={!branches?.length}>
                       <SelectTrigger><SelectValue placeholder={branches?.length ? "Select Department" : "No departments"} /></SelectTrigger>
                       <SelectContent>
                          {branches?.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                </div>
             </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review Q3 Report" 
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea 
              id="desc" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..." 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                      <SelectContent>
                          {users?.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {clients?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        </div>
        <DialogFooter className="flex-shrink-0 mt-auto sm:mt-0 gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 sm:flex-none bg-indigo-600">Create Task</Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
        );
}