import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { project_id } = await req.json();
        if (!project_id) return Response.json({ error: 'Project ID required' }, { status: 400 });

        // Fetch all relevant data
        const tasks = await base44.entities.Task.filter({ project_id });
        const clients = await base44.entities.Client.filter({ project_id });
        // WorkSessions might be many, let's filter by project_id
        const sessions = await base44.entities.WorkSession.filter({ project_id });

        return Response.json({
            tasks,
            clients,
            sessions
        });

    } catch (error) {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});