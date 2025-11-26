import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckSquare, Plus, GripVertical, Trash2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function TodoView({ sidebarCollapsed }) {
  const [viewMode, setViewMode] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('#3b82f6');
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['personalTodos'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.PersonalTodo.filter({ created_by: user.email }, 'order_index');
    }
  });

  const filteredTodos = viewMode === 'daily' 
    ? todos.filter(t => !t.scheduled_date || t.scheduled_date === today || t.status === 'backlog' || t.status === 'done')
    : todos;

  const createMutation = useMutation({
    mutationFn: async ({ title, color, status }) => {
      return await base44.entities.PersonalTodo.create({
        title,
        color,
        status,
        scheduled_date: today,
        order_index: filteredTodos.filter(t => t.status === status).length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personalTodos']);
      setNewTaskTitle('');
      setShowAddTask(null);
      toast.success('Task created!');
    },
    onError: (err) => {
      toast.error('Failed to create task: ' + err.message);
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
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/40">
              <CheckSquare className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                My To-Do List
              </h1>
              <p className="text-white/70 text-sm">Personal Kanban Board</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex bg-white/20 backdrop-blur-md rounded-lg p-1 border border-white/30">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 text-sm rounded-md transition-all ${
                  viewMode === 'daily' ? 'bg-white/40 text-slate-800 font-medium' : 'text-white/80 hover:text-white'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-4 py-2 text-sm rounded-md transition-all ${
                  viewMode === 'weekly' ? 'bg-white/40 text-slate-800 font-medium' : 'text-white/80 hover:text-white'
                }`}
              >
                Weekly
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-lg px-2 py-1 border border-white/30">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigateDate(-1)}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-white min-w-[140px] text-center font-medium">
                {viewMode === 'daily' 
                  ? format(currentDate, 'EEE, MMM d')
                  : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
                }
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigateDate(1)}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentDate(new Date())}
                className="text-xs text-white/80 hover:text-white hover:bg-white/20"
              >
                Today
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="text-center py-12 text-white/70">Loading tasks...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {columns.map(column => (
                <div key={column.id} className="flex flex-col bg-white/30 backdrop-blur-md rounded-2xl overflow-hidden border border-white/40 shadow-lg">
                  {/* Column Header */}
                  <div className={`p-4 ${column.color}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">{column.title}</h3>
                      <span className="text-white/80 text-sm bg-white/20 px-2.5 py-0.5 rounded-full">
                        {getTodosForColumn(column.id).length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <ScrollArea className="flex-1 max-h-[60vh]">
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-3 min-h-[200px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-white/20' : ''
                          }`}
                        >
                          {getTodosForColumn(column.id).map((todo, index) => (
                            <Draggable key={todo.id} draggableId={todo.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`mb-3 rounded-xl p-3 transition-all group shadow-md ${
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

                          {/* Add Task Form */}
                          {showAddTask === column.id ? (
                            <div className="mt-2 p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/40">
                              <Input
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Task title..."
                                className="bg-white/70 border-white/40 text-slate-800 text-sm mb-2"
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
                                <div className="flex gap-1.5">
                                  {cardColors.map(c => (
                                    <button
                                      key={c.value}
                                      onClick={() => setNewTaskColor(c.value)}
                                      className={`w-5 h-5 rounded-full transition-all ${
                                        newTaskColor === c.value ? 'ring-2 ring-offset-1 ring-slate-500' : ''
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
                                    className="h-7 text-xs text-slate-600"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={!newTaskTitle.trim() || createMutation.isPending}
                                    onClick={() => {
                                      if (newTaskTitle.trim()) {
                                        createMutation.mutate({ 
                                          title: newTaskTitle, 
                                          color: newTaskColor, 
                                          status: column.id 
                                        });
                                      }
                                    }}
                                    className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                                  >
                                    {createMutation.isPending ? 'Adding...' : 'Add'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowAddTask(column.id)}
                              className="w-full mt-2 p-3 text-slate-600 hover:text-slate-800 hover:bg-white/40 rounded-xl text-sm flex items-center justify-center gap-2 transition-all border border-dashed border-slate-300/50"
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
        )}
      </div>
    </div>
  );
}