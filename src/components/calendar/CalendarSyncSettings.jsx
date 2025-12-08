import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, RefreshCw, Loader2, Calendar, ArrowLeftRight, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CalendarSyncSettings({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    enabled: true,
    sync_frequency: 'manual',
    sync_direction: 'bidirectional',
    conflict_resolution: 'newest_wins',
    selected_calendars: ['primary']
  });
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Fetch Google calendars
  const { data: googleCalendars = [], refetch: refetchCalendars } = useQuery({
    queryKey: ['googleCalendars'],
    queryFn: async () => {
      const response = await base44.functions.invoke('syncGoogleCalendar', { action: 'listCalendars' });
      return response.data.calendars || [];
    },
    enabled: open
  });

  // Fetch existing settings
  const { data: existingSettings } = useQuery({
    queryKey: ['calendarSyncSettings'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.entities.CalendarSyncSettings.filter({ created_by: user.email });
      return res[0] || null;
    },
    enabled: open
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        enabled: existingSettings.enabled ?? true,
        sync_frequency: existingSettings.sync_frequency || 'manual',
        sync_direction: existingSettings.sync_direction || 'bidirectional',
        conflict_resolution: existingSettings.conflict_resolution || 'newest_wins',
        selected_calendars: existingSettings.selected_calendars || ['primary']
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      if (existingSettings) {
        return await base44.entities.CalendarSyncSettings.update(existingSettings.id, {
          ...settings,
          user_id: user.id
        });
      } else {
        return await base44.entities.CalendarSyncSettings.create({
          ...settings,
          user_id: user.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarSyncSettings']);
      toast.success('Sync settings saved!');
      onOpenChange(false);
    }
  });

  const toggleCalendar = (calendarId) => {
    const selected = settings.selected_calendars || [];
    if (selected.includes(calendarId)) {
      setSettings({ ...settings, selected_calendars: selected.filter(id => id !== calendarId) });
    } else {
      setSettings({ ...settings, selected_calendars: [...selected, calendarId] });
    }
  };

  const directionIcons = {
    import: <ArrowLeft className="w-4 h-4" />,
    export: <ArrowRight className="w-4 h-4" />,
    bidirectional: <ArrowLeftRight className="w-4 h-4" />
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" /> Google Calendar Sync Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Sync */}
          <div className="flex items-center justify-between">
            <Label className="text-slate-700">Enable Sync</Label>
            <Switch 
              checked={settings.enabled} 
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          {/* Sync Direction */}
          <div className="space-y-2">
            <Label className="text-slate-700">Sync Direction</Label>
            <Select 
              value={settings.sync_direction} 
              onValueChange={(value) => setSettings({ ...settings, sync_direction: value })}
            >
              <SelectTrigger className="bg-white/50 border-white/40 text-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40">
                <SelectItem value="bidirectional" className="focus:bg-slate-100">
                  <span className="flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" /> Bidirectional</span>
                </SelectItem>
                <SelectItem value="import" className="focus:bg-slate-100">
                  <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Import Only (Google → Lynck)</span>
                </SelectItem>
                <SelectItem value="export" className="focus:bg-slate-100">
                  <span className="flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Export Only (Lynck → Google)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sync Frequency */}
          <div className="space-y-2">
            <Label className="text-slate-700">Sync Frequency</Label>
            <Select 
              value={settings.sync_frequency} 
              onValueChange={(value) => setSettings({ ...settings, sync_frequency: value })}
            >
              <SelectTrigger className="bg-white/50 border-white/40 text-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40">
                <SelectItem value="manual" className="focus:bg-slate-100">Manual Only</SelectItem>
                <SelectItem value="hourly" className="focus:bg-slate-100">Every Hour</SelectItem>
                <SelectItem value="daily" className="focus:bg-slate-100">Once Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Resolution */}
          <div className="space-y-2">
            <Label className="text-slate-700">Conflict Resolution</Label>
            <Select 
              value={settings.conflict_resolution} 
              onValueChange={(value) => setSettings({ ...settings, conflict_resolution: value })}
            >
              <SelectTrigger className="bg-white/50 border-white/40 text-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40">
                <SelectItem value="newest_wins" className="focus:bg-slate-100">Newest Wins</SelectItem>
                <SelectItem value="google_wins" className="focus:bg-slate-100">Google Always Wins</SelectItem>
                <SelectItem value="lynck_wins" className="focus:bg-slate-100">Lynck Space Always Wins</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-slate-500 text-xs">When the same event differs between calendars</p>
          </div>

          {/* Calendar Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700">Select Calendars to Sync</Label>
              {loadingCalendars && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
            </div>
            
            {googleCalendars.length === 0 ? (
              <p className="text-slate-500 text-sm">Loading calendars...</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {googleCalendars.map((cal) => (
                  <div 
                    key={cal.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50"
                  >
                    <Checkbox
                      checked={(settings.selected_calendars || []).includes(cal.id)}
                      onCheckedChange={() => toggleCalendar(cal.id)}
                      className="border-slate-300"
                    />
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cal.backgroundColor || '#3b82f6' }}
                    />
                    <span className="text-sm text-slate-700">
                      {cal.summary} {cal.primary && <span className="text-slate-400">(Primary)</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last Sync Info */}
          {existingSettings?.last_sync_at && (
            <p className="text-slate-400 text-xs">
              Last synced: {new Date(existingSettings.last_sync_at).toLocaleString()}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-700 hover:bg-white/50">
            Cancel
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}