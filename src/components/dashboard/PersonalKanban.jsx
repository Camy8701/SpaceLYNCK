import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckSquare, Plus, X, GripVertical, Trash2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { toast } from "sonner";

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'today', title: 'Today', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' }
];

const cardColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Purple', value: '#8b5cf6' },
];

export default function PersonalKanban({ open, onOpenChange }) {
  const [viewMode, setViewMode] = useState('daily'); // daily or weekly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(null); // column id
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('#3b82f6');
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  // Fetch todos
  const { data: todos = [] } = useQuery({
    queryKey: ['personalTodos'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.PersonalTodo.filter({ created_by: user.email }, 'order_index');
    }
  });

  // Filter todos based on view mode
  const filteredTodos = viewMode === 'daily' 
    ? todos.filter(t => !t.scheduled_date || t.scheduled_date === today || t.status === 'backlog')
    : todos;

  const createMutation = useMutation({
    mutationFn: async ({ title, color, status }) => {
      return await base44.entities.PersonalTodo.create({
        title,
        color,
        status,
        scheduled_date: viewMode === 'daily' ? today : format(currentDate, 'yyyy-MM-dd'),
        order_index: filteredTodos.filter(t => t.status === status).length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personalTodos']);
      setNewTaskTitle('');
      setShowAddTask(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.PersonalTodo.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personalTodos']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.PersonalTodo.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personalTodos']);
      toast.success('Task deleted');
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // If moved to a different column
    if (source.droppableId !== destination.droppableId) {
      const newStatus = destination.droppableId;
      const updates = {
        status: newStatus,
        order_index: destination.index
      };
      
      if (newStatus === 'done') {
        updates.completed_at = new Date().toISOString();
      }
      
      updateMutation.mutate({ id: draggableId, data: updates });
    } else {
      // Reorder within same column
      updateMutation.mutate({ 
        id: draggableId, 
        data: { order_index: destination.index } 
      });
    }
  };

  const getTodosForColumn = (columnId) => {
    return filteredTodos
      .filter(t => t.status === columnId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  };

  const navigateDate = (direction) => {
    if (viewMode === 'daily') {
      setCurrentDate(prev => addDays(prev, direction));
    } else {
      setCurrentDate(prev => direction > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/10">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">My Tasks</h2>
                <p className="text-xs text-slate-400">Personal Kanban Board</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    viewMode === 'daily' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    viewMode === 'weekly' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Weekly
                </button>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => navigateDate(-1)}
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-white min-w-[140px] text-center">
                  {viewMode === 'daily' 
                    ? format(currentDate, 'EEE, MMM d')
                    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
                  }
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => navigateDate(1)}
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentDate(new Date())}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Today
                </Button>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 p-4 overflow-hidden">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-4 gap-4 h-full">
                {columns.map(column => (
                  <div key={column.id} className="flex flex-col bg-slate-800/50 rounded-2xl overflow-hidden">
                    {/* Column Header */}
                    <div className={`p-3 ${column.color}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white text-sm">{column.title}</h3>
                        <span className="text-white/70 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          {getTodosForColumn(column.id).length}
                        </span>
                      </div>
                    </div>

                    {/* Column Content */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <ScrollArea className="flex-1">
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-2 min-h-[200px] transition-colors ${
                              snapshot.isDraggingOver ? 'bg-slate-700/50' : ''
                            }`}
                          >
                            {getTodosForColumn(column.id).map((todo, index) => (
                              <Draggable key={todo.id} draggableId={todo.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`mb-2 rounded-xl p-3 transition-all group ${
                                      snapshot.isDragging ? 'shadow-xl scale-105' : ''
                                    }`}
                                    style={{
                                      ...provided.draggableProps.style,
                                      backgroundColor: todo.color || '#3b82f6',
                                    }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                                      >
                                        <GripVertical className="w-4 h-4 text-white/50" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium text-white ${
                                          todo.status === 'done' ? 'line-through opacity-70' : ''
                                        }`}>
                                          {todo.title}
                                        </p>
                                        {todo.scheduled_date && todo.scheduled_date !== today && (
                                          <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(todo.scheduled_date), 'MMM d')}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => deleteMutation.mutate(todo.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
                                      >
                                        <Trash2 className="w-3 h-3 text-white/70" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}

                            {/* Add Task Button / Form */}
                            {showAddTask === column.id ? (
                              <div className="mt-2 p-2 bg-slate-700/50 rounded-xl">
                                <Input
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  placeholder="Task title..."
                                  className="bg-slate-600 border-0 text-white text-sm mb-2"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                                      createMutation.mutate({ 
                                        title: newTaskTitle, 
                                        color: newTaskColor, 
                                        status: column.id 
                                      });
                                    }
                                    if (e.key === 'Escape') {
                                      setShowAddTask(null);
                                      setNewTaskTitle('');
                                    }
                                  }}
                                />
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-1">
                                    {cardColors.map(c => (
                                      <button
                                        key={c.value}
                                        onClick={() => setNewTaskColor(c.value)}
                                        className={`w-5 h-5 rounded-full transition-all ${
                                          newTaskColor === c.value ? 'ring-2 ring-offset-1 ring-offset-slate-700 ring-white' : ''
                                        }`}
                                        style={{ backgroundColor: c.value }}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => { setShowAddTask(null); setNewTaskTitle(''); }}
                                      className="h-7 text-xs text-slate-400"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (newTaskTitle.trim()) {
                                          createMutation.mutate({ 
                                            title: newTaskTitle, 
                                            color: newTaskColor, 
                                            status: column.id 
                                          });
                                        }
                                      }}
                                      className="h-7 text-xs bg-blue-500 hover:bg-blue-600"
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowAddTask(column.id)}
                                className="w-full mt-2 p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                              >
                                <Plus className="w-4 h-4" />
                                Add Task
                              </button>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}