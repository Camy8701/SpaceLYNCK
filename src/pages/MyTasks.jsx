import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Calendar, ArrowRight, Filter, Plus } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function MyTasks() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('todo');
  const { user } = useAuth();

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['my-tasks', filter, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        // Try to fetch tasks from Supabase
        let query = supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
        
        if (filter !== 'all') {
          query = query.eq('status', filter);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          // Table doesn't exist yet - return empty array
          console.log('Tasks table not found, showing empty state');
          return [];
        }
        
        return data || [];
      } catch (err) {
        console.log('Error fetching tasks:', err);
        return [];
      }
    },
    enabled: !!user?.id
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (task) => {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-tasks']);
    }
  });

  const getDateColor = (dateStr) => {
    if (!dateStr) return 'text-slate-400';
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return 'text-red-600 font-medium';
    if (isToday(date)) return 'text-orange-600 font-medium';
    if (isTomorrow(date)) return 'text-amber-600';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
        <Link to="/projects" className="text-sm text-indigo-600 font-medium flex items-center">
            Projects <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      <Tabs defaultValue="todo" className="w-full" onValueChange={setFilter}>
        <TabsList className="grid w-full grid-cols-3 mb-4 bg-white/30 p-1 rounded-full">
          <TabsTrigger 
            value="todo" 
            className="rounded-full data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            To Do
          </TabsTrigger>
          <TabsTrigger 
            value="in_progress"
            className="rounded-full data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            Doing
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="rounded-full data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            Done
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
         <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)}
         </div>
      ) : tasks?.length === 0 ? (
         <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No tasks found.</p>
         </div>
      ) : (
         <div className="space-y-3">
            {tasks.map(task => (
               <Card key={task.id} className="active:scale-[0.99] transition-transform">
                  <CardContent className="p-4 flex gap-4 items-start">
                      <button 
                        onClick={() => toggleTaskMutation.mutate(task)}
                        className="mt-1 flex-shrink-0"
                      >
                          {task.status === 'completed' ? 
                             <CheckCircle2 className="w-6 h-6 text-green-500" /> : 
                             <Circle className="w-6 h-6 text-slate-300 hover:text-indigo-600" />
                          }
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => {/* Open details if needed */}}>
                          <h3 className={`font-medium text-slate-900 truncate ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                             {task.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs">
                             {task.due_date && (
                                <span className={`flex items-center gap-1 ${getDateColor(task.due_date)}`}>
                                   <Calendar className="w-3 h-3" />
                                   {format(new Date(task.due_date), 'MMM d')}
                                </span>
                             )}
                             <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none h-5 px-1.5">
                                {task.priority}
                             </Badge>
                          </div>
                      </div>
                  </CardContent>
               </Card>
            ))}
         </div>
      )}
    </div>
  );
}