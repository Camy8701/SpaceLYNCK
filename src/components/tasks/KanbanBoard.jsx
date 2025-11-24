import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, ArrowUpCircle, CheckCircle2, Circle } from "lucide-react";
import KanbanTaskCard from './KanbanTaskCard';
import CreateTaskDialog from './CreateTaskDialog';
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import TaskAnalysis from "@/components/tasks/TaskAnalysis";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

const COLUMNS = {
  todo: { id: 'todo', title: 'To Do', icon: Circle, color: 'text-slate-500' },
  in_progress: { id: 'in_progress', title: 'In Progress', icon: ArrowUpCircle, color: 'text-blue-500' },
  completed: { id: 'completed', title: 'Done', icon: CheckCircle2, color: 'text-green-500' }
};

export default function KanbanBoard({ projectId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [dependencyToAdd, setDependencyToAdd] = useState("none");

  // Fetch Data
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => await base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => await base44.entities.User.list()
  });

  // Mutation for Drag & Drop
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
        return await base44.entities.Task.update(id, { 
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['tasks', projectId]);
    },
    onError: () => {
        toast.error("Failed to update status");
    }
  });

  const addDependencyMutation = useMutation({
      mutationFn: async ({ taskId, dependencyId }) => {
          const task = tasks.find(t => t.id === taskId);
          const currentDeps = task.dependencies || [];
          if(currentDeps.includes(dependencyId)) return;
          
          return await base44.entities.Task.update(taskId, {
              dependencies: [...currentDeps, dependencyId]
          });
      },
      onSuccess: () => {
          queryClient.invalidateQueries(['tasks', projectId]);
          toast.success("Dependency added");
          setDependencyToAdd("none");
      }
  });

  const removeDependencyMutation = useMutation({
      mutationFn: async ({ taskId, dependencyId }) => {
          const task = tasks.find(t => t.id === taskId);
          const currentDeps = task.dependencies || [];
          return await base44.entities.Task.update(taskId, {
              dependencies: currentDeps.filter(id => id !== dependencyId)
          });
      },
      onSuccess: () => {
          queryClient.invalidateQueries(['tasks', projectId]);
          toast.success("Dependency removed");
      }
  });

  // Dependency Logic
  const getDependencyStatus = (task) => {
      if (!task.dependencies || task.dependencies.length === 0) return { blocked: false };
      
      const blockingTasks = tasks.filter(t => 
          task.dependencies.includes(t.id) && t.status !== 'completed'
      );
      
      return {
          blocked: blockingTasks.length > 0,
          blockingTasks
      };
  };

  // Filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
        const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
        const matchesAssignee = assigneeFilter === "all" || t.assigned_to === assigneeFilter;
        return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, search, priorityFilter, assigneeFilter]);

  const columns = useMemo(() => {
      const cols = { todo: [], in_progress: [], completed: [] };
      filteredTasks.forEach(t => {
          if (cols[t.status]) cols[t.status].push(t);
      });
      return cols;
  }, [filteredTasks]);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = tasks.find(t => t.id === draggableId);
    const newStatus = destination.droppableId;

    // Check dependencies before moving to in_progress or completed
    if (newStatus !== 'todo') {
        const { blocked, blockingTasks } = getDependencyStatus(task);
        if (blocked) {
            toast.error(`Cannot move task. Waiting on: ${blockingTasks.map(t => t.title).join(', ')}`);
            return;
        }
    }

    // Optimistic update handled by React Query invalidation in real app, 
    // but for UI smoothness we assume success or revert on error (which react-query handles)
    updateStatusMutation.mutate({ id: draggableId, status: newStatus });
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-lg border">
          <div className="flex flex-1 gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                      placeholder="Search tasks..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                  />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px]">
                      <Filter className="w-3 h-3 mr-2 text-slate-400" />
                      <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-[130px]">
                      <UsersIcon className="w-3 h-3 mr-2 text-slate-400" />
                      <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto">
              <div className="flex gap-6 min-w-[800px] h-full">
                  {Object.values(COLUMNS).map(col => (
                      <div key={col.id} className="flex-1 flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/60">
                          <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white/50 rounded-t-xl backdrop-blur-sm">
                              <div className="flex items-center gap-2">
                                  <col.icon className={`w-4 h-4 ${col.color}`} />
                                  <h3 className="font-semibold text-slate-700 text-sm">{col.title}</h3>
                                  <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 hover:bg-slate-100">
                                      {columns[col.id]?.length || 0}
                                  </Badge>
                              </div>
                          </div>
                          <Droppable droppableId={col.id}>
                              {(provided, snapshot) => (
                                  <div
                                      {...provided.droppableProps}
                                      ref={provided.innerRef}
                                      className={`flex-1 p-3 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                                  >
                                      {columns[col.id]?.map((task, index) => (
                                          <KanbanTaskCard 
                                              key={task.id} 
                                              task={task} 
                                              index={index} 
                                              users={users}
                                              onClick={setSelectedTask}
                                              dependenciesStatus={getDependencyStatus(task)}
                                          />
                                      ))}
                                      {provided.placeholder}
                                  </div>
                              )}
                          </Droppable>
                      </div>
                  ))}
              </div>
          </div>
      </DragDropContext>

      {/* Task Details Dialog (Simplified for Dependency Management) */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {selectedTask && (
                  <>
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-start gap-4">
                            <span className="text-xl leading-tight">{selectedTask.title}</span>
                            <Badge className={selectedTask.priority === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}>
                                {selectedTask.priority}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Status: <span className="capitalize font-medium text-slate-900">{selectedTask.status.replace('_', ' ')}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {selectedTask.description && (
                             <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                                 {selectedTask.description}
                             </div>
                        )}

                        {/* Dependencies Section */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" /> Dependencies
                            </h4>
                            
                            {/* List Existing */}
                            {selectedTask.dependencies && selectedTask.dependencies.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedTask.dependencies.map(depId => {
                                        const depTask = tasks.find(t => t.id === depId);
                                        if(!depTask) return null;
                                        return (
                                            <div key={depId} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                                                <div className="flex items-center gap-2">
                                                    {depTask.status === 'completed' ? 
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                                                        <Circle className="w-4 h-4 text-slate-300" />
                                                    }
                                                    <span className={depTask.status === 'completed' ? 'line-through text-slate-400' : ''}>
                                                        {depTask.title}
                                                    </span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="xs" 
                                                    className="h-6 px-2 text-red-500 hover:bg-red-50"
                                                    onClick={() => removeDependencyMutation.mutate({ taskId: selectedTask.id, dependencyId: depId })}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No dependencies set.</p>
                            )}

                            {/* Add New */}
                            <div className="flex gap-2 mt-2">
                                <Select value={dependencyToAdd} onValueChange={setDependencyToAdd}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Add dependency..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select task...</SelectItem>
                                        {tasks
                                            .filter(t => t.id !== selectedTask.id && !selectedTask.dependencies?.includes(t.id))
                                            .map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button 
                                    size="sm" 
                                    disabled={dependencyToAdd === 'none'}
                                    onClick={() => addDependencyMutation.mutate({ taskId: selectedTask.id, dependencyId: dependencyToAdd })}
                                >
                                    Add
                                </Button>
                            </div>
                        </div>
                        
                        <div className="border-t pt-4">
                            <TaskAnalysis task={selectedTask} onUpdate={() => queryClient.invalidateQueries(['tasks'])} />
                        </div>
                    </div>
                  </>
              )}
          </DialogContent>
      </Dialog>

      <CreateTaskDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen} 
          branchId={null} // Project-wide task
          projectId={projectId}
          onTaskCreated={() => queryClient.invalidateQueries(['tasks', projectId])}
      />
    </div>
  );
}

// Simple Icon component helper if missing
const UsersIcon = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

// Link Icon helper
const LinkIcon = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);