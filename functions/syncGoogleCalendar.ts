import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    // Get user's sync settings
    const settingsArr = await base44.asServiceRole.entities.CalendarSyncSettings.filter({ 
      created_by: user.email 
    });
    const settings = settingsArr[0] || { 
      sync_direction: 'bidirectional', 
      conflict_resolution: 'newest_wins',
      selected_calendars: ['primary']
    };

    // ACTION: List available calendars
    if (action === 'listCalendars') {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!response.ok) {
        return Response.json({ error: 'Failed to fetch calendars' }, { status: 500 });
      }
      
      const data = await response.json();
      const calendars = (data.items || []).map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor
      }));
      
      return Response.json({ calendars });
    }

    // ACTION: Push event to Google
    if (action === 'pushEvent') {
      const { event } = body;
      const calendarId = body.calendarId || 'primary';
      
      const googleEvent = {
        summary: event.title,
        description: event.description || '',
        start: {
          dateTime: event.start_datetime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end_datetime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEvent)
        }
      );

      if (!response.ok) {
        const err = await response.text();
        return Response.json({ error: 'Failed to push event', details: err }, { status: 500 });
      }

      const createdEvent = await response.json();
      
      // Update local event with Google ID
      if (event.id) {
        await base44.asServiceRole.entities.CalendarEvent.update(event.id, {
          google_event_id: createdEvent.id
        });
      }

      return Response.json({ success: true, google_event_id: createdEvent.id });
    }

    // ACTION: Full bidirectional sync
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

    const selectedCalendars = settings.selected_calendars?.length > 0 
      ? settings.selected_calendars 
      : ['primary'];

    let imported = 0;
    let exported = 0;
    let updated = 0;

    // Get existing local events
    const localEvents = await base44.asServiceRole.entities.CalendarEvent.filter({ 
      created_by: user.email 
    });

    // IMPORT: Pull events from Google
    if (settings.sync_direction !== 'export') {
      for (const calendarId of selectedCalendars) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const googleEvents = data.items || [];

        for (const gEvent of googleEvents) {
          if (!gEvent.start?.dateTime && !gEvent.start?.date) continue;

          const existingEvent = localEvents.find(e => e.google_event_id === gEvent.id);
          const startDateTime = gEvent.start.dateTime || `${gEvent.start.date}T00:00:00`;
          const endDateTime = gEvent.end?.dateTime || `${gEvent.end?.date}T23:59:59`;

          if (existingEvent) {
            // Check for conflict resolution
            const googleUpdated = new Date(gEvent.updated);
            const localUpdated = new Date(existingEvent.updated_date);
            
            let shouldUpdate = false;
            if (settings.conflict_resolution === 'google_wins') {
              shouldUpdate = true;
            } else if (settings.conflict_resolution === 'newest_wins') {
              shouldUpdate = googleUpdated > localUpdated;
            }

            if (shouldUpdate) {
              await base44.asServiceRole.entities.CalendarEvent.update(existingEvent.id, {
                title: gEvent.summary || 'Untitled Event',
                description: gEvent.description || '',
                start_datetime: startDateTime,
                end_datetime: endDateTime
              });
              updated++;
            }
          } else {
            await base44.asServiceRole.entities.CalendarEvent.create({
              title: gEvent.summary || 'Untitled Event',
              description: gEvent.description || '',
              start_datetime: startDateTime,
              end_datetime: endDateTime,
              category: 'work',
              google_event_id: gEvent.id,
              google_calendar_id: calendarId,
              created_by: user.email
            });
            imported++;
          }
        }
      }
    }

    // EXPORT: Push local events to Google
    if (settings.sync_direction !== 'import') {
      const unsyncedEvents = localEvents.filter(e => !e.google_event_id);
      const targetCalendar = selectedCalendars[0] || 'primary';

      for (const event of unsyncedEvents) {
        const googleEvent = {
          summary: event.title,
          description: event.description || '',
          start: {
            dateTime: event.start_datetime,
            timeZone: 'UTC'
          },
          end: {
            dateTime: event.end_datetime,
            timeZone: 'UTC'
          }
        };

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(googleEvent)
          }
        );

        if (response.ok) {
          const createdEvent = await response.json();
          await base44.asServiceRole.entities.CalendarEvent.update(event.id, {
            google_event_id: createdEvent.id,
            google_calendar_id: targetCalendar
          });
          exported++;
        }
      }
    }

    // Update last sync time
    if (settingsArr[0]) {
      await base44.asServiceRole.entities.CalendarSyncSettings.update(settingsArr[0].id, {
        last_sync_at: new Date().toISOString()
      });
    }

    return Response.json({ 
      success: true, 
      imported,
      exported,
      updated,
      message: `Sync complete: ${imported} imported, ${exported} exported, ${updated} updated`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});