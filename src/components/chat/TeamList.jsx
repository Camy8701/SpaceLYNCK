import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, User, Check } from "lucide-react";
import ChatModal from './ChatModal';

export default function TeamList({ projectId }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch Current User
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const u = await base44.auth.me();
      setCurrentUser(u);
      return u;
    }
  });

  // Fetch Team Members
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return await base44.entities.User.list();
    }
  });

  // Fetch Unread Messages Count
  const { data: unreadMessages } = useQuery({
    queryKey: ['unread', currentUser?.id],
    queryFn: async () => {
        if (!currentUser) return [];
        return await base44.entities.ChatMessage.filter({ recipient_id: currentUser.id, read: false });
    },
    refetchInterval: 3000
  });

  const getUnreadCount = (senderId) => unreadMessages?.filter(m => m.sender_id === senderId).length || 0;

  if (isLoading) return <div className="p-4 text-sm text-slate-400">Loading team...</div>;

  const teamMembers = users?.filter(u => u.id !== currentUser?.id) || [];

  return (
    <div className="bg-white border rounded-lg">
      <div className="p-4 border-b bg-slate-50/50">
        <h3 className="font-semibold text-slate-900">Team Members</h3>
      </div>
      <div className="divide-y">
        {teamMembers.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
             You're the only one here! 
             <br/>Create another account in a new tab to test chat.
          </div>
        ) : (
          teamMembers.map(member => {
            const unreadCount = getUnreadCount(member.id);
            return (
              <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600">
                        {member.full_name?.[0] || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online Status Dot */}
                     <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        member.last_active && (new Date() - new Date(member.last_active) < 5 * 60 * 1000) 
                          ? 'bg-green-500' 
                          : 'bg-slate-300'
                     }`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900">{member.full_name}</div>
                    <div className="text-xs text-slate-500">
                       {member.last_active && (new Date() - new Date(member.last_active) < 5 * 60 * 1000) ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant={unreadCount > 0 ? "default" : "outline"} onClick={() => setSelectedMember(member)} className="gap-2 relative">
                  <MessageCircle className="w-4 h-4" /> Chat
                  {unreadCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </div>
            );
          })
        )}
      </div>

      <ChatModal 
        open={!!selectedMember} 
        onOpenChange={(open) => !open && setSelectedMember(null)}
        currentUser={currentUser}
        recipient={selectedMember}
        projectId={projectId}
      />
    </div>
  );
}