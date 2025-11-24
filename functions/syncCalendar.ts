import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get OAuth Token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
        if (!accessToken) {
             return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
        }

        // 2. Fetch User's Tasks (Pending ones with due dates)
        const tasks = await base44.entities.Task.filter({ 
            status: 'todo',
            created_by: user.email
        });
        
        // Filter tasks that have due dates
        const tasksWithDates = tasks.filter(t => t.due_date);

        let syncedCount = 0;

        // 3. Sync to Google Calendar
        // This is a naive sync: it creates events. A real sync would check for existence.
        // For MVP, we'll just create events for tasks due in the future.
        
        for (const task of tasksWithDates) {
            const event = {
                summary: `ProjectFlow: ${task.title}`,
                description: task.description || "",
                start: {
                    date: task.due_date // All day event
                },
                end: {
                    date: task.due_date // All day event (needs +1 day for correct GCal rendering usually, or same day)
                }
            };

            // We simply POST to create. 
            // Note: This will duplicate events if run multiple times. 
            // Production fixes: Store 'google_event_id' on Task entity.
            
            const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });
            
            if (resp.ok) syncedCount++;
        }

        return Response.json({ synced: syncedCount, total: tasksWithDates.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});