import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { action, data } = await req.json();

        let prompt = "";
        let context = "";

        if (action === 'chat') {
            prompt = data.message;
            // Add context if needed (e.g. recent projects)
            const projects = await base44.entities.Project.filter({ created_by: user.email }, '-created_date', 5);
            context = `User context: Projects: ${projects.map(p => p.name).join(', ')}.`;
        } 
        else if (action === 'summarize_task') {
            prompt = `Please summarize this task description into a concise summary: ${data.description}`;
        }
        else if (action === 'suggest_priority') {
            prompt = `Given a task with due date ${data.due_date} and dependencies ${JSON.stringify(data.dependencies || [])}, suggest a priority level (Low, Normal, High, Urgent) and explain why.`;
        }
        else if (action === 'draft_report') {
             const tasks = await base44.entities.Task.filter({ project_id: data.project_id }, '-updated_date', 20);
             const project = (await base44.entities.Project.filter({ id: data.project_id }))[0];
             prompt = `Draft a project update report for project "${project?.name}". 
             Recent tasks: ${tasks.map(t => `${t.title} (${t.status})`).join(', ')}.
             Focus on progress, completed items, and upcoming deadlines.`;
        }
        else if (action === 'breakdown_task') {
            prompt = `Break down the following large task into 3-5 smaller, actionable sub-tasks. Return them as a JSON list of strings. Task: ${data.title} - ${data.description}`;
        }

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `${context}\n\n${prompt}`,
            add_context_from_internet: false
        });

        return Response.json({ result: response });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});