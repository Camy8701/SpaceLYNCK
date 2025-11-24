import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { Calendar, AlertCircle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

export default function TaskItem({ task, onToggleComplete }) {
  const [showDetails, setShowDetails] = useState(false);

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

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all group">
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
          <div className="flex items-center gap-3 mt-1 text-xs">
            <Badge variant="outline" className={`px-1.5 py-0 h-5 ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </Badge>
            {task.due_date && (
              <div className={`flex items-center gap-1 ${getDateColor(task.due_date)}`}>
                <Calendar className="w-3 h-3" />
                {getDateLabel(task.due_date)}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between mr-6">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
            </div>
            <DialogDescription>
              Created {format(new Date(task.created_date), 'PPP')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="text-sm font-medium text-slate-500 mb-1">Status</h4>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
              }`}>
                {task.status === 'completed' ? 'Completed' : 'To Do'}
              </div>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}