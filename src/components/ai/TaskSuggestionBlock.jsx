import React, { useState } from 'react';
import { Check, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function TaskSuggestionBlock({ tasks, projectId }) {
    const [createdTasks, setCreatedTasks] = useState(new Set());
    const [loading, setLoading] = useState(null); // index of task being created
    const queryClient = useQueryClient();

    const handleCreateTask = async (task, index) => {
        setLoading(index);
        try {
            // Determine project ID - handle 'global' case or explicit ID
            // If global and no project ID, we might need to ask user (not handled here for simplicity, defaults to first available or error)
            // For now, we assume if projectId is 'global', user might need to pick, but let's try to just create it and let backend validation handle or default.
            // Actually, Task.create requires project_id. 
            // If we are in global context, we can't easily create without picking a project.
            // However, the AI usually suggests tasks in context of a project if we are in one.
            // If global, we might skip for now or prompt error.
            
            const targetProjectId = projectId === 'global' ? undefined : projectId;
            
            if (!targetProjectId) {
                toast.error("Cannot create task in global context directly. Please go to a project.");
                setLoading(null);
                return;
            }

            await base44.entities.Task.create({
                title: task.title,
                description: task.description,
                priority: task.priority || 'Normal',
                status: 'todo',
                project_id: targetProjectId,
                // branch_id is required by schema? 
                // Let's check schema: required: ["project_id", "branch_id", "title", "priority", "status"]
                // We need a branch_id. We can fetch branches for the project and pick first.
            });
            
            // Since we can't fetch branches easily inside this component without props or extra query,
            // let's assume we can fetch them or we need to pass branch_id.
            // Actually, let's just try to fetch the first branch of the project here.
            
            setCreatedTasks(prev => new Set(prev).add(index));
            toast.success("Task created");
            queryClient.invalidateQueries(['tasks']);
        } catch (error) {
            // Fallback: if branch_id is missing error
            if (error.message.includes('branch_id')) {
                 // Try to fetch branches and retry? 
                 // For simplicity, let's try to get branches first.
                 try {
                    const branches = await base44.entities.Branch.filter({ project_id: projectId }, '', 1);
                    if (branches.length > 0) {
                        await base44.entities.Task.create({
                            title: task.title,
                            description: task.description,
                            priority: task.priority || 'Normal',
                            status: 'todo',
                            project_id: projectId,
                            branch_id: branches[0].id
                        });
                        setCreatedTasks(prev => new Set(prev).add(index));
                        toast.success("Task created");
                        queryClient.invalidateQueries(['tasks']);
                        setLoading(null);
                        return;
                    }
                 } catch (e) {}
            }
            console.error(error);
            toast.error("Failed to create task");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="mt-4 space-y-2 bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
            <h4 className="text-sm font-medium text-indigo-400 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Suggested Tasks
            </h4>
            <div className="grid gap-2">
                {tasks.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 group hover:border-indigo-500/30 transition-all">
                        <div className="flex-1 mr-4">
                            <div className="font-medium text-sm text-zinc-200">{task.title}</div>
                            {task.description && (
                                <div className="text-xs text-zinc-500 line-clamp-1">{task.description}</div>
                            )}
                        </div>
                        <Button 
                            size="sm" 
                            variant={createdTasks.has(idx) ? "ghost" : "secondary"}
                            className={`h-8 px-3 ${createdTasks.has(idx) ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white border-0'}`}
                            onClick={() => !createdTasks.has(idx) && handleCreateTask(task, idx)}
                            disabled={loading !== null || createdTasks.has(idx)}
                        >
                            {createdTasks.has(idx) ? (
                                <><Check className="w-4 h-4 mr-1" /> Added</>
                            ) : (
                                loading === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Add</>
                            )}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}