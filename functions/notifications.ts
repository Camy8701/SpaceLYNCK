import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addHours, isTomorrow, parseISO, differenceInMinutes } from "npm:date-fns@3.3.1";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const { action, notificationIds } = body;

        // Action: Mark Read
        if (action === 'mark_read') {
            for (const id of notificationIds) {
                await base44.entities.Notification.update(id, { read: true });
            }
            return Response.json({ success: true });
        }

        // Action: Check & Generate (Heartbeat)
        if (action === 'check_notifications') {
            // 1. Check Due Tasks (1 Hour)
            const now = new Date();
            // Fetch active tasks assigned to user with due date
            // Note: Filter limitations might require client-side filtering or broader fetch
            // We'll fetch tasks due today/tomorrow for this user
            const tasks = await base44.entities.Task.filter({ 
                assigned_to: user.id, 
                status: 'todo' 
            });

            let createdCount = 0;

            for (const task of tasks) {
                if (!task.due_date) continue;
                
                const due = parseISO(task.due_date);
                // Assuming due_date is just YYYY-MM-DD, we treat it as 5 PM that day or just check date
                // If due_date has time, we use it. If just date, let's assume 17:00 local (hard to know local) or just skip hourly check if no time.
                // Actually, standard is date-only in this app so far. 
                // Let's implement "Due Tomorrow at 5pm" alert logic -> Trigger if it's today 5pm and due tomorrow.
                
                // For "Due in 1 hour", we really need datetime. 
                // If task.due_date is YYYY-MM-DD, we can only do "Due Today" or "Due Tomorrow".
                // Let's assume if we want granular, we need granular dates. 
                // For now, we'll just implement "Due Tomorrow" check.
                
                // Check if we already notified for this task type
                
                // Logic for "Due Tomorrow" (Run once a day, say at 17:00? 
                // Since this is polled, we check if it's currently ~17:00 and task is tomorrow)
                // Easier: Just check if task is due tomorrow and we haven't created a 'task_due_tomorrow' notification for it yet.
                
                if (isTomorrow(due)) {
                    // Check existing notification
                    const existing = await base44.entities.Notification.filter({
                        user_id: user.id,
                        type: 'task_due_tomorrow',
                        related_entity_id: task.id
                    });
                    
                    if (existing.length === 0) {
                        await base44.entities.Notification.create({
                            user_id: user.id,
                            type: 'task_due_tomorrow',
                            title: 'Task Due Tomorrow',
                            message: `Task "${task.title}" is due tomorrow.`,
                            action_url: `/ProjectDetails?id=${task.project_id}`,
                            related_entity_id: task.id
                        });
                        createdCount++;
                    }
                }
            }
            return Response.json({ created: createdCount });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});