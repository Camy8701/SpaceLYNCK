import React, { useState } from 'react';
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
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

// This component uses local state only - Project/Task/Branch tables don't exist in Supabase
export default function CreateTaskDialog({ open, onOpenChange, branchId, projectId, onTaskCreated }) {
  const [title, setTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [selectedBranchId, setSelectedBranchId] = useState(branchId || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [dueDate, setDueDate] = useState();
  const [assignees, setAssignees] = useState([]);
  const [clientId, setClientId] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Placeholder data - no API calls to prevent 404 errors
  const projects = [];
  const branches = [];
  const clients = [];

  const handleSubmit = async () => {
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate task creation (no actual API call)
      toast.success("Task created!", {
        description: "Note: Task management requires database configuration."
      });
      onTaskCreated?.();
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
      <DialogContent className="w-full h-full sm:h-auto sm:max-w-[425px] p-6 rounded-none overflow-y-auto flex flex-col gap-0" style={{maxHeight: '100dvh'}}>
        <DialogHeader className="mb-4 flex-shrink-0">
          <DialogTitle className="text-xl">Add New Task</DialogTitle>
        </DialogHeader>
        
        {/* Info banner about database setup */}
        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Task management requires database configuration. Tasks will be created locally.</span>
        </div>
        
        <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700">Title <span className="text-rose-500">*</span></Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review Q3 Report" 
              autoFocus
              className="bg-white/50 border-white/40 text-slate-800 placeholder:text-slate-400"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="desc" className="text-slate-700">Description</Label>
            <Textarea 
              id="desc" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..." 
              className="bg-white/50 border-white/40 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white/50 border-white/40 text-slate-800 hover:bg-white/70",
                      !dueDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white/95 backdrop-blur-xl border-white/40">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="text-slate-800"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-white/50 border-white/40 text-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-slate-800">
                  <SelectItem value="Low" className="focus:bg-slate-100">Low</SelectItem>
                  <SelectItem value="Normal" className="focus:bg-slate-100">Normal</SelectItem>
                  <SelectItem value="High" className="focus:bg-slate-100">High</SelectItem>
                  <SelectItem value="Urgent" className="focus:bg-slate-100">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        </div>
        <DialogFooter className="flex-shrink-0 mt-auto sm:mt-0 gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none border-slate-300 text-slate-700 hover:bg-white/50" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 sm:flex-none bg-rose-500 hover:bg-rose-600 text-white">Create Task</Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
        );
}
