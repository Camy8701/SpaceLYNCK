import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Circle, Play, AlertTriangle, CheckCircle } from "lucide-react";

const STATUS_CONFIG = {
  todo: { label: 'To Do', icon: Circle, color: 'text-slate-500', bg: 'bg-slate-100' },
  in_progress: { label: 'In Progress', icon: Play, color: 'text-blue-600', bg: 'bg-blue-100' },
  blocked: { label: 'Blocked', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  completed: { label: 'Done', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' }
};

export default function TaskStatusSelect({ value, onChange, disabled }) {
  const config = STATUS_CONFIG[value] || STATUS_CONFIG.todo;
  const Icon = config.icon;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`w-[140px] h-8 ${config.bg} border-0`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className={config.color}>{config.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const StatusIcon = cfg.icon;
          return (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                <span>{cfg.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export { STATUS_CONFIG };