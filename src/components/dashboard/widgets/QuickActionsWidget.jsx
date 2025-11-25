import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare, Sparkles, Calendar } from "lucide-react";
import { createPageUrl } from '@/utils';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import { toast } from "sonner";

export default function QuickActionsWidget({ onCreateProject }) {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { 
      label: 'New Project', 
      icon: Plus, 
      color: 'bg-blue-400/30',
      onClick: onCreateProject 
    },
    { 
      label: 'Add Task', 
      icon: CheckSquare, 
      color: 'bg-amber-400/30',
      onClick: () => setShowTaskDialog(true)
    },
    { 
      label: 'Ask Jarvis', 
      icon: Sparkles, 
      color: 'bg-purple-400/30',
      onClick: () => navigate(createPageUrl('Brain'))
    },
    { 
      label: 'Calendar', 
      icon: Calendar, 
      color: 'bg-green-400/30',
      onClick: () => navigate(createPageUrl('MyTasks'))
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={action.onClick}
            className="h-auto py-3 flex flex-col items-center gap-2 bg-white/30 border-white/30 hover:bg-white/50"
          >
            <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
              <action.icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-slate-700">{action.label}</span>
          </Button>
        ))}
      </div>

      <CreateTaskDialog 
        open={showTaskDialog} 
        onOpenChange={setShowTaskDialog}
        branchId={null}
        projectId={null}
        onTaskCreated={() => toast.success('Task created!')}
      />
    </>
  );
}