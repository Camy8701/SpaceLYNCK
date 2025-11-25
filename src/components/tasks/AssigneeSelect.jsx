import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, Users, X } from "lucide-react";

export default function AssigneeSelect({ projectId, value = [], onChange, single = false }) {
  const [open, setOpen] = React.useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: async () => {
      // Get all users and project team members
      const allUsers = await base44.entities.User.list();
      if (!projectId) return allUsers;
      
      const projects = await base44.entities.Project.filter({ id: projectId }, '', 1);
      const project = projects[0];
      if (!project?.team_members?.length) return allUsers;
      
      // Return team members first, then others
      const teamMembers = allUsers.filter(u => project.team_members.includes(u.id));
      const others = allUsers.filter(u => !project.team_members.includes(u.id));
      return [...teamMembers, ...others];
    }
  });

  const selectedUsers = users.filter(u => 
    single ? u.id === value : value?.includes(u.id)
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSelect = (userId) => {
    if (single) {
      onChange(userId);
      setOpen(false);
    } else {
      const newValue = value?.includes(userId)
        ? value.filter(id => id !== userId)
        : [...(value || []), userId];
      onChange(newValue);
    }
  };

  const handleRemove = (userId, e) => {
    e.stopPropagation();
    if (single) {
      onChange(null);
    } else {
      onChange(value.filter(id => id !== userId));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-auto min-h-[36px] justify-start px-2 py-1">
          {selectedUsers.length === 0 ? (
            <span className="text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {single ? 'Assign to...' : 'Add assignees...'}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedUsers.map(user => (
                <Badge key={user.id} variant="secondary" className="gap-1 pr-1">
                  <Avatar className="w-4 h-4">
                    <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{user.full_name?.split(' ')[0]}</span>
                  <button
                    onClick={(e) => handleRemove(user.id, e)}
                    className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team members..." />
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-y-auto">
            {users.map(user => {
              const isSelected = single 
                ? value === user.id 
                : value?.includes(user.id);
              return (
                <CommandItem
                  key={user.id}
                  value={user.full_name}
                  onSelect={() => handleSelect(user.id)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1">{user.full_name}</span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}