import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Plus, Trash2, Calendar, CheckCircle2 } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { format, addDays } from 'date-fns';

export default function CheckoutDialog({ open, onOpenChange, onConfirmCheckout }) {
  const [planTomorrow, setPlanTomorrow] = useState(false);
  const [todos, setTodos] = useState([{ title: '', color: '#3b82f6' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const colors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Cyan', value: '#06b6d4' },
  ];

  const addTodo = () => {
    setTodos([...todos, { title: '', color: '#10b981' }]);
  };

  const removeTodo = (index) => {
    setTodos(todos.filter((_, i) => i !== index));
  };

  const updateTodo = (index, field, value) => {
    const updated = [...todos];
    updated[index][field] = value;
    setTodos(updated);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    if (planTomorrow) {
      const validTodos = todos.filter(t => t.title.trim());
      for (const todo of validTodos) {
        await base44.entities.PersonalTodo.create({
          title: todo.title,
          color: todo.color,
          status: 'today',
          scheduled_date: tomorrow,
          order_index: 0
        });
      }
      if (validTodos.length > 0) {
        toast.success(`${validTodos.length} task(s) planned for tomorrow!`);
      }
    }
    
    await onConfirmCheckout();
    setIsSubmitting(false);
    setPlanTomorrow(false);
    setTodos([{ title: '', color: '#3b82f6' }]);
    onOpenChange(false);
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await onConfirmCheckout();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-white/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <LogOut className="w-5 h-5 text-rose-500" />
            Ready to Check Out?
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {!planTomorrow ? (
            <div className="text-center space-y-4">
              <p className="text-slate-600">Would you like to plan tasks for tomorrow before checking out?</p>
              
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setPlanTomorrow(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Yes, Plan Tomorrow
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  disabled={isSubmitting}
                  className="border-slate-200"
                >
                  Skip & Check Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <Calendar className="w-4 h-4" />
                <span>Planning for {format(addDays(new Date(), 1), 'EEEE, MMM d')}</span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {todos.map((todo, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: todo.color }}
                    />
                    <Input
                      placeholder="What do you need to do?"
                      value={todo.title}
                      onChange={(e) => updateTodo(idx, 'title', e.target.value)}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 h-8"
                    />
                    <div className="flex gap-1">
                      {colors.map(c => (
                        <button
                          key={c.value}
                          onClick={() => updateTodo(idx, 'color', c.value)}
                          className={`w-4 h-4 rounded-full transition-all ${todo.color === c.value ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                    {todos.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTodo(idx)}
                        className="h-6 w-6 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={addTodo}
                className="w-full border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Task
              </Button>
            </div>
          )}
        </div>

        {planTomorrow && (
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPlanTomorrow(false)}
            >
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save & Check Out'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}