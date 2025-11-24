import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, ArrowRight, Plus, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

export default function EndOfDayReview({ open, onOpenChange, session, onCheckOutComplete }) {
  const [step, setStep] = useState(1);
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [addTaskDecision, setAddTaskDecision] = useState("no");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [tasksCreatedCount, setTasksCreatedCount] = useState(0);
  const queryClient = useQueryClient();

  // --- Data Fetching ---

  // 1. Fetch Project Tasks for Summary
  const { data: projectTasks } = useQuery({
    queryKey: ['end-of-day-tasks', session?.project_id],
    queryFn: async () => {
      if (!session?.project_id) return [];
      const now = new Date();
      // Assuming we filter by project. 
      // In a real app, we'd filter by 'updated_at' today for completed tasks, 
      // but standard filter might be limited. We'll fetch active/completed of project.
      return await base44.entities.Task.filter({ project_id: session.project_id });
    },
    enabled: !!session?.project_id && open
  });

  // 2. Fetch Branches for Planning
  const { data: branches } = useQuery({
    queryKey: ['end-of-day-branches', session?.project_id],
    queryFn: async () => {
      if (!session?.project_id) return [];
      return await base44.entities.Branch.filter({ project_id: session.project_id }, 'order_index');
    },
    enabled: !!session?.project_id && open
  });

  // --- Computed Stats ---
  
  const today = new Date().toISOString().split('T')[0];
  const completedToday = projectTasks?.filter(t => t.status === 'completed' && t.completed_at?.startsWith(today)).length || 0;
  const pendingTotal = projectTasks?.filter(t => t.status === 'todo').length || 0;
  const hoursWorked = session?.total_hours_worked?.toFixed(2) || "0.00";

  const currentBranch = branches?.[currentBranchIndex];

  // --- Mutations ---

  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => await base44.entities.Task.create(taskData),
    onSuccess: () => {
      setTasksCreatedCount(prev => prev + 1);
      setNewTaskTitle("");
      toast.success("Task added for tomorrow");
      queryClient.invalidateQueries(['tasks']);
    }
  });

  // --- Handlers ---

  const handleNextStep = () => {
    if (step === 1) {
      // Start Branch Planning if branches exist, else skip to review
      if (branches && branches.length > 0) {
        setStep(2);
        setCurrentBranchIndex(0);
        setAddTaskDecision("no");
      } else {
        setStep(3);
      }
    } else if (step === 2) {
      // Move to next branch or finish
      if (currentBranchIndex < (branches?.length || 0) - 1) {
        setCurrentBranchIndex(prev => prev + 1);
        setAddTaskDecision("no");
        setNewTaskTitle("");
      } else {
        setStep(3);
      }
    }
  };

  const handleQuickAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    createTaskMutation.mutate({
      title: newTaskTitle,
      project_id: session.project_id,
      branch_id: currentBranch.id,
      due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      priority: 'Normal',
      status: 'todo'
    });
  };

  const handleFinish = () => {
    onCheckOutComplete(); // Calls the parent's check-out logic
    // Dialog closes via parent state change
  };

  // --- Render ---

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) { /* Prevent closing by clicking outside */ } }}>
      <DialogContent className="sm:max-w-lg" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {step === 1 && "Today's Summary 🌅"}
            {step === 2 && "Plan for Tomorrow 📅"}
            {step === 3 && "All Set! 🎉"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {/* STEP 1: SUMMARY */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <div className="text-2xl font-bold text-indigo-600">{hoursWorked}h</div>
                  <div className="text-xs text-indigo-400 uppercase font-bold mt-1">Worked</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{completedToday}</div>
                  <div className="text-xs text-green-400 uppercase font-bold mt-1">Completed</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-600">{pendingTotal}</div>
                  <div className="text-xs text-amber-400 uppercase font-bold mt-1">Pending</div>
                </div>
              </div>
              <p className="text-center text-slate-500">
                Great job today! Let's take a moment to review your progress before signing off.
              </p>
            </div>
          )}

          {/* STEP 2: BRANCH PLANNING */}
          {step === 2 && currentBranch && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4" key={currentBranch.id}>
               <div className="text-center">
                 <h3 className="text-lg font-medium text-slate-900">Branch: {currentBranch.name}</h3>
                 <p className="text-sm text-slate-500">
                   {currentBranchIndex + 1} of {branches.length}
                 </p>
               </div>

               <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-slate-600">Completed today:</span>
                   <span className="font-medium">{projectTasks?.filter(t => t.branch_id === currentBranch.id && t.status === 'completed' && t.completed_at?.startsWith(today)).length} tasks</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-600">Still pending:</span>
                   <span className="font-medium">{projectTasks?.filter(t => t.branch_id === currentBranch.id && t.status === 'todo').length} tasks</span>
                 </div>
               </div>

               <div className="space-y-3">
                 <Label>Add tasks for tomorrow?</Label>
                 <RadioGroup 
                    value={addTaskDecision} 
                    onValueChange={setAddTaskDecision}
                    className="flex gap-4"
                  >
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="yes" id="r1" />
                     <Label htmlFor="r1">Yes</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="no" id="r2" />
                     <Label htmlFor="r2">No</Label>
                   </div>
                 </RadioGroup>

                 {addTaskDecision === "yes" && (
                   <div className="flex gap-2 mt-2">
                     <Input 
                       placeholder="Task title..." 
                       value={newTaskTitle}
                       onChange={(e) => setNewTaskTitle(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleQuickAddTask()}
                     />
                     <Button size="icon" onClick={handleQuickAddTask} disabled={createTaskMutation.isPending}>
                       {createTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                     </Button>
                   </div>
                 )}
               </div>
             </div>
          )}

          {/* STEP 3: CONFIRMATION */}
          {step === 3 && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Review Complete!</h3>
                <p className="text-slate-500 mt-2">
                  You've created {tasksCreatedCount} new tasks for tomorrow.<br/>
                  Time to rest and recharge.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step < 3 ? (
            <Button onClick={handleNextStep} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {step === 1 ? "Start Planning" : "Next Step"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} className="w-full bg-green-600 hover:bg-green-700" size="lg">
              Finish & Check Out
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}