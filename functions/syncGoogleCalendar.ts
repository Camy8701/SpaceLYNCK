import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    // Fetch events from Google Calendar
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to fetch Google Calendar events', details: error }, { status: 500 });
    }

    const data = await response.json();
    const googleEvents = data.items || [];

    // Get existing synced events
    const existingEvents = await base44.asServiceRole.entities.CalendarEvent.filter({ 
      created_by: user.email 
    });

    const syncedEventIds = existingEvents
      .filter(e => e.google_event_id)
      .map(e => e.google_event_id);

    // Import new events
    let imported = 0;
    for (const gEvent of googleEvents) {
      if (syncedEventIds.includes(gEvent.id)) continue;
      if (!gEvent.start?.dateTime && !gEvent.start?.date) continue;

      const startDateTime = gEvent.start.dateTime || `${gEvent.start.date}T00:00:00`;
      const endDateTime = gEvent.end?.dateTime || gEvent.end?.date ? `${gEvent.end.date}T23:59:59` : startDateTime;

      await base44.asServiceRole.entities.CalendarEvent.create({
        title: gEvent.summary || 'Untitled Event',
        description: gEvent.description || '',
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        category: 'work',
        google_event_id: gEvent.id,
        created_by: user.email
      });
      imported++;
    }

    return Response.json({ 
      success: true, 
      imported,
      total_google_events: googleEvents.length,
      message: `Synced ${imported} new events from Google Calendar`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});