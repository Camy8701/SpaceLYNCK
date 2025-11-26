import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Users, Plus, X, Crown, Check } from "lucide-react";
import { toast } from "sonner";

export default function ProjectTeamManager({ project, open, onOpenChange }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  const teamMemberIds = project?.team_members || [];

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const teamMembers = allUsers.filter(u => teamMemberIds.includes(u.id));
  const availableUsers = allUsers.filter(u => !teamMemberIds.includes(u.id));

  const updateTeamMutation = useMutation({
    mutationFn: async (newTeamMembers) => {
      await base44.entities.Project.update(project.id, { team_members: newTeamMembers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project', project.id]);
      queryClient.invalidateQueries(['projects']);
      toast.success('Team updated');
    }
  });

  const addMember = async (userId) => {
    const newTeam = [...teamMemberIds, userId];
    await updateTeamMutation.mutateAsync(newTeam);
    
    // Notify new member
    const currentUser = await base44.auth.me();
    if (userId !== currentUser.id) {
      await base44.entities.Notification.create({
        user_id: userId,
        type: 'project_update',
        title: 'Added to project',
        message: `${currentUser.full_name} added you to project "${project.name}"`,
        action_url: `/ProjectDetails?id=${project.id}`,
        project_id: project.id,
        actor_name: currentUser.full_name
      });
    }
    setSearchOpen(false);
  };

  const removeMember = async (userId) => {
    const newTeam = teamMemberIds.filter(id => id !== userId);
    await updateTeamMutation.mutateAsync(newTeam);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Project Team
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Team Members */}
          <div className="space-y-2">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No team members yet. Add someone to collaborate!
              </p>
            ) : (
              teamMembers.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{member.full_name}</div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                  </div>
                  {member.id === project?.owner_id ? (
                    <Badge variant="outline" className="gap-1">
                      <Crown className="w-3 h-3" /> Owner
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Member */}
          {searchOpen ? (
            <Command className="border rounded-lg">
              <CommandInput placeholder="Search team members..." />
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-y-auto">
                {availableUsers.map(user => (
                  <CommandItem
                    key={user.id}
                    value={user.full_name}
                    onSelect={() => addMember(user.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-slate-100">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{user.full_name}</span>
                    <span className="text-xs text-slate-400">{user.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-dashed"
              onClick={() => setSearchOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}