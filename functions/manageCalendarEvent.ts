import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, task, google_event_id } = await req.json();

    // Get Access Token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    let result = null;

    if (action === 'create') {
      if (!task.due_date) return Response.json({ skipped: true });

      const eventBody = {
        summary: task.title,
        description: task.description || '',
        start: { date: task.due_date }, // All-day event
        end: { date: task.due_date }    // For all-day events, end date is exclusive in Google Calendar, usually requires next day. 
        // But for simplicity let's try same date or handle date math. 
        // Google Calendar API requires 'end.date' to be the day after for a 1-day event.
      };

      // Fix date math for end date (next day)
      const startDate = new Date(task.due_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      eventBody.end.date = endDate.toISOString().split('T')[0];

      const res = await fetch(CALENDAR_API, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventBody)
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error('Google API Error: ' + err);
      }
      
      const data = await res.json();
      
      // Update task with google_event_id
      await base44.entities.Task.update(task.id, { google_event_id: data.id });
      result = { created: true, eventId: data.id };
    } 
    
    else if (action === 'update') {
      const eventId = task.google_event_id || google_event_id;
      if (!eventId) return Response.json({ error: 'No event ID' });

      if (!task.due_date) {
        // If due date removed, maybe delete event? Or keep it? 
        // Let's delete it if no due date.
        await fetch(`${CALENDAR_API}/${eventId}`, { method: 'DELETE', headers });
        await base44.entities.Task.update(task.id, { google_event_id: null });
        return Response.json({ deleted: true });
      }

      const eventBody = {
        summary: task.title,
        description: task.description || '',
        start: { date: task.due_date },
        end: { date: task.due_date } 
      };
      
      const startDate = new Date(task.due_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      eventBody.end.date = endDate.toISOString().split('T')[0];

      const res = await fetch(`${CALENDAR_API}/${eventId}`, {
        method: 'PUT', // or PATCH
        headers,
        body: JSON.stringify(eventBody)
      });

       if (!res.ok) {
         // If 404, maybe event was deleted in calendar. Clear ID.
         if (res.status === 404) {
            await base44.entities.Task.update(task.id, { google_event_id: null });
            return Response.json({ warning: 'Event not found in calendar' });
         }
      }
      
      result = { updated: true };
    } 
    
    else if (action === 'delete') {
      const eventId = google_event_id || task?.google_event_id;
      if (eventId) {
        await fetch(`${CALENDAR_API}/${eventId}`, { method: 'DELETE', headers });
      }
      result = { deleted: true };
    }

    return Response.json(result || { success: true });

  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});