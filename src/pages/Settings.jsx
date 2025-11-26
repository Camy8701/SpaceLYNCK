import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Volume2, Moon, Sun, Calendar, User, Shield, Download, AlertTriangle, Palette, Mail, Globe, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const accentColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Green', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
];

const timezones = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
];

export default function Settings({ sidebarCollapsed }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setProfileName(u.full_name || "");
    }).catch(console.error);
  }, []);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const res = await base44.entities.UserSettings.filter({ user_id: user.id }, '', 1);
      return res[0] || {
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        theme_preference: "dark",
        accent_color: "#3b82f6",
        default_task_view: "kanban",
        auto_sync_calendar: true,
        timezone: "UTC",
        bio: ""
      };
    },
    enabled: !!user
  });

  useEffect(() => {
    if (settings?.bio) setBio(settings.bio);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings) => {
      if (!settings?.id) {
        await base44.entities.UserSettings.create({ ...newSettings, user_id: user.id });
      } else {
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
      if (settings) {
        saveMutation.mutate({ ...settings, bio });
      }
      toast.success("Profile updated successfully");
    } catch (e) {
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('avatar_url', file_url);
      toast.success("Avatar updated!");
    } catch (err) {
      toast.error("Failed to upload avatar");
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white/70 animate-pulse">Loading settings...</div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/40">
            <SettingsIcon className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              Settings
            </h1>
            <p className="text-white/70 text-sm">Manage your profile and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6 bg-white/20 backdrop-blur-md border border-white/30 p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-white/40">Profile</TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-white/40">Appearance</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-white/40">Notifications</TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-white/40">Integrations</TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-white/40">Data</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white/50 backdrop-blur-md border-white/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <User className="w-5 h-5" /> Profile Information
                </CardTitle>
                <CardDescription>Update your personal details and avatar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20 border-2 border-white/40">
                    <AvatarImage src={settings?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Button asChild variant="outline" size="sm" className="bg-white/50">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        Change Avatar
                      </label>
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={user?.email || ''} disabled className="bg-white/30" />
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)} 
                      placeholder="Your Name"
                      className="bg-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      placeholder="Tell us about yourself..."
                      className="bg-white/50 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select 
                      value={settings?.timezone || 'UTC'} 
                      onValueChange={(v) => handleChange('timezone', v)}
                    >
                      <SelectTrigger className="bg-white/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-white/20 pt-4">
                <Button onClick={handleUpdateProfile} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Save Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="bg-white/50 backdrop-blur-md border-white/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Palette className="w-5 h-5" /> Theme & Appearance
                </CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Toggle */}
                <div className="space-y-3">
                  <Label>Theme Mode</Label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleChange('theme_preference', 'light')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        settings?.theme_preference === 'light' 
                          ? 'border-blue-500 bg-white' 
                          : 'border-white/30 bg-white/30 hover:bg-white/50'
                      }`}
                    >
                      <Sun className="w-5 h-5" />
                      <span>Light</span>
                      {settings?.theme_preference === 'light' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </button>
                    <button
                      onClick={() => handleChange('theme_preference', 'dark')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        settings?.theme_preference === 'dark' 
                          ? 'border-blue-500 bg-slate-800 text-white' 
                          : 'border-white/30 bg-slate-700/50 text-white hover:bg-slate-700'
                      }`}
                    >
                      <Moon className="w-5 h-5" />
                      <span>Dark</span>
                      {settings?.theme_preference === 'dark' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </button>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {accentColors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => handleChange('accent_color', color.value)}
                        className={`w-10 h-10 rounded-full transition-all ${
                          settings?.accent_color === color.value ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Default Task View */}
                <div className="space-y-2">
                  <Label>Default Task View</Label>
                  <Select 
                    value={settings?.default_task_view || 'kanban'} 
                    onValueChange={(v) => handleChange('default_task_view', v)}
                  >
                    <SelectTrigger className="bg-white/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kanban">Kanban Board</SelectItem>
                      <SelectItem value="list">List View</SelectItem>
                      <SelectItem value="calendar">Calendar View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-white/50 backdrop-blur-md border-white/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
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
                    <Label className="text-base flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email Notifications
                    </Label>
                    <p className="text-sm text-slate-500">Receive important updates via email</p>
                  </div>
                  <Switch 
                    checked={settings?.email_notifications} 
                    onCheckedChange={() => handleToggle('email_notifications')} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Browser Push Notifications</Label>
                    <p className="text-sm text-slate-500">Show popups when app is in background</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePermission} className="bg-white/50">
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

                <div className="border-t border-white/20 pt-4">
                  <Label className="text-base flex items-center gap-2 mb-3">
                    <Moon className="w-4 h-4" /> Quiet Hours
                  </Label>
                  <div className="flex gap-4 items-center">
                    <div className="grid gap-1.5">
                      <Label htmlFor="start" className="text-sm">Start Time</Label>
                      <Input 
                        id="start" 
                        type="time" 
                        value={settings?.quiet_hours_start || "22:00"} 
                        onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                        className="bg-white/50"
                      />
                    </div>
                    <span className="mt-6 text-slate-500">to</span>
                    <div className="grid gap-1.5">
                      <Label htmlFor="end" className="text-sm">End Time</Label>
                      <Input 
                        id="end" 
                        type="time" 
                        value={settings?.quiet_hours_end || "07:00"} 
                        onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                        className="bg-white/50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Notifications will be silenced during these hours.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="bg-white/50 backdrop-blur-md border-white/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Globe className="w-5 h-5" /> Connected Services
                </CardTitle>
                <CardDescription>Manage external integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Calendar */}
                <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl border border-white/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">Google Calendar</div>
                      <div className="text-xs text-slate-500">Sync tasks and deadlines with your calendar</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Connected</span>
                    <Button variant="outline" size="sm" className="bg-white/50">
                      Reconnect
                    </Button>
                  </div>
                </div>

                {/* Auto Sync Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl border border-white/30">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-sync Calendar</Label>
                    <p className="text-sm text-slate-500">Automatically sync tasks with due dates</p>
                  </div>
                  <Switch 
                    checked={settings?.auto_sync_calendar} 
                    onCheckedChange={() => handleToggle('auto_sync_calendar')} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card className="bg-white/50 backdrop-blur-md border-white/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Download className="w-5 h-5" /> Export Data
                </CardTitle>
                <CardDescription>Download a copy of all your tasks and projects</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => toast.info("Export started. Check your email shortly.")} className="bg-white/50">
                  Export All Data (CSV)
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-red-50/80 backdrop-blur-md border-red-200/50">
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
                  if (confirm("Are you absolutely sure? This cannot be undone.")) {
                    toast.error("Account deletion is restricted for this demo.");
                  }
                }}>
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}