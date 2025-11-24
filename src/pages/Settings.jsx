import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Volume2, Moon, Calendar, User, Shield, Download, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState("");

  // Initial User Fetch
  useEffect(() => {
    base44.auth.me().then((u) => {
        setUser(u);
        setProfileName(u.full_name || "");
    }).catch(console.error);
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

  const handleUpdateProfile = async () => {
     try {
        await base44.auth.updateMe({ full_name: profileName });
        toast.success("Profile updated successfully");
     } catch(e) {
        toast.error("Failed to update profile");
     }
  };

  if (!user) return <div className="p-8 animate-pulse">Loading settings...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Account & Settings</h1>
            <p className="text-slate-500 mt-1">Manage your profile, preferences and integrations.</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3 lg:w-[400px]">
           <TabsTrigger value="general">General</TabsTrigger>
           <TabsTrigger value="profile">Profile</TabsTrigger>
           <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
            {/* Google Calendar */}
            <Card>
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" /> Integrations
                 </CardTitle>
                 <CardDescription>Manage external connections</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-sm text-xl">📅</div>
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
                                    value={settings?.quiet_hours_start || "22:00"} 
                                    onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                                 />
                             </div>
                             <span className="mt-6">-</span>
                             <div className="grid gap-1.5">
                                 <Label htmlFor="end">End Time</Label>
                                 <Input 
                                    id="end" 
                                    type="time" 
                                    value={settings?.quiet_hours_end || "07:00"} 
                                    onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                                 />
                             </div>
                         </div>
                         <p className="text-xs text-slate-500">Notifications will be silenced during these hours.</p>
                     </div>
                 </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <User className="w-5 h-5 text-slate-500" /> Profile Information
                 </CardTitle>
                 <CardDescription>Update your personal details.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="space-y-2">
                   <Label>Email Address</Label>
                   <Input value={user?.email || ''} disabled className="bg-slate-50" />
                   <p className="text-xs text-slate-500">Email cannot be changed.</p>
                 </div>
                 <div className="space-y-2">
                   <Label>Full Name</Label>
                   <Input 
                     value={profileName} 
                     onChange={(e) => setProfileName(e.target.value)} 
                     placeholder="Your Name"
                   />
                 </div>
               </CardContent>
               <CardFooter className="border-t pt-4 flex justify-end">
                  <Button onClick={handleUpdateProfile} className="bg-indigo-600 hover:bg-indigo-700">Update Profile</Button>
               </CardFooter>
             </Card>
    
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Shield className="w-5 h-5 text-slate-500" /> Security
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <Button variant="outline" className="w-full sm:w-auto" disabled>
                    Change Password (Managed by Auth Provider)
                 </Button>
               </CardContent>
             </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-slate-500" /> Export Data
                  </CardTitle>
                  <CardDescription>Download a copy of all your tasks and projects.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Button variant="outline" onClick={() => toast.info("Export started. Check your email shortly.")}>
                     Export All Data (CSV)
                   </Button>
                </CardContent>
              </Card>
    
              <Card className="border-red-100 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" /> Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-sm text-red-600 mb-4">
                     Deleting your account is permanent and cannot be undone. All your projects and tasks will be wiped.
                   </p>
                   <Button variant="destructive" onClick={() => {
                       if(confirm("Are you absolutely sure? This cannot be undone.")) {
                          toast.error("Account deletion is restricted for this demo user.");
                       }
                   }}>
                     Delete Account
                   </Button>
                </CardContent>
              </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}