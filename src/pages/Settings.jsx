import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Volume2, Moon } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  // Initial User Fetch
  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  // Fetch Settings
  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      if(!user) return null;
      const res = await base44.entities.UserSettings.filter({ user_id: user.id }, '', 1);
      return res[0] || {
        notifications_enabled: true,
        sound_enabled: true,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        enabled_types: ["task_assigned", "task_due", "chat", "ai"]
      };
    },
    enabled: !!user
  });

  // Save Settings
  const saveMutation = useMutation({
    mutationFn: async (newSettings) => {
        if (!settings?.id) {
            // Create
            await base44.entities.UserSettings.create({ ...newSettings, user_id: user.id });
        } else {
            // Update
            await base44.entities.UserSettings.update(settings.id, newSettings);
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['userSettings']);
        toast.success("Settings saved");
    }
  });

  const handleToggle = (key) => {
      if (!settings) return;
      saveMutation.mutate({ ...settings, [key]: !settings[key] });
  };

  const handleChange = (key, value) => {
      if (!settings) return;
      saveMutation.mutate({ ...settings, [key]: value });
  };

  const handlePermission = async () => {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') toast.success("Browser notifications enabled");
      else toast.error("Permission denied");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Google Calendar (Existing) */}
        <Card>
          <CardHeader>
             <CardTitle>Integrations</CardTitle>
             <CardDescription>Manage external connections</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-sm">
                         <span className="text-lg">📅</span>
                     </div>
                     <div>
                         <div className="font-medium">Google Calendar</div>
                         <div className="text-xs text-slate-500">Sync tasks and deadlines</div>
                     </div>
                 </div>
                 <Button variant="outline" onClick={() => base44.requestOAuthAuthorization({
                    integration_type: "googlecalendar",
                    reason: "To sync tasks with your calendar",
                    scopes: ["https://www.googleapis.com/auth/calendar.events"]
                 })}>
                    Reconnect
                 </Button>
             </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" /> Notification Preferences
            </CardTitle>
            <CardDescription>Manage how and when you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                     <Label className="text-base">Enable Notifications</Label>
                     <p className="text-sm text-slate-500">Receive alerts for tasks and messages</p>
                 </div>
                 <Switch 
                    checked={settings?.notifications_enabled} 
                    onCheckedChange={() => handleToggle('notifications_enabled')} 
                 />
             </div>
             
             <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                     <Label className="text-base">Browser Push Notifications</Label>
                     <p className="text-sm text-slate-500">Show popups when app is in background</p>
                 </div>
                 <Button variant="outline" size="sm" onClick={handlePermission}>
                     Request Permission
                 </Button>
             </div>

             <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                     <Label className="text-base flex items-center gap-2">
                         <Volume2 className="w-4 h-4" /> Sound Effects
                     </Label>
                     <p className="text-sm text-slate-500">Play sound for urgent alerts</p>
                 </div>
                 <Switch 
                    checked={settings?.sound_enabled} 
                    onCheckedChange={() => handleToggle('sound_enabled')} 
                 />
             </div>

             <div className="border-t pt-4">
                 <div className="space-y-4">
                     <Label className="text-base flex items-center gap-2">
                         <Moon className="w-4 h-4" /> Quiet Hours
                     </Label>
                     <div className="flex gap-4 items-center">
                         <div className="grid gap-1.5">
                             <Label htmlFor="start">Start Time</Label>
                             <Input 
                                id="start" 
                                type="time" 
                                value={settings?.quiet_hours_start} 
                                onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                             />
                         </div>
                         <span className="mt-6">-</span>
                         <div className="grid gap-1.5">
                             <Label htmlFor="end">End Time</Label>
                             <Input 
                                id="end" 
                                type="time" 
                                value={settings?.quiet_hours_end} 
                                onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                             />
                         </div>
                     </div>
                     <p className="text-xs text-slate-500">Notifications will be silenced during these hours.</p>
                 </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}