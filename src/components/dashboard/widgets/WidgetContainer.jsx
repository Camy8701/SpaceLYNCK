import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Settings } from "lucide-react";

// Memoized to prevent unnecessary re-renders of widgets
const WidgetContainer = React.memo(function WidgetContainer({
  title,
  icon: Icon,
  children,
  onRemove,
  isDragging,
  dragHandleProps
}) {
  return (
    <Card className={`bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl overflow-hidden transition-all ${isDragging ? 'shadow-2xl scale-105' : 'shadow-lg'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-white/30">
        <div className="flex items-center gap-2">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/30 rounded">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
          {Icon && <Icon className="w-4 h-4 text-slate-600" />}
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </Card>
  );
});

export default WidgetContainer;