import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInMinutes } from 'date-fns';

export default function PresenceAvatars({ projectId }) {
  const { data: activeUsers } = useQuery({
    queryKey: ['presence', projectId],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      const now = new Date();
      
      // Filter for users active in last 2 minutes AND either on this project or just generally online if no projectId
      return users.filter(u => {
        if (!u.last_active) return false;
        const lastActive = new Date(u.last_active);
        const isRecent = differenceInMinutes(now, lastActive) < 2;
        
        if (!isRecent) return false;
        
        // If projectId is provided, check if they are viewing this project
        if (projectId) {
            return u.current_project_id === projectId;
        }
        
        return true;
      });
    },
    refetchInterval: 5000 // Refresh presence every 5s
  });

  if (!activeUsers || activeUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-400 mr-2 hidden sm:inline-block">
        {projectId ? 'Viewing this project:' : 'Online:'}
      </span>
      <div className="flex -space-x-2">
        <TooltipProvider>
          {activeUsers.slice(0, 5).map(user => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-white ring-2 ring-green-100 cursor-help transition-transform hover:-translate-y-1">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
                    {user.full_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.full_name} is active</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
        {activeUsers.length > 5 && (
          <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500 z-10">
            +{activeUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}