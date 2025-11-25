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
import AssigneeSelect from "@/components/tasks/AssigneeSelect";

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
  const [assignees, setAssignees] = useState([]);
  const [clientId, setClientId] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);



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
      const finalProjectId = projectId || selectedProjectId;
      const payload = {
        title,
        description,
        priority,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        branch_id: branchId || selectedBranchId,
        project_id: finalProjectId,
        status: 'todo',
        assigned_to: assignees[0] || undefined,
        assignees: assignees,
        client_id: clientId === 'none' ? undefined : clientId
      };

      const newTask = await base44.entities.Task.create(payload);
      
      // Notification for all assignees
      if (assignees.length > 0) {
         const currentUser = await base44.auth.me();
         for (const userId of assignees) {
           if (currentUser.id !== userId) {
               await base44.entities.Notification.create({
                   user_id: userId,
                   type: 'task_assigned',
                   title: 'New Task Assigned',
                   message: `${currentUser.full_name} assigned you task: ${title}`,
                   action_url: `/ProjectDetails?id=${finalProjectId}`,
                   related_entity_id: newTask.id,
                   project_id: finalProjectId,
                   actor_name: currentUser.full_name
               });
           }
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
      setAssignees([]);
    } catch (error) {
      toast.error("Failed to create task");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full sm:h-auto sm:max-w-[425px] p-6 rounded-none sm:rounded-2xl overflow-y-auto flex flex-col gap-0 bg-black/60 backdrop-blur-2xl border-white/20 text-white" style={{maxHeight: '100dvh'}}>
        <DialogHeader className="mb-4 flex-shrink-0">
          <DialogTitle className="text-white text-xl">Add New Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
        <div className="grid gap-4 py-4">
          {/* Project Selector for Global Create */}
          {!projectId && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-white/90">Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                       <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-white/30"><SelectValue placeholder="Select Project" /></SelectTrigger>
                       <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20 text-white">
                          {projects?.map(p => (
                              <SelectItem key={p.id} value={p.id} className="focus:bg-white/10 focus:text-white">{p.name}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                </div>
                {/* Branch Selector (Optional but useful if user wants to target specific department) */}
                <div className="space-y-2">
                    <Label className="text-white/90">Department</Label>
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={!branches?.length}>
                       <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-white/30"><SelectValue placeholder={branches?.length ? "Select Department" : "No departments"} /></SelectTrigger>
                       <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20 text-white">
                          {branches?.map(b => (
                              <SelectItem key={b.id} value={b.id} className="focus:bg-white/10 focus:text-white">{b.name}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                </div>
             </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/90">Title <span className="text-rose-400">*</span></Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review Q3 Report" 
              autoFocus
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="desc" className="text-white/90">Description</Label>
            <Textarea 
              id="desc" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..." 
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30"
            />
          </div>

          <div className="space-y-2">
              <Label className="text-white/90">Assignees</Label>
              <AssigneeSelect
                projectId={projectId || selectedProjectId}
                value={assignees}
                onChange={setAssignees}
              />
          </div>

          <div className="space-y-2">
              <Label className="text-white/90">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-white/30"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20 text-white">
                      <SelectItem value="none" className="focus:bg-white/10 focus:text-white">None</SelectItem>
                      {clients?.map(c => (
                          <SelectItem key={c.id} value={c.id} className="focus:bg-white/10 focus:text-white">{c.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/90">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white/10 border-white/20 text-white hover:bg-white/20",
                      !dueDate && "text-white/50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-black/90 backdrop-blur-xl border-white/20">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-white/90">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-white/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20 text-white">
                  <SelectItem value="Low" className="focus:bg-white/10 focus:text-white">Low</SelectItem>
                  <SelectItem value="Normal" className="focus:bg-white/10 focus:text-white">Normal</SelectItem>
                  <SelectItem value="High" className="focus:bg-white/10 focus:text-white">High</SelectItem>
                  <SelectItem value="Urgent" className="focus:bg-white/10 focus:text-white">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        </div>
        <DialogFooter className="flex-shrink-0 mt-auto sm:mt-0 gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none border-white/20 text-white hover:bg-white/10" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 sm:flex-none bg-rose-500 hover:bg-rose-600 text-white">Create Task</Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
        );
}