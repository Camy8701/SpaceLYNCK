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
        branch_id: branchId,
        project_id: projectId,
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review Q3 Report" 
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}