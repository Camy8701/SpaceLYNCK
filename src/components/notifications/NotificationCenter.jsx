import React, { useState, useEffect } from 'react';
import { Bell, Check, Settings, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
     base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
        if(!user) return [];
        return await base44.entities.Notification.filter({ user_id: user.id }, '-created_at', 20);
    },
    enabled: !!user,
    refetchInterval: 30000 // Poll every 30s
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: async (ids) => {
      await base44.functions.invoke('notifications', { action: 'mark_read', notificationIds: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      markReadMutation.mutate([n.id]);
    }
    if (n.action_url) {
      navigate(n.action_url);
      setIsOpen(false);
    }
  };

  const markAllRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds);
      toast.success("All marked as read");
    }
  };

  // Heartbeat for creating notifications (e.g. due tasks)
  useEffect(() => {
      if(!user) return;
      const check = async () => {
          await base44.functions.invoke('notifications', { action: 'check_notifications' });
          queryClient.invalidateQueries(['notifications']);
      };
      check();
      const interval = setInterval(check, 60000 * 5); // Every 5 mins
      return () => clearInterval(interval);
  }, [user, queryClient]);

  // Browser Notifications Logic
  useEffect(() => {
    if (unreadCount > 0 && "Notification" in window && Notification.permission === "granted") {
        // Find latest unread
        const latest = notifications.find(n => !n.read);
        if (latest) {
            // Simple check to avoid spamming: store last notified ID in local storage
            const lastId = localStorage.getItem('last_notified_id');
            if (lastId !== latest.id) {
                new Notification(latest.title, { body: latest.message, icon: '/favicon.ico' });
                localStorage.setItem('last_notified_id', latest.id);
                // Sound?
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep
                audio.volume = 0.2;
                audio.play().catch(() => {}); 
            }
        }
    }
  }, [unreadCount, notifications]);

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={markAllRead} className="h-6 text-xs text-indigo-600">
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No notifications
            </div>
          ) : (
            notifications.map(n => (
              <DropdownMenuItem 
                key={n.id} 
                className={`flex flex-col items-start p-3 cursor-pointer focus:bg-slate-50 ${!n.read ? 'bg-indigo-50/50' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex w-full justify-between items-start">
                  <span className={`font-medium text-sm ${!n.read ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true }).replace('about ', '')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {n.message}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/Settings')} className="cursor-pointer text-xs text-slate-500 justify-center">
          <Settings className="w-3 h-3 mr-2" /> Notification Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}