import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, AlertCircle, Link as LinkIcon, Lock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

export default function KanbanTaskCard({ task, index, onClick, users, dependenciesStatus }) {
  const assignee = users?.find(u => u.id === task.assigned_to);
  const isBlocked = dependenciesStatus?.blocked;
  
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
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return 'text-red-600 font-medium';
    if (isToday(date)) return 'text-orange-600 font-medium';
    return 'text-slate-400';
  };

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isBlocked && task.status === 'todo'}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-3"
          onClick={() => onClick(task)}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}
        >
          <Card className={`border shadow-sm cursor-pointer hover:shadow-md transition-all ${isBlocked ? 'bg-slate-50 border-slate-200' : 'bg-white'}`}>
            <CardContent className="p-3 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isBlocked && <Lock className="w-3 h-3 text-red-500 flex-shrink-0" />}
                    <span className={`font-medium text-sm truncate leading-tight ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={`px-1.5 py-0 text-[10px] h-5 ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                    {task.dependencies?.length > 0 && (
                       <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-5 border-slate-200 text-slate-500 gap-1">
                          <LinkIcon className="w-2 h-2" /> {task.dependencies.length}
                       </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className={`flex items-center gap-1 text-xs ${getDateColor(task.due_date)}`}>
                  {task.due_date && (
                    <>
                      <Calendar className="w-3 h-3" />
                      {format(new Date(task.due_date), 'MMM d')}
                    </>
                  )}
                </div>
                {assignee && (
                  <Avatar className="h-6 w-6 border-2 border-white">
                    <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-600">
                      {assignee.full_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              
              {isBlocked && (
                <div className="text-[10px] text-red-500 flex items-center gap-1">
                   <AlertCircle className="w-3 h-3" /> Blocked by dependencies
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}