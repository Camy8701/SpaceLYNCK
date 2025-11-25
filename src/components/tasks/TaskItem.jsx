import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { base44 } from '@/api/base44Client';
import { Calendar, AlertCircle, Trash2, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TaskAnalysis from "@/components/tasks/TaskAnalysis";
import TaskStatusSelect from "@/components/tasks/TaskStatusSelect";
import AssigneeSelect from "@/components/tasks/AssigneeSelect";
import CommentSection from "@/components/comments/CommentSection";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TaskItem({ task, onToggleComplete }) {
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch Client Name if linked
  const { data: client } = useQuery({
      queryKey: ['client', task.client_id],
      queryFn: async () => {
          if(!task.client_id) return null;
          const res = await base44.entities.Client.filter({ id: task.client_id }, '', 1);
          return res[0];
      },
      enabled: !!task.client_id,
      staleTime: 1000 * 60 * 5
  });

  // Fetch assignees
  const { data: assignees = [] } = useQuery({
    queryKey: ['taskAssignees', task.id, task.assignees],
    queryFn: async () => {
      if (!task.assignees?.length) return [];
      const users = await base44.entities.User.list();
      return users.filter(u => task.assignees.includes(u.id));
    },
    enabled: !!task.assignees?.length
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates) => {
      await base44.entities.Task.update(task.id, updates);
      
      // Send notification for status change
      if (updates.status && updates.status !== task.status && task.assignees?.length) {
        for (const userId of task.assignees) {
          if (userId !== currentUser?.id) {
            await base44.entities.Notification.create({
              user_id: userId,
              type: 'status_change',
              title: 'Task status updated',
              message: `"${task.title}" status changed to ${updates.status.replace('_', ' ')}`,
              action_url: `/ProjectDetails?id=${task.project_id}`,
              project_id: task.project_id,
              related_entity_id: task.id,
              actor_name: currentUser?.full_name
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task updated');
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
       await base44.entities.Task.delete(task.id);
       // Sync Delete to Calendar
       if (task.google_event_id) {
          await base44.functions.invoke('manageCalendarEvent', {
            action: 'delete',
            google_event_id: task.google_event_id
          });
       }
    },
    onSuccess: () => {
       queryClient.invalidateQueries(['tasks']);
       setShowDetails(false);
       toast.success("Task deleted", {
         action: {
           label: "Undo",
           onClick: () => {
              // Restore task (re-create)
              base44.entities.Task.create({
                ...task,
                id: undefined // Let DB assign new ID
              }).then(() => queryClient.invalidateQueries(['tasks']));
           }
         }
       });
    }
  });

  const getPriorityColor = (p) => {
    switch(p) {
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Low': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getDateColor = (dateStr) => {
    if (!dateStr) return 'text-slate-400';
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return 'text-red-600 font-medium';
    if (isToday(date)) return 'text-orange-600 font-medium';
    if (isTomorrow(date)) return 'text-yellow-600';
    return 'text-slate-400';
  };

  const getDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return 'Overdue';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 md:p-3 bg-white rounded-xl md:rounded-lg border border-slate-200 hover:shadow-sm transition-all group active:scale-[0.99]">
        <Checkbox 
          checked={task.status === 'completed'} 
          onCheckedChange={() => onToggleComplete(task)}
          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
        />
        
        <div 
          className="flex-1 cursor-pointer min-w-0"
          onClick={() => setShowDetails(true)}
        >
          <div className={`font-medium truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.title}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2 md:mt-1 text-xs">
            <Badge variant="outline" className={`px-1.5 py-0.5 md:py-0 h-auto md:h-5 ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={`px-1.5 py-0.5 md:py-0 h-auto md:h-5 ${getStatusColor(task.status)}`}>
              {task.status === 'in_progress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : task.status}
            </Badge>
            {task.due_date && (
              <div className={`flex items-center gap-1 ${getDateColor(task.due_date)}`}>
                <Calendar className="w-3 h-3" />
                {getDateLabel(task.due_date)}
              </div>
            )}
            {task.comment_count > 0 && (
              <div className="flex items-center gap-1 text-slate-400">
                <MessageSquare className="w-3 h-3" />
                {task.comment_count}
              </div>
            )}
            {assignees.length > 0 && (
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map(user => (
                  <Avatar key={user.id} className="w-5 h-5 border border-white">
                    <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600 border border-white">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            )}
            {client && (
               <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                   {client.name}
               </Badge>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] rounded-xl md:w-full md:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mr-6">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <div className="flex gap-2">
                <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                  onClick={() => {
                    if(confirm('Delete this task?')) deleteTaskMutation.mutate();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <DialogDescription>
              Created {format(new Date(task.created_date), 'PPP')}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="mt-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments" className="gap-1">
                <MessageSquare className="w-3 h-3" />
                Comments {task.comment_count > 0 && `(${task.comment_count})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 py-4">
              {/* Status */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">Status</h4>
                <TaskStatusSelect 
                  value={task.status}
                  onChange={(status) => updateTaskMutation.mutate({ status })}
                />
              </div>

              {/* Assignees */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">Assignees</h4>
                <AssigneeSelect
                  projectId={task.project_id}
                  value={task.assignees || []}
                  onChange={(assignees) => updateTaskMutation.mutate({ assignees })}
                />
              </div>

              {task.description && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Description</h4>
                  <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-md text-sm">
                    {task.description}
                  </p>
                </div>
              )}

              {task.due_date && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Due Date</h4>
                  <p className="text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(task.due_date), 'PPPP')}
                  </p>
                </div>
              )}

              <TaskAnalysis 
                task={task} 
                onUpdate={() => {
                   queryClient.invalidateQueries(['tasks']);
                   setShowDetails(false);
                }} 
              />
            </TabsContent>

            <TabsContent value="comments" className="py-4">
              <CommentSection 
                entityType="task"
                entityId={task.id}
                projectId={task.project_id}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}