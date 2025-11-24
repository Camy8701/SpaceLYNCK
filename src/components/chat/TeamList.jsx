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
  // For MVP, we just list all users in the system since we don't have a complex invitation system yet.
  // Or simpler: show just the current user and maybe a 'demo' user if we could create one.
  // Per Prompt 8: "Shows list of team members (just creator for now)"
  // So we will just fetch the project creator or the current user. 
  // To test chat, the user prompt says "Test with 2 browser tabs (2 users)".
  // So we should list ALL users so User A can chat with User B.
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return await base44.entities.User.list();
    }
  });

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
          teamMembers.map(member => (
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
              <Button size="sm" variant="outline" onClick={() => setSelectedMember(member)} className="gap-2">
                <MessageCircle className="w-4 h-4" /> Chat
              </Button>
            </div>
          ))
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